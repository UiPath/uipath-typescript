/**
 * WebSocketSession - WebSocket connection for Conversational Agent
 */

import type { IUiPath } from '@/core/types';
import { BaseWebSocket } from '@/core/websocket';
import type { ConversationalAgentOptions } from '@/models/conversational-agent';
import { SDKInternalsRegistry } from '@/core/internals';

import { WEBSOCKET_QUERY_PARAMS } from '@/utils/constants/headers';
import { WEBSOCKET_LOGGER_PREFIX } from '../../constants';

/**
 * WebSocket session for Conversational Agent
 */
export class WebSocketSession extends BaseWebSocket {
  private _externalUserId?: string;

  /**
   * Creates an instance of the WebSocketSession.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    const { config, context, tokenManager } = SDKInternalsRegistry.get(instance);
    super(
      {
        ...config,
        logLevel: options?.logLevel
      },
      context,
      tokenManager,
      WEBSOCKET_LOGGER_PREFIX
    );

    this._externalUserId = options?.externalUserId;
  }

  /**
   * Connects to WebSocket with organization and tenant headers
   *
   * Token retrieval is handled automatically by BaseWebSocket on every
   * connection/reconnection.
   */
  connect(): void {
    const query: Record<string, string> = {};

    if (this._config.orgName) {
      query[WEBSOCKET_QUERY_PARAMS.ORGANIZATION_ID] = this._config.orgName;
    }
    if (this._config.tenantName) {
      query[WEBSOCKET_QUERY_PARAMS.TENANT_ID] = this._config.tenantName;
    }
    if (this._externalUserId) {
      query[WEBSOCKET_QUERY_PARAMS.EXTERNAL_USER_ID] = this._externalUserId;
    }

    this.connectWithOptions({ query });
  }

  /**
   * Auto-connects when getConnectedSocket is called while disconnected
   */
  protected override onDisconnectedWhileWaiting(): void {
    this.connect();
  }
}
