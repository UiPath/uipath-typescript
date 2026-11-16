import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '@tests/utils/session-storage';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { AUTH_STORAGE_KEYS, TOKEN_EXPIRY_BUFFER_MS, TOKEN_REFRESH_LOCK_PREFIX } from '@/core/auth/constants';
import { AuthenticationError } from '@/core/errors';
import type { Config } from '@/core/config/config';
import type { TokenStorage } from '@/core/config/sdk-config';
import type { TokenInfo } from '@/core/auth/types';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// Plain browser environment (non-embedded, non-Action-Center), where the SDK owns the OAuth session.
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');
const BEYOND_BUFFER = new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS * 2);
const PAST_EXPIRY = new Date(NOW.getTime() - 1000);
const STORAGE_KEY = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;
const LOCK_NAME = `${TOKEN_REFRESH_LOCK_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;

const SESSION: TokenInfo = {
  token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: BEYOND_BUFFER,
};
const EXPIRED_SESSION: TokenInfo = {
  token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: PAST_EXPIRY,
};
/** What a tab stores after it renewed `EXPIRED_SESSION`. */
const RENEWED_SESSION: TokenInfo = {
  token: TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-2', expiresAt: BEYOND_BUFFER,
};

function createMemoryStorage() {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
    removeItem: vi.fn((key: string) => { entries.delete(key); }),
  };
}

/** Grants the lock to one holder at a time, in the order asked, like the browser's lock manager. */
function createLockManager() {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    request: vi.fn(<T>(_name: string, run: () => Promise<T>): Promise<T> => {
      const result = queue.then(run);
      queue = result.catch(() => undefined);
      return result;
    }),
  };
}

function makeManager(tokenStorage?: TokenStorage, isOAuth = true) {
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
    tokenStorage,
  };
  return new TokenManager(new ExecutionContext(), config, isOAuth);
}

/** Identity's answer to a refresh it accepts. */
function renewedResponse(): Response {
  return new Response(JSON.stringify({
    access_token: RENEWED_SESSION.token, token_type: 'Bearer', expires_in: 3600, refresh_token: RENEWED_SESSION.refreshToken,
  }));
}

/** Identity's answer to a refresh token it no longer accepts. */
function rejectedResponse(): Response {
  return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400, headers: { 'content-type': 'application/json' } });
}

function mockRefresh() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => renewedResponse());
}

describe('TokenManager — token storage', () => {
  let localStorageStub: ReturnType<typeof createMemoryStorage>;
  let locks: ReturnType<typeof createLockManager>;
  let tabWindow: EventTarget;
  let addEventListener: ReturnType<typeof vi.spyOn>;

  /** Puts a session in the shared store the way another tab would, without this tab hearing of it. */
  function storeFromAnotherTab(session: TokenInfo | undefined): void {
    if (session) localStorageStub.entries.set(STORAGE_KEY, JSON.stringify(session));
    else localStorageStub.entries.delete(STORAGE_KEY);
  }

  /** The event a browser sends to every other tab when one of them changes the shared store. */
  function notifyOfStorageChange(key: string | null = STORAGE_KEY): void {
    tabWindow.dispatchEvent(Object.assign(new Event('storage'), { key }));
  }

  function storedSession(): TokenInfo | undefined {
    const stored = localStorageStub.entries.get(STORAGE_KEY);
    return stored ? JSON.parse(stored) as TokenInfo : undefined;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    memorySessionStorage.reset();
    localStorageStub = createMemoryStorage();
    locks = createLockManager();
    tabWindow = new EventTarget();
    addEventListener = vi.spyOn(tabWindow, 'addEventListener');
    vi.stubGlobal('localStorage', localStorageStub);
    vi.stubGlobal('navigator', { locks });
    vi.stubGlobal('window', tabWindow);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'localStorage');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('by default', () => {
    it('keeps the session in session storage and out of local storage', () => {
      const manager = makeManager();

      manager.setToken(SESSION);

      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(true);
      expect(localStorageStub.setItem).not.toHaveBeenCalled();
    });

    it('also removes a copy an earlier setting left in local storage when the token is cleared', () => {
      // The app once ran with tokenStorage set to localStorage and no longer does.
      storeFromAnotherTab(SESSION);
      const manager = makeManager();
      manager.setToken(SESSION);

      manager.clearToken();

      expect(storedSession()).toBeUndefined();
    });

    it('does not listen for other tabs or take a lock to renew', async () => {
      const fetchSpy = mockRefresh();
      const manager = makeManager('sessionStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(addEventListener).not.toHaveBeenCalled();
      expect(locks.request).not.toHaveBeenCalled();
      expect(localStorageStub.getItem).not.toHaveBeenCalled();
    });
  });

  describe('with tokenStorage set to localStorage', () => {
    it('keeps the session in local storage and out of session storage', () => {
      const manager = makeManager('localStorage');

      manager.setToken(SESSION);

      expect(storedSession()?.refreshToken).toBe(SESSION.refreshToken);
      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(false);
    });

    it('lets a new tab load the session another tab stored', () => {
      makeManager('localStorage').setToken(SESSION);
      // Nothing in session storage, so the new tab can only have it from local storage.
      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(false);
      const newTab = makeManager('localStorage');

      expect(newTab.loadFromStorage()).toBe(true);
      expect(newTab.getToken()).toBe(SESSION.token);
    });

    it('removes the session from local storage when the token is cleared', () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);
      expect(storedSession()?.refreshToken).toBe(SESSION.refreshToken);

      manager.clearToken();

      expect(storedSession()).toBeUndefined();
    });

    it('also removes a copy an earlier setting left in session storage when the token is cleared', () => {
      memorySessionStorage.entries.set(STORAGE_KEY, JSON.stringify(SESSION));
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      manager.clearToken();

      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(false);
    });

    it('falls back to session storage when the browser denies local storage', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => { throw new Error(TEST_CONSTANTS.ERROR_MESSAGE); },
      });
      const manager = makeManager('localStorage');

      manager.setToken(SESSION);

      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(true);
      expect(addEventListener).not.toHaveBeenCalled();
    });

    it('is ignored when the SDK does not own the session', () => {
      const manager = makeManager('localStorage', false);

      manager.setToken(SESSION);

      expect(localStorageStub.setItem).not.toHaveBeenCalled();
      expect(addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('staying in sync with other tabs', () => {
    it('adopts a session another tab stored, when the browser reports the change', () => {
      const manager = makeManager('localStorage');
      const onTokenChange = vi.fn();
      manager.setToken(EXPIRED_SESSION);
      manager.onTokenChange(onTokenChange);

      storeFromAnotherTab(RENEWED_SESSION);
      notifyOfStorageChange();

      expect(manager.getTokenInfo()?.refreshToken).toBe(RENEWED_SESSION.refreshToken);
      expect(manager.hasValidToken()).toBe(true);
      expect(onTokenChange).toHaveBeenLastCalledWith(expect.objectContaining({ token: RENEWED_SESSION.token }));
    });

    it('signs out when another tab removed the session', () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      storeFromAnotherTab(undefined);
      notifyOfStorageChange();

      expect(manager.getTokenInfo()).toBeUndefined();
      expect(manager.hasValidToken()).toBe(false);
    });

    it('signs out when the whole store was cleared', () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      storeFromAnotherTab(undefined);
      notifyOfStorageChange(null);

      expect(manager.getTokenInfo()).toBeUndefined();
    });

    it('signs in when another tab did', () => {
      const manager = makeManager('localStorage');

      storeFromAnotherTab(SESSION);
      notifyOfStorageChange();

      expect(manager.getToken()).toBe(SESSION.token);
    });

    it('follows a sign-out in another tab after it adopted that tab\'s session', () => {
      const manager = makeManager('localStorage');
      storeFromAnotherTab(SESSION);
      notifyOfStorageChange();

      storeFromAnotherTab(undefined);
      notifyOfStorageChange();

      expect(manager.getTokenInfo()).toBeUndefined();
    });

    it.each([
      ['access token', { ...SESSION, token: RENEWED_SESSION.token }],
      ['refresh token', { ...SESSION, refreshToken: RENEWED_SESSION.refreshToken }],
    ])('adopts a stored session that differs only in its %s', (_part, stored) => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      storeFromAnotherTab(stored);
      notifyOfStorageChange();

      expect(manager.getTokenInfo()).toMatchObject({ token: stored.token, refreshToken: stored.refreshToken });
    });

    it('ignores a change to another key', () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);
      localStorageStub.getItem.mockClear();

      notifyOfStorageChange(AUTH_STORAGE_KEYS.OAUTH_CONTEXT);

      expect(localStorageStub.getItem).not.toHaveBeenCalled();
      expect(manager.getToken()).toBe(SESSION.token);
    });

    it('uses a session another tab renewed even when no change was reported', async () => {
      const fetchSpy = mockRefresh();
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      storeFromAnotherTab(RENEWED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects with AuthenticationError after another tab signed out, even when no change was reported', async () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      storeFromAnotherTab(undefined);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('keeps a session the store could not keep instead of taking it for a sign-out elsewhere', async () => {
      localStorageStub.setItem.mockImplementation(() => { throw new Error(TEST_CONSTANTS.ERROR_MESSAGE); });
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      notifyOfStorageChange();

      await expect(manager.getValidToken()).resolves.toBe(SESSION.token);
    });

    it('stops listening once destroyed', () => {
      const manager = makeManager('localStorage');
      manager.setToken(SESSION);

      manager.destroy();
      storeFromAnotherTab(undefined);
      notifyOfStorageChange();

      expect(manager.getToken()).toBe(SESSION.token);
    });
  });

  describe('renewing a session the tabs share', () => {
    it('holds the lock named after the client while it renews', async () => {
      mockRefresh();
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);

      expect(locks.request).toHaveBeenCalledTimes(1);
      expect(locks.request.mock.calls[0][0]).toBe(LOCK_NAME);
      expect(storedSession()?.refreshToken).toBe(RENEWED_SESSION.refreshToken);
    });

    it('redeems the refresh token once when two tabs renew at the same time', async () => {
      const fetchSpy = mockRefresh();
      const firstTab = makeManager('localStorage');
      firstTab.setToken(EXPIRED_SESSION);
      const secondTab = makeManager('localStorage');
      secondTab.loadFromStorage();

      const tokens = await Promise.all([firstTab.getValidToken(), secondTab.getValidToken()]);

      expect(tokens).toEqual([RENEWED_SESSION.token, RENEWED_SESSION.token]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(secondTab.getTokenInfo()?.refreshToken).toBe(RENEWED_SESSION.refreshToken);
    });

    it('makes no request when another tab renewed while this one waited for the lock', async () => {
      const fetchSpy = mockRefresh();
      locks.request.mockImplementationOnce((_name, run) => {
        storeFromAnotherTab(RENEWED_SESSION);
        return run();
      });
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(manager.getTokenInfo()?.refreshToken).toBe(RENEWED_SESSION.refreshToken);
    });

    it('renews without a lock in a browser that has no Web Locks API', async () => {
      vi.stubGlobal('navigator', {});
      const fetchSpy = mockRefresh();
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects with AuthenticationError when another tab signed out while this one waited for the lock', async () => {
      const fetchSpy = mockRefresh();
      locks.request.mockImplementationOnce((_name, run) => {
        storeFromAnotherTab(undefined);
        return run();
      });
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('renews a session another tab stored when that one is due as well', async () => {
      const fetchSpy = mockRefresh();
      const dueSoon: TokenInfo = { ...SESSION, refreshToken: 'refresh-from-another-tab', expiresAt: new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS / 2) };
      locks.request.mockImplementationOnce((_name, run) => {
        storeFromAnotherTab(dueSoon);
        return run();
      });
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).resolves.toBe(RENEWED_SESSION.token);

      expect(new URLSearchParams(String(fetchSpy.mock.calls[0][1]?.body)).get('refresh_token')).toBe(dueSoon.refreshToken);
    });
  });

  describe('a renewal that is overtaken', () => {
    /** A fetch that stays pending until the test answers it. */
    function mockPendingRefresh() {
      let answer!: (response: Response) => void;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        () => new Promise<Response>((resolve) => { answer = resolve; })
      );
      return { fetchSpy, answer: (response: Response) => answer(response) };
    }

    /** Lets the lock be granted and the request go out. */
    const requestSent = (fetchSpy: { mock: { calls: unknown[] } }) => vi.waitFor(() => expect(fetchSpy.mock.calls).toHaveLength(1));

    it('does not bring the session back when another tab signed out during the request', async () => {
      const { fetchSpy, answer } = mockPendingRefresh();
      const renewingTab = makeManager('localStorage');
      renewingTab.setToken(EXPIRED_SESSION);
      const otherTab = makeManager('localStorage');
      otherTab.loadFromStorage();
      const renewal = renewingTab.getValidToken();
      await requestSent(fetchSpy);

      otherTab.clearToken();
      notifyOfStorageChange();
      answer(renewedResponse());

      await expect(renewal).rejects.toBeInstanceOf(AuthenticationError);
      expect(storedSession()).toBeUndefined();
      expect(renewingTab.getTokenInfo()).toBeUndefined();
      expect(otherTab.getTokenInfo()).toBeUndefined();
    });

    it('does not bring the session back when this tab signed out during the request', async () => {
      const { fetchSpy, answer } = mockPendingRefresh();
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);
      const renewal = manager.getValidToken();
      await requestSent(fetchSpy);

      manager.clearToken();
      answer(renewedResponse());

      await expect(renewal).rejects.toBeInstanceOf(AuthenticationError);
      expect(storedSession()).toBeUndefined();
      expect(manager.getTokenInfo()).toBeUndefined();
    });

    it('does not bring the session back in the default store either', async () => {
      const { fetchSpy, answer } = mockPendingRefresh();
      const manager = makeManager();
      manager.setToken(EXPIRED_SESSION);
      const renewal = manager.getValidToken();
      await requestSent(fetchSpy);

      manager.clearToken();
      answer(renewedResponse());

      await expect(renewal).rejects.toBeInstanceOf(AuthenticationError);
      expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(false);
    });

    it('keeps the session a new sign-in in another tab stored during the request', async () => {
      const { fetchSpy, answer } = mockPendingRefresh();
      const newSession: TokenInfo = { ...SESSION, refreshToken: 'refresh-of-new-sign-in' };
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);
      const renewal = manager.getValidToken();
      await requestSent(fetchSpy);

      storeFromAnotherTab(newSession);
      answer(renewedResponse());

      await expect(renewal).resolves.toBe(newSession.token);
      expect(storedSession()?.refreshToken).toBe(newSession.refreshToken);
    });
  });

  describe('a renewal that fails', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('ends the shared session when no other tab renewed it', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => rejectedResponse());
      const manager = makeManager('localStorage');
      manager.setToken(EXPIRED_SESSION);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expect(storedSession()).toBeUndefined();
    });

    it('uses the session another tab renewed first instead of ending it, without the Web Locks API', async () => {
      // No lock, so both tabs redeem the same refresh token: Identity accepts the first and rejects the second.
      vi.stubGlobal('navigator', {});
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockImplementationOnce(async () => renewedResponse())
        .mockImplementationOnce(async () => rejectedResponse());
      const firstTab = makeManager('localStorage');
      firstTab.setToken(EXPIRED_SESSION);
      const secondTab = makeManager('localStorage');
      secondTab.loadFromStorage();

      const tokens = await Promise.all([firstTab.getValidToken(), secondTab.getValidToken()]);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(tokens).toEqual([RENEWED_SESSION.token, RENEWED_SESSION.token]);
      expect(storedSession()?.refreshToken).toBe(RENEWED_SESSION.refreshToken);
    });
  });
});
