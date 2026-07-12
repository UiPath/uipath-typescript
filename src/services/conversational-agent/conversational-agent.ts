/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { track } from '@/core/telemetry';
import { ValidationError } from '@/core/errors';
import { ErrorFactory } from '@/core/errors/error-factory';
import { errorResponseParser } from '@/core/errors/parser';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentOptions,
  ConversationalAgentServiceModel,
  CitationSourceMedia,
  FeatureFlags,
  RawAgentGetResponse,
  RawAgentGetByIdResponse,
  AgentGetResponse,
  AgentGetByIdResponse
} from '@/models/conversational-agent';
import {
  AgentMap,
  createAgentWithMethods
} from '@/models/conversational-agent';

// Utils
import { FEATURE_ENDPOINTS, AGENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { transformData } from '@/utils/transform';

// Local imports
import { ConversationService } from './conversations';
import { buildConversationalAgentHeaders } from './helpers/header';
import { resolveCitationMimeType } from './helpers/citation';
import { UserSettingsService } from './user';

/**
 * Service for interacting with UiPath Conversational Agent API
 */
export class ConversationalAgentService extends BaseService implements ConversationalAgentServiceModel {
  /** Service for creating and managing conversations. See {@link ConversationServiceModel}. */
  public readonly conversations: ConversationService;

  /** Service for reading and updating the current user's profile/context settings. See {@link UserSettingsServiceModel}. */
  public readonly user: UserSettingsService;

  /** Configured SDK origin, used to keep citation downloads on the tenant's host. */
  private readonly baseUrl?: string;

  /**
   * Creates an instance of the ConversationalAgent service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, buildConversationalAgentHeaders(options));

    this.baseUrl = instance.config.baseUrl;
    // Create conversation service with WebSocket support
    this.conversations = new ConversationService(instance, options);
    this.user = new UserSettingsService(instance, options);
  }

  /**
   * Registers a handler that is called whenever the WebSocket connection status changes.
   *
   * @param handler - Callback receiving a {@link ConnectionStatus} (`'Disconnected'` | `'Connecting'` | `'Connected'`) and an optional `Error`
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * const cleanup = conversationalAgent.onConnectionStatusChanged((status, error) => {
   *   console.log('Connection status:', status);
   *   if (error) {
   *     console.error('Connection error:', error.message);
   *   }
   * });
   *
   * // Later, remove the handler
   * cleanup();
   * ```
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this.conversations.onConnectionStatusChanged(handler);
  }


  /**
   * Gets all available conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents
   *
   * @example Basic usage
   * ```typescript
   * const agents = await conversationalAgent.getAll();
   * const agent = agents[0];
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   *
   * @example Filter agents by folder
   * ```typescript
   * const agents = await conversationalAgent.getAll(folderId);
   * ```
   */
  @track('ConversationalAgent.GetAll')
  async getAll(folderId?: number): Promise<AgentGetResponse[]> {
    const response = await this.get<RawAgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data.map((agent) =>
      createAgentWithMethods(transformData(agent, AgentMap) as RawAgentGetResponse, this.conversations)
    );
  }

  /**
   * Gets a specific agent by ID
   *
   * @param id - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent
   *
   * @example Basic usage
   * ```typescript
   * const agent = await conversationalAgent.getById(agentId, folderId);
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   */
  @track('ConversationalAgent.GetById')
  async getById(id: number, folderId: number): Promise<AgentGetByIdResponse> {
    const response = await this.get<RawAgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, id));
    return createAgentWithMethods(
      transformData(response.data, AgentMap) as RawAgentGetByIdResponse,
      this.conversations
    );
  }

  /**
   * Downloads the document behind a media citation as an authenticated `Blob`.
   *
   * HTML content is intentionally returned as `application/octet-stream` (a
   * download) rather than `text/html`, so that previewing the blob inline can't
   * execute citation markup in your app's origin.
   *
   * @param source - A media citation source (`CitationSourceMedia`) with a `downloadUrl`
   * @returns Promise resolving to the document as a `Blob`
   * @throws ValidationError if the source has no `downloadUrl`
   * @throws A typed HTTP error for error responses — e.g. `AuthenticationError`
   *         (401), `AuthorizationError` (403), `NotFoundError` (404) — or
   *         `NetworkError` on a connection failure, matching other SDK calls
   *
   * @example Preview a PDF citation in a new tab
   * ```typescript
   * import { isCitationSourceMedia } from '@uipath/uipath-typescript/conversational-agent';
   *
   * if (isCitationSourceMedia(source)) {
   *   const blob = await conversationalAgent.downloadCitationSource(source);
   *   const url = URL.createObjectURL(blob);
   *   window.open(url, '_blank'); // remember to URL.revokeObjectURL(url) when done
   * }
   * ```
   */
  @track('ConversationalAgent.downloadCitationSource')
  async downloadCitationSource(source: CitationSourceMedia): Promise<Blob> {
    if (!source.downloadUrl) {
      throw new ValidationError({
        message: 'Citation source has no downloadUrl to download'
      });
    }

    // Only attach the token to the tenant's own origin. downloadUrl is
    // server-provided; if one were ever malformed or injected to point at
    // another host, do not send the user's token to that host.
    const base = this.baseUrl ? new URL(this.baseUrl) : undefined;
    let target: URL;
    try {
      target = new URL(source.downloadUrl, base);
    } catch {
      throw new ValidationError({
        message: `Invalid citation downloadUrl`
      });
    }
    if (base && target.origin !== base.origin) {
      throw new ValidationError({
        message: `Refusing to send credentials to a download URL outside the configured origin`
      });
    }

    const token = await this.getValidAuthToken();

    let response: Response;
    try {
      // The downloadUrl targets the reference service, so only the bearer token
      // applies — no conversational agent-specific headers are needed.
      response = await fetch(target.href, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      throw ErrorFactory.createNetworkError(error);
    }

    if (!response.ok) {
      const errorInfo = await errorResponseParser.parse(response);
      throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
    }

    const blob = await response.blob();
    const mimeType = resolveCitationMimeType(source, blob.type);
    return mimeType && mimeType !== blob.type
      ? blob.slice(0, blob.size, mimeType)
      : blob;
  }

  /**
   * Gets feature flags for the current tenant
   *
   * @internal
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }

}
