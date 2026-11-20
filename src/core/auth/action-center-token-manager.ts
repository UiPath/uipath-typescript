import { ActionCenterEventNames, ActionCenterEventResponsePayload } from '../../models/action-center/tasks.internal-types';
import { TokenInfo } from './types';
import { AuthenticationError, HttpStatus } from '../errors';
import { Config } from '../config/config';
import { HostTokenResponse, isTokenExpired, requestHostToken } from './host-token-request';
import { GUID_REGEX } from '../../utils/validation/guid';

export class ActionCenterTokenManager {
  private readonly parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly config: Config,
    private readonly onTokenRefreshed: (tokenInfo: TokenInfo) => void,
    private readonly onDebugJobKey?: (jobKey: string) => void
  ) {}

  async refreshAccessToken(tokenInfo: TokenInfo): Promise<string> {
    if (!isTokenExpired(tokenInfo)) {
      return tokenInfo.token;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const parentOrigin = this.parentOrigin;
    if (!parentOrigin) {
      return Promise.reject(
        new AuthenticationError({
          message: 'Cannot refresh token: basedomain query parameter is missing',
          statusCode: HttpStatus.UNAUTHORIZED,
        })
      );
    }

    const { promise } = requestHostToken({
      pinnedOrigin: parentOrigin,
      sendRequest: () => this.sendMessageToParent(ActionCenterEventNames.REFRESHTOKEN, {
        clientId: this.config.clientId,
        scope: this.config.scope,
      }),
      responseEventType: ActionCenterEventNames.TOKENREFRESHED,
      extractToken: (data): HostTokenResponse | undefined => {
        const content = (data as ActionCenterEventResponsePayload)?.content;
        const token = content?.token;
        if (!token?.accessToken) return undefined;
        const debugJobKey = typeof content.debugJobKey === 'string' && GUID_REGEX.test(content.debugJobKey)
          ? content.debugJobKey
          : undefined;
        return { accessToken: token.accessToken, expiresAt: token.expiresAt, debugJobKey };
      },
      onTokenRefreshed: this.onTokenRefreshed,
      onDebugJobKey: this.onDebugJobKey,
    });

    this.refreshPromise = promise;
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private sendMessageToParent(eventType: string, content?: unknown): void {
    if (window.parent && this.parentOrigin) {
      try {
        window.parent.postMessage({ eventType, content }, this.parentOrigin);
      } catch (error) {
        console.warn('ActionCenterTokenManager: postMessage to host failed', JSON.stringify(error));
      }
    }
  }
}
