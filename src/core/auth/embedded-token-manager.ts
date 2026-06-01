import { UipEmbeddedEventNames, UipEmbeddedRefreshTokenPayload, UipEmbeddedTokenRefreshedPayload } from './uip-embedded-protocol';
import { TokenInfo } from './types';
import { Config } from '../config/config';
import { ValidationError } from '../errors';
import { HostTokenResponse, isTokenExpired, requestHostToken } from './host-token-request';

function parseExpiresAt(raw: string): Date {
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    console.warn('EmbeddedTokenManager: host sent a malformed expiresAt value — treating token as already expired', raw);
    return new Date(0);
  }
  return d;
}

function extractToken(data: unknown): HostTokenResponse | undefined {
  const token = (data as UipEmbeddedTokenRefreshedPayload)?.content?.token;
  if (!token?.accessToken) return undefined;
  return { accessToken: token.accessToken, expiresAt: parseExpiresAt(token.expiresAt) };
}

/**
 * Handles token delegation for coded apps embedded inside a UiPath host
 * (e.g. Governance Portal, Insights UI).
 *
 * Detection: the host signals embedding via `?host=embed&basedomain=<origin>`
 * in the iframe src URL. `parentOrigin` is read from `?basedomain=` and validated
 * against the trusted UiPath host allowlist before this manager is constructed.
 * This mirrors the mechanism used by ActionCenterTokenManager.
 *
 * On every token expiry the SDK sends `UIP.refreshToken` with `clientId` and
 * `scope`; the host performs silent SSO and responds with `UIP.tokenRefreshed`.
 */
export class EmbeddedTokenManager {
  private readonly clientId: string;
  private readonly scope: string;
  private refreshPromise: Promise<string> | null = null;
  private cancelRefresh: (() => void) | null = null;

  /**
   * @param parentOrigin Validated UiPath host origin from the `?basedomain=` query parameter.
   * @param config SDK configuration — `clientId` and `scope` are required and forwarded
   *   in every `UIP.refreshToken` request so the host knows which OAuth client to use.
   * @param onTokenRefreshed Called with the refreshed TokenInfo so the caller
   *   can persist it in the execution context.
   * @throws {AuthenticationError} if `config.clientId` or `config.scope` are not set.
   */
  constructor(
    private readonly parentOrigin: string,
    config: Config,
    private readonly onTokenRefreshed: (tokenInfo: TokenInfo) => void
  ) {
    if (!config.clientId || !config.scope) {
      throw new ValidationError({
        message: 'EmbeddedTokenManager requires clientId and scope to be configured for host-delegated authentication',
      });
    }
    this.clientId = config.clientId;
    this.scope = config.scope;
  }

  async refreshAccessToken(tokenInfo: TokenInfo): Promise<string> {
    if (!isTokenExpired(tokenInfo)) {
      return tokenInfo.token;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const { promise, cancel } = requestHostToken({
      pinnedOrigin: this.parentOrigin,
      sendRequest: () => {
        try {
          const message: UipEmbeddedRefreshTokenPayload = {
            eventType: UipEmbeddedEventNames.REFRESH_TOKEN,
            content: { clientId: this.clientId, scope: this.scope },
          };
          window.parent.postMessage(message, this.parentOrigin);
        } catch (error) {
          console.warn('EmbeddedTokenManager: postMessage to host failed', error);
        }
      },
      responseEventType: UipEmbeddedEventNames.TOKEN_REFRESHED,
      extractToken,
      onTokenRefreshed: this.onTokenRefreshed,
    });

    this.cancelRefresh = cancel;
    this.refreshPromise = promise;
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
      this.cancelRefresh = null;
    }
  }

  /** Cancels any in-flight token-refresh request. */
  destroy(): void {
    this.cancelRefresh?.();
  }
}
