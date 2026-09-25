import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddedTokenManager } from '@/core/auth/embedded-token-manager';
import { UipEmbeddedEventNames } from '@/core/auth/uip-embedded-protocol';
import { AuthenticationError, ValidationError } from '@/core/errors';
import { AUTHENTICATION_TIMEOUT } from '@/core/auth/host-token-request';
import type { TokenInfo } from '@/core/auth/types';
import type { Config } from '@/core/config/config';

// ---------------------------------------------------------------------------
// Window mock
// ---------------------------------------------------------------------------

type MessageHandler = (e: MessageEvent) => void;

function makeWindowMock() {
  const listeners: Record<string, MessageHandler[]> = {};
  const parentPostMessage = vi.fn();

  return {
    addEventListener: vi.fn((type: string, handler: MessageHandler) => {
      (listeners[type] ??= []).push(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: MessageHandler) => {
      listeners[type] = (listeners[type] ?? []).filter(h => h !== handler);
    }),
    parent: { postMessage: parentPostMessage },
    dispatch(event: Partial<MessageEvent>) {
      (listeners['message'] ?? []).forEach(h => h(event as MessageEvent));
    },
    get parentPostMessage() { return parentPostMessage; },
  };
}

type WindowMock = ReturnType<typeof makeWindowMock>;

// ---------------------------------------------------------------------------
// Event factories
// ---------------------------------------------------------------------------

function makeRefreshedEvent(origin: string, accessToken = 'tok-refreshed', expiresAt?: string): Partial<MessageEvent> {
  return {
    origin,
    data: {
      eventType: UipEmbeddedEventNames.TOKEN_REFRESHED,
      content: { token: { accessToken, expiresAt: expiresAt ?? new Date(Date.now() + 3600_000).toISOString() } },
    },
  };
}

const PARENT_ORIGIN = 'https://cloud.uipath.com';
const MOCK_CONFIG: Config = {
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'test-org',
  tenantName: 'test-tenant',
  clientId: 'test-client-id',
  scope: 'openid OR.Tasks',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmbeddedTokenManager', () => {
  let mock: WindowMock;
  let onTokenRefreshed: ReturnType<typeof vi.fn>;
  let manager: EmbeddedTokenManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mock = makeWindowMock();
    global.window = mock as unknown as Window & typeof globalThis;
    onTokenRefreshed = vi.fn();
    manager = new EmbeddedTokenManager(PARENT_ORIGIN, MOCK_CONFIG, onTokenRefreshed);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (global as unknown as Record<string, unknown>).window;
  });

  // ---- non-expired token ----

  it('returns token immediately when not expired', async () => {
    const tokenInfo: TokenInfo = { token: 'tok-fresh', type: 'secret', expiresAt: new Date(Date.now() + 3600_000) };
    expect(await manager.refreshAccessToken(tokenInfo)).toBe('tok-fresh');
    expect(mock.parentPostMessage).not.toHaveBeenCalled();
  });

  // ---- refresh flow ----

  it('sends UIP.refreshToken with clientId and scope when token expired', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-new'));
    await refreshPromise;

    expect(mock.parentPostMessage).toHaveBeenCalledWith(
      {
        eventType: UipEmbeddedEventNames.REFRESH_TOKEN,
        content: { clientId: MOCK_CONFIG.clientId, scope: MOCK_CONFIG.scope },
      },
      PARENT_ORIGIN
    );
  });

  it('resolves with new access token from UIP.tokenRefreshed', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-new'));

    expect(await refreshPromise).toBe('tok-new');
  });

  it('calls onTokenRefreshed after successful refresh', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-new'));
    await refreshPromise;

    expect(onTokenRefreshed).toHaveBeenCalledOnce();
    expect(onTokenRefreshed.mock.calls[0][0].token).toBe('tok-new');
  });

  it('ignores tokenRefreshed from a different origin', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent('https://staging.uipath.com', 'tok-hijack'));
    mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-good'));

    expect(await refreshPromise).toBe('tok-good');
  });

  it('rejects when host responds with UIP.tokenRefreshed but omits the access token', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch({
      origin: PARENT_ORIGIN,
      data: { eventType: UipEmbeddedEventNames.TOKEN_REFRESHED, content: { token: { accessToken: '' } } },
    });

    await expect(refreshPromise).rejects.toBeInstanceOf(AuthenticationError);
  });

  // ---- timeout ----

  it('rejects with AuthenticationError after timeout', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    vi.advanceTimersByTime(AUTHENTICATION_TIMEOUT + 1);

    await expect(refreshPromise).rejects.toBeInstanceOf(AuthenticationError);
  });

  // ---- deduplication ----

  it('deduplicates concurrent refresh calls into a single postMessage', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const [r1, r2] = await Promise.all([
      manager.refreshAccessToken(expired),
      manager.refreshAccessToken(expired),
      mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-new')),
    ]);

    expect(r1).toBe('tok-new');
    expect(r2).toBe('tok-new');
    expect(mock.parentPostMessage).toHaveBeenCalledOnce();
  });

  // ---- malformed expiresAt ----

  it('treats malformed expiresAt in response as already expired and logs a warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(PARENT_ORIGIN, 'tok-new', 'not-a-date'));
    await refreshPromise;

    expect(onTokenRefreshed.mock.calls[0][0].expiresAt.getTime()).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed expiresAt'),
      'not-a-date'
    );
    warnSpy.mockRestore();
  });

  // ---- destroy ----

  it('destroy() is a no-op when no refresh is in flight', () => {
    expect(() => manager.destroy()).not.toThrow();
  });

  it('destroy() cancels an in-flight refresh and rejects the promise with AuthenticationError', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    manager.destroy();

    await expect(refreshPromise).rejects.toBeInstanceOf(AuthenticationError);
    expect(mock.parentPostMessage).toHaveBeenCalledOnce(); // request was sent before cancel
  });

  // ---- constructor validation ----

  it('throws ValidationError when constructed without clientId', () => {
    const configWithoutClientId: Config = { ...MOCK_CONFIG, clientId: undefined };
    expect(() => new EmbeddedTokenManager(PARENT_ORIGIN, configWithoutClientId, onTokenRefreshed))
      .toThrow(ValidationError);
  });

  it('throws ValidationError when constructed without scope', () => {
    const configWithoutScope: Config = { ...MOCK_CONFIG, scope: undefined };
    expect(() => new EmbeddedTokenManager(PARENT_ORIGIN, configWithoutScope, onTokenRefreshed))
      .toThrow(ValidationError);
  });
});
