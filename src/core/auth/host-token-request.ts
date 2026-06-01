import { TokenInfo } from './types';
import { AuthenticationError, HttpStatus } from '../errors';

export const AUTHENTICATION_TIMEOUT = 8000;

const ALLOWED_HOST_ORIGINS = new Set([
  'https://alpha.uipath.com',
  'https://staging.uipath.com',
  'https://cloud.uipath.com',
]);

/**
 * Returns true if the origin is a trusted UiPath host that may initiate
 * token delegation. Mirrors the same allowlist used by ActionCenterTokenManager.
 */
export function isValidHostOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_HOST_ORIGINS.has(origin)) return true;
  try {
    return new URL(origin).hostname === 'localhost';
  } catch {
    console.warn('isValidHostOrigin: received a malformed origin URL', origin);
    return false;
  }
}

export function isTokenExpired(tokenInfo: TokenInfo): boolean {
  if (!tokenInfo?.expiresAt) return true;
  return new Date() >= tokenInfo.expiresAt;
}

export interface HostTokenResponse {
  accessToken: string;
  expiresAt: Date;
}

export interface HostTokenRequestOptions {
  /** Origin the request is sent to and responses accepted from. */
  pinnedOrigin: string;
  /** Sends the refresh request to the parent frame. */
  sendRequest: () => void;
  /** Event type string the host sends back with the refreshed token. */
  responseEventType: string;
  /** Extracts the token from the host response message. Returns undefined if the payload is malformed. */
  extractToken: (data: unknown) => HostTokenResponse | undefined;
  /** Called with the refreshed TokenInfo before the promise resolves. */
  onTokenRefreshed: (tokenInfo: TokenInfo) => void;
}

export interface HostTokenRequest {
  readonly promise: Promise<string>;
  /** Immediately rejects the promise and removes the response listener. */
  readonly cancel: () => void;
}

/**
 * Waits for the next window message that satisfies `filter`.
 * Rejects if the AbortSignal fires before a matching message arrives.
 */
function waitForMessage(
  filter: (event: MessageEvent) => boolean,
  signal: AbortSignal
): Promise<MessageEvent> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent): void => {
      if (!filter(event)) return;
      window.removeEventListener('message', handler);
      resolve(event);
    };

    signal.addEventListener('abort', () => {
      window.removeEventListener('message', handler);
      reject(signal.reason);
    }, { once: true });

    window.addEventListener('message', handler);
  });
}

/**
 * Sends a token-refresh request to a parent host frame and waits for the
 * response. Handles timeout, origin filtering, and listener cleanup.
 *
 * Both ActionCenterTokenManager and EmbeddedTokenManager delegate to this
 * function; they differ only in the event names and message shape they use.
 */
export function requestHostToken(options: HostTokenRequestOptions): HostTokenRequest {
  const { pinnedOrigin, sendRequest, responseEventType, extractToken, onTokenRefreshed } = options;

  const controller = new AbortController();

  const cancel = (): void =>
    controller.abort(
      new AuthenticationError({
        message: 'Token refresh cancelled',
        statusCode: HttpStatus.UNAUTHORIZED,
      })
    );

  const promise = (async (): Promise<string> => {
    const timer = setTimeout(
      () =>
        controller.abort(
          new AuthenticationError({
            message: `Token refresh timed out after ${AUTHENTICATION_TIMEOUT}ms waiting for host response`,
            statusCode: HttpStatus.UNAUTHORIZED,
          })
        ),
      AUTHENTICATION_TIMEOUT
    );

    try {
      // Register listener before sending — avoids any race between send and response
      const responsePromise = waitForMessage(
        event => event.origin === pinnedOrigin && event.data?.eventType === responseEventType,
        controller.signal
      );

      sendRequest();

      const event = await responsePromise;

      const token = extractToken(event.data);
      if (!token) {
        throw new AuthenticationError({
          message: 'Host responded but did not include a valid access token',
          statusCode: HttpStatus.UNAUTHORIZED,
        });
      }

      // type: 'secret' intentionally prevents the SDK's internal OAuth refresh path
      // from running — the host manager owns the refresh cycle via requestHostToken.
      // This mirrors the same pattern used by ActionCenterTokenManager.
      onTokenRefreshed({ token: token.accessToken, type: 'secret', expiresAt: token.expiresAt });
      return token.accessToken;
    } finally {
      clearTimeout(timer);
    }
  })();

  return { promise, cancel };
}
