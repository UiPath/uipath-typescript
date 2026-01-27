/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 *
 * Provides access to:
 * - Agents: List available agent releases
 * - Conversations: Full conversation management including exchanges, messages, attachments
 * - User: User profile and context settings management
 * - Traces: LLM operations tracing and observability
 * - Events: Real-time conversation event handling
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler, LogLevel } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type { ConversationalAgentServiceModel, FeatureFlags } from '@/models/conversational-agent';

// Utils
import { FEATURE_ENDPOINTS } from '@/utils/constants/endpoints';

// Local imports
import { AgentService } from './agents';
import { ConversationService } from './conversations';
import {
  ConversationEventHelperManagerImpl,
  type ConversationEventHelperManager
} from './helpers';
import { SessionManager } from './session';
import { TraceService } from './traces';
import { UserService } from './user';

/**
 * Options for ConversationalAgentService when using modular pattern
 */
export interface ConversationalAgentOptions {
  /** External User ID (optional) */
  externalUserId?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}

/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 *
 * @example
 * ```typescript
 * // Modular pattern (recommended)
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   secret: 'your-secret'
 * });
 * await sdk.initialize();
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // HTTP Operations
 * const availableAgents = await conversationalAgentService.agents.getAll();
 * const newConversation = await conversationalAgentService.conversations.create({
 *   agentReleaseId: availableAgents[0].id,
 *   folderId: availableAgents[0].folderId
 * });
 *
 * // Get exchanges for a conversation
 * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
 *
 * // WebSocket Operations (connection is managed automatically)
 * conversationalAgentService.events.onSession((session) => {
 *   session.onExchangeStart((exchange) => {
 *     console.log('Exchange:', exchange.exchangeId);
 *   });
 * });
 * ```
 */
export class ConversationalAgentService extends BaseService implements ConversationalAgentServiceModel {
  /** Session manager for WebSocket lifecycle */
  private _sessionManager: SessionManager;

  /** Event helper for conversation events */
  private _eventHelper: ConversationEventHelperManagerImpl | null = null;

  /** Service for listing available conversational agents */
  public readonly agents: AgentService;

  /** Service for conversation operations including exchanges, messages, and attachments */
  public readonly conversations: ConversationService;

  /** Service for user profile and context settings management */
  public readonly user: UserService;

  /** Service for LLM operations tracing and observability */
  public readonly traces: TraceService;

  /**
   * Create a ConversationalAgentService instance
   *
   * @param instance - UiPath SDK instance
   * @param options - Optional configuration (externalUserId, logLevel)
   */
  constructor(instance: IUiPathSDK, options?: ConversationalAgentOptions) {
    super(instance);

    // Create HTTP services
    this.agents = new AgentService(instance);
    this.conversations = new ConversationService(instance);
    this.user = new UserService(instance);
    this.traces = new TraceService(instance);

    // Create session manager for WebSocket operations
    this._sessionManager = new SessionManager(instance, options);
  }

  // ==================== Event Handling ====================

  /**
   * Access to conversation event helpers for sending and receiving real-time events
   */
  get events(): ConversationEventHelperManager {
    if (this._eventHelper === null) {
      this._eventHelper = new ConversationEventHelperManagerImpl({
        emit: (event) => {
          this._sessionManager.emitEvent(event);
        }
      });

      // Connect event dispatcher to session manager
      this._sessionManager.setEventDispatcher(this._eventHelper);
    }
    return this._eventHelper;
  }

  // ==================== Connection Management ====================

  /**
   * Connect to WebSocket for real-time events.
   *
   * @deprecated WebSocket connection is now managed automatically. The connection
   * is established when needed (e.g., when starting a session or sending events).
   * This method is kept for backwards compatibility but does nothing.
   */
  connect(): void {
    this._sessionManager.connect();
  }

  /**
   * Disconnect from WebSocket and release all session resources.
   *
   * This will immediately close the WebSocket connection and clear all
   * per-conversation socket tracking. Any active sessions will receive
   * a disconnection error.
   *
   * Note: In most cases, you don't need to call this explicitly. Sessions
   * are automatically cleaned up when they end. Use this only when you
   * need to force a full disconnection (e.g., on app shutdown or logout).
   */
  disconnect(): void {
    this._sessionManager.disconnect();
  }

  /**
   * Current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this._sessionManager.connectionStatus;
  }

  /**
   * Whether WebSocket is connected
   */
  get isConnected(): boolean {
    return this._sessionManager.isConnected;
  }

  /**
   * Current connection error, if any
   */
  get connectionError(): Error | null {
    return this._sessionManager.connectionError;
  }

  /**
   * Register handler for connection status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._sessionManager.onConnectionStatusChanged(handler);
  }

  /**
   * Set log level for debugging
   */
  setLogLevel(level: LogLevel): void {
    this._sessionManager.setLogLevel(level);
  }

  // ==================== Utility Operations ====================

  /**
   * Gets feature flags for the current tenant
   *
   * Returns tenant-specific feature flags that control various capabilities
   * such as audio streaming, file attachments, and other features.
   *
   * @returns Feature flags object
   *
   * @example
   * ```typescript
   * const flags = await conversationalAgentService.getFeatureFlags();
   * if (flags.audioStreamingEnabled) {
   *   // Enable audio UI features
   * }
   * if (flags.fileAttachmentEnabled) {
   *   // Enable file upload features
   * }
   * ```
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }
}
