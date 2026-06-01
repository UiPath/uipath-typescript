import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTHENTICATION_TIMEOUT } from '@/core/auth/host-token-request';
import { ActionCenterTokenManager } from '@/core/auth/action-center-token-manager';
import { ActionCenterEventNames } from '@/models/action-center/tasks.internal-types';
import { AuthenticationError } from '@/core/errors';
import type { TokenInfo } from '@/core/auth/types';
import type { Config } from '@/core/config/config';

// ---------------------------------------------------------------------------
// Window mock helpers
// ---------------------------------------------------------------------------

type MessageHandler = (e: MessageEvent) => void;

function makeWindowMock(basedomain: string | null = 'https://cloud.uipath.com') {
  const listeners: Record<string, MessageHandler[]> = {};
  const parentPostMessage = vi.fn();
  const search = basedomain ? `?basedomain=${encodeURIComponent(basedomain)}` : '';

  return {
    location: { search },
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
    get parentPostMessage() {
      return parentPostMessage;
    },
  };
}

type WindowMock = ReturnType<typeof makeWindowMock>;

function makeRefreshedEvent(origin: string, accessToken = 'tok-refreshed'): Partial<MessageEvent> {
  return {
    origin,
    data: {
      eventType: ActionCenterEventNames.TOKENREFRESHED,
      content: { token: { accessToken, expiresAt: new Date(Date.now() + 3600_000) } },
    },
  };
}

const VALID_ORIGIN = 'https://cloud.uipath.com';
const MOCK_CONFIG: Config = {
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'test-org',
  tenantName: 'test-tenant',
  clientId: 'ac-client',
  scope: 'openid',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActionCenterTokenManager', () => {
  let mock: WindowMock;
  let onTokenRefreshed: ReturnType<typeof vi.fn>;
  let manager: ActionCenterTokenManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mock = makeWindowMock(VALID_ORIGIN);
    global.window = mock as unknown as Window & typeof globalThis;
    onTokenRefreshed = vi.fn();
    manager = new ActionCenterTokenManager(MOCK_CONFIG, onTokenRefreshed);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (global as unknown as Record<string, unknown>).window;
  });

  // ---- non-expired token ----

  it('returns token immediately when not expired', async () => {
    const tokenInfo: TokenInfo = { token: 'tok-valid', type: 'secret', expiresAt: new Date(Date.now() + 3600_000) };
    const result = await manager.refreshAccessToken(tokenInfo);
    expect(result).toBe('tok-valid');
    expect(mock.parentPostMessage).not.toHaveBeenCalled();
  });

  // ---- missing basedomain ----

  it('rejects when basedomain query param is absent', async () => {
    mock = makeWindowMock(null);
    global.window = mock as unknown as Window & typeof globalThis;
    manager = new ActionCenterTokenManager(MOCK_CONFIG, onTokenRefreshed);

    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };
    await expect(manager.refreshAccessToken(expired)).rejects.toBeInstanceOf(AuthenticationError);
    expect(mock.parentPostMessage).not.toHaveBeenCalled();
  });

  it('rejects before registering a listener when basedomain is not a trusted origin', async () => {
    mock = makeWindowMock('https://evil.example.com');
    global.window = mock as unknown as Window & typeof globalThis;
    manager = new ActionCenterTokenManager(MOCK_CONFIG, onTokenRefreshed);

    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };
    await expect(manager.refreshAccessToken(expired)).rejects.toBeInstanceOf(AuthenticationError);
    // No listener registered — the inbound listener window is never opened
    expect(mock.addEventListener).not.toHaveBeenCalledWith('message', expect.any(Function));
    expect(mock.parentPostMessage).not.toHaveBeenCalled();
  });

  // ---- refresh flow ----

  it('sends AC.refreshToken with clientId and scope when token is expired', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(VALID_ORIGIN, 'tok-new'));
    await refreshPromise;

    expect(mock.parentPostMessage).toHaveBeenCalledWith(
      {
        eventType: ActionCenterEventNames.REFRESHTOKEN,
        content: { clientId: MOCK_CONFIG.clientId, scope: MOCK_CONFIG.scope },
      },
      VALID_ORIGIN
    );
  });

  it('resolves with new access token from AC.tokenRefreshed', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(VALID_ORIGIN, 'tok-new'));

    expect(await refreshPromise).toBe('tok-new');
  });

  it('calls onTokenRefreshed after successful refresh', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent(VALID_ORIGIN, 'tok-new'));
    await refreshPromise;

    expect(onTokenRefreshed).toHaveBeenCalledOnce();
    expect(onTokenRefreshed.mock.calls[0][0].token).toBe('tok-new');
  });

  it('ignores tokenRefreshed from a different origin', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch(makeRefreshedEvent('https://staging.uipath.com', 'tok-hijack'));
    mock.dispatch(makeRefreshedEvent(VALID_ORIGIN, 'tok-good'));

    expect(await refreshPromise).toBe('tok-good');
  });

  it('rejects when host responds with no accessToken', async () => {
    const expired: TokenInfo = { token: 'tok-old', type: 'secret', expiresAt: new Date(0) };

    const refreshPromise = manager.refreshAccessToken(expired);
    mock.dispatch({
      origin: VALID_ORIGIN,
      data: { eventType: ActionCenterEventNames.TOKENREFRESHED, content: { token: { accessToken: '' } } },
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
      mock.dispatch(makeRefreshedEvent(VALID_ORIGIN, 'tok-new')),
    ]);

    expect(r1).toBe('tok-new');
    expect(r2).toBe('tok-new');
    expect(mock.parentPostMessage).toHaveBeenCalledOnce();
  });

});
