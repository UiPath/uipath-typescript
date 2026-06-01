import { ActionCenterEventNames, ActionCenterEventResponsePayload } from '../../models/action-center/tasks.internal-types';
import { TokenInfo } from './types';
import { AuthenticationError, HttpStatus } from '../errors';
import { Config } from '../config/config';
import { HostTokenResponse, isTokenExpired, isValidHostOrigin, requestHostToken } from './host-token-request';

export class ActionCenterTokenManager {
  private readonly parentOrigin = new URLSearchParams(window.location.search).get('basedomain');
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly config: Config,
    private readonly onTokenRefreshed: (tokenInfo: TokenInfo) => void
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

    // Guard before requestHostToken registers the inbound listener — an untrusted
    // basedomain would otherwise leave the listener live for the full timeout window,
    // accepting a forged TOKENREFRESHED from that origin.
    if (!isValidHostOrigin(parentOrigin)) {
      return Promise.reject(
        new AuthenticationError({
          message: 'Cannot refresh token: basedomain is not a trusted UiPath host origin',
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
        const token = (data as ActionCenterEventResponsePayload)?.content?.token;
        if (!token?.accessToken) return undefined;
        return { accessToken: token.accessToken, expiresAt: token.expiresAt };
      },
      onTokenRefreshed: this.onTokenRefreshed,
    });

    this.refreshPromise = promise;
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private sendMessageToParent(eventType: string, content?: unknown): void {
    if (window.parent && isValidHostOrigin(this.parentOrigin)) {
      try {
        window.parent.postMessage({ eventType, content }, this.parentOrigin!);
      } catch (error) {
        console.warn('ActionCenterTokenManager: postMessage to host failed', JSON.stringify(error));
      }
    }
  }
}
