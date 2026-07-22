/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { track } from '@/core/telemetry';
import { ServerError } from '@/core/errors';
import { ErrorFactory } from '@/core/errors/error-factory';
import { errorResponseParser } from '@/core/errors/parser';
import { BaseService } from '@/services/base';

// Models
import type {
  AvailableConnectionsResponse,
  ConnectionAuthRequest,
  ConnectionAuthResponse,
  ConversationalAgentOptions,
  ConversationalAgentServiceModel,
  CitationSourceMedia,
  FeatureFlags,
  RawAgentGetResponse,
  RawAgentGetByIdResponse,
  AgentGetResponse,
  AgentGetByIdResponse,
  UpdateConnectionSelectionsRequest
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
  private readonly baseUrl: string;

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

  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this.conversations.onConnectionStatusChanged(handler);
  }


  @track('ConversationalAgent.GetAll')
  async getAll(folderId?: number): Promise<AgentGetResponse[]> {
    const response = await this.get<RawAgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data.map((agent) =>
      createAgentWithMethods(transformData(agent, AgentMap) as RawAgentGetResponse, this.conversations)
    );
  }

  @track('ConversationalAgent.GetById')
  async getById(id: number, folderId: number): Promise<AgentGetByIdResponse> {
    const response = await this.get<RawAgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, id));
    return createAgentWithMethods(
      transformData(response.data, AgentMap) as RawAgentGetByIdResponse,
      this.conversations
    );
  }

  @track('ConversationalAgent.DownloadCitationSource')
  async downloadCitationSource(source: CitationSourceMedia): Promise<Blob> {
    if (!source.downloadUrl) {
      throw new ServerError({
        message: 'Citation source has no downloadUrl to download'
      });
    }

    // Only attach the token to the tenant's own origin. downloadUrl is
    // server-provided; if one were ever malformed or injected to point at
    // another host, do not send the user's token to that host.
    const base = new URL(this.baseUrl);
    let target: URL;
    try {
      target = new URL(source.downloadUrl, base);
    } catch {
      throw new ServerError({
        message: 'Invalid citation downloadUrl'
      });
    }
    // Fail closed: if the target isn't on the configured origin,
    // don't forward the token to an unverifiable host.
    if (target.origin !== base.origin) {
      throw new ServerError({
        message: 'Refusing to send credentials to a download URL outside the configured origin'
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

    let blob: Blob;
    try {
      blob = await response.blob();
    } catch (error) {
      throw ErrorFactory.createNetworkError(error);
    }
    const mimeType = resolveCitationMimeType(source, blob.type);
    return mimeType && mimeType !== blob.type
      ? blob.slice(0, blob.size, mimeType)
      : blob;
  }

  /**
   * Gets available connections for each configurable connector binding of an agent.
   * Only returns bindings that are "configurable by users" (not admin-fixed).
   *
   * @param agentId - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to an array of connector items with their available connections
   *
   * @example
   * ```typescript
   * const connections = await conversationalAgent.getAvailableConnections(agentId, folderId);
   * for (const item of connections) {
   *   console.log(`${item.connectorName}: ${item.connections.length} available`);
   * }
   * ```
   */
  @track('ConversationalAgent.GetAvailableConnections')
  async getAvailableConnections(agentId: number, folderId: number): Promise<AvailableConnectionsResponse> {
    const response = await this.get<AvailableConnectionsResponse>(AGENT_ENDPOINTS.CONNECTIONS(folderId, agentId));
    return response.data;
  }

  /**
   * Updates the current user's connection selections for an agent.
   * Only configurable bindings (not admin-fixed) can be updated.
   *
   * @param agentId - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @param request - The connection selections to apply
   * @returns Promise resolving to the updated available connections
   *
   * @example
   * ```typescript
   * const updated = await conversationalAgent.updateConnectionSelections(agentId, folderId, {
   *   selections: [{ connectorKey: 'jira', connectionId: 'conn-123' }]
   * });
   * ```
   */
  @track('ConversationalAgent.UpdateConnectionSelections')
  async updateConnectionSelections(
    agentId: number,
    folderId: number,
    request: UpdateConnectionSelectionsRequest
  ): Promise<AvailableConnectionsResponse> {
    const response = await this.put<AvailableConnectionsResponse>(
      AGENT_ENDPOINTS.CONNECTIONS(folderId, agentId),
      request
    );
    return response.data;
  }

  /**
   * Returns the best URL for adding a new connection for a given connector.
   *
   * Tries to generate a connector-specific auth URL (works when running inside
   * the UiPath platform). If that fails, falls back to the Orchestrator
   * connections page or the connector configuration page.
   *
   * @param item - The connector item from {@link getAvailableConnections}
   * @returns The URL to open, or `null` if no URL is available
   *
   * @example
   * ```typescript
   * const connections = await conversationalAgent.getAvailableConnections(agentId, folderId);
   * const url = await conversationalAgent.getAddConnectionUrl(connections[0]);
   * if (url) window.open(url, '_blank');
   * ```
   */
  async getAddConnectionUrl(item: { connectorKey: string; connectionsUrl?: string; configurationUrl?: string }): Promise<string | null> {
    try {
      const { authUrl } = await this.getConnectionAuthUrl(item.connectorKey);
      return authUrl;
    } catch {
      return item.connectionsUrl ?? item.configurationUrl ?? null;
    }
  }

  /**
   * Generates a connector-specific auth URL for adding a new connection.
   * Only works when running inside the UiPath platform (Studio Web / portal shell).
   * For a method that handles fallbacks automatically, use {@link getAddConnectionUrl}.
   *
   * @param connectorKey - The connector key (e.g. 'uipath-microsoft-outlook365')
   * @returns Promise resolving to the auth URL and its expiration
   * @internal
   */
  @track('ConversationalAgent.GetConnectionAuthUrl')
  async getConnectionAuthUrl(connectorKey: string): Promise<ConnectionAuthResponse> {
    const response = await this.post<ConnectionAuthResponse>(
      AGENT_ENDPOINTS.CONNECTION_AUTH,
      { connectorKey } as ConnectionAuthRequest
    );
    return response.data;
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
