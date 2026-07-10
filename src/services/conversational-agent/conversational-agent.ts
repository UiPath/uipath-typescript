/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentOptions,
  ConversationalAgentServiceModel,
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
import { UserSettingsService } from './user';

/**
 * Service for interacting with UiPath Conversational Agent API
 */
export class ConversationalAgentService extends BaseService implements ConversationalAgentServiceModel {
  /** Service for creating and managing conversations. See {@link ConversationServiceModel}. */
  public readonly conversations: ConversationService;

  /** Service for reading and updating the current user's profile/context settings. See {@link UserSettingsServiceModel}. */
  public readonly user: UserSettingsService;

  /**
   * Creates an instance of the ConversationalAgent service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, buildConversationalAgentHeaders(options));

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

  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }

}
