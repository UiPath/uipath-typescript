/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler, LogLevel } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentServiceModel,
  ConversationalAgentOptions,
  FeatureFlags
} from '@/models/conversational-agent';

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
 * Service for interacting with UiPath Conversational Agent API
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
   * Creates an instance of the ConversationalAgent service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration
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
   * Event helpers for sending and receiving real-time conversation events
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
   * Disconnects from WebSocket and releases all session resources
   *
   * Immediately closes the WebSocket connection and clears all per-conversation
   * socket tracking. Any active sessions will receive a disconnection error.
   *
   * Note: Sessions are automatically cleaned up when they end. Use this only
   * when you need to force a full disconnection (e.g., on app shutdown or logout).
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
   * Registers a handler for connection status changes
   *
   * @param handler - Callback function to handle status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._sessionManager.onConnectionStatusChanged(handler);
  }

  /**
   * Sets the log level for debugging
   *
   * @param level - Log level to set
   */
  setLogLevel(level: LogLevel): void {
    this._sessionManager.setLogLevel(level);
  }

  /**
   * Gets feature flags for the current tenant
   *
   * @returns Promise resolving to feature flags object
   *
   * @example
   * ```typescript
   * const flags = await conversationalAgentService.getFeatureFlags();
   * if (flags.audioStreamingEnabled) {
   *   // Enable audio UI features
   * }
   * ```
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }
}
