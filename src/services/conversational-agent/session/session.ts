/**
 * WebSocketSession - WebSocket connection for Conversational Agent
 *
 * Extends BaseWebSocket from core to add UiPath-specific functionality:
 * - Organization/Tenant headers
 * - Automatic token refresh on reconnection (via BaseWebSocket.getValidToken())
 */

import type { IUiPathSDK } from '@/core/types';
import { BaseWebSocket } from '@/core/websocket';
import type { LogLevel } from '@/core/websocket';
import { SDKInternalsRegistry } from '@/core/internals';

import { WEBSOCKET_HEADERS } from '@/utils/constants/headers';

/**
 * Options for WebSocketSession
 */
export interface WebSocketSessionOptions {
  /** External User ID (optional) */
  externalUserId?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}

/**
 * WebSocket session for Conversational Agent
 *
 * Manages real-time WebSocket connection for conversation events.
 * Connection is established automatically when needed via getConnectedSocket().
 *
 * @example
 * ```typescript
 * const session = new WebSocketSession(sdk);
 *
 * // Listen for events
 * session.addEventListeners({
 *   'ConversationEvent': (data) => console.log('Event:', data)
 * });
 *
 * // Get socket (auto-connects if needed)
 * const socket = await session.getConnectedSocket();
 *
 * // Disconnect when done
 * session.disconnect();
 * ```
 */
export class WebSocketSession extends BaseWebSocket {
  private _externalUserId?: string;

  constructor(instance: IUiPathSDK, options?: WebSocketSessionOptions) {
    const { config, context, tokenManager } = SDKInternalsRegistry.get(instance);

    super(
      {
        ...config,
        logLevel: options?.logLevel
      },
      context,
      tokenManager,
      'ConversationalAgentSession'
    );

    this._externalUserId = options?.externalUserId;
  }

  /**
   * Connect to WebSocket.
   * Token retrieval is handled automatically by BaseWebSocket on every connection/reconnection.
   */
  connect(): void {
    const query: Record<string, string> = {};

    if (this._config.orgName) {
      query[WEBSOCKET_HEADERS.ORGANIZATION_ID] = this._config.orgName;
    }
    if (this._config.tenantName) {
      query[WEBSOCKET_HEADERS.TENANT_ID] = this._config.tenantName;
    }
    if (this._externalUserId) {
      query[WEBSOCKET_HEADERS.EXTERNAL_USER_ID] = this._externalUserId;
    }

    this.connectWithOptions({ query });
  }

  /**
   * Auto-connect when getConnectedSocket is called while disconnected
   */
  protected override onDisconnectedWhileWaiting(): void {
    this.connect();
  }
}
