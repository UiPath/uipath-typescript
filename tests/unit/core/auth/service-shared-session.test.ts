import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '@tests/utils/session-storage';
import { AuthService } from '@/core/auth/service';
import { AUTH_STORAGE_KEYS } from '@/core/auth/constants';
import type { Config } from '@/core/config/config';
import type { TokenInfo } from '@/core/auth/types';
import { ExecutionContext } from '@/core/context/execution';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { JOB_TEST_CONSTANTS } from '@tests/utils/constants/jobs';

// Browser-mode platform mock: the OAuth session and its storage are browser-only
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

const TOKEN_KEY = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;
const HOUR_MS = 60 * 60 * 1000;

describe('AuthService with the session shared in local storage (browser)', () => {
  const sharedConfig: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
    tokenStorage: 'localStorage',
  };

  let localEntries: Map<string, string>;
  let replaceState: ReturnType<typeof vi.fn>;

  /** Loads the page at the redirect URI with `search`, as the browser does on the way back from sign-in. */
  function openPage(search: string): void {
    replaceState = vi.fn();
    vi.stubGlobal('window', Object.assign(new EventTarget(), {
      location: { href: `${TEST_CONSTANTS.REDIRECT_URI}${search}`, search },
      history: { replaceState },
      document: {},
    }));
  }

  /** The sign-in state this tab stored before it left for Identity. */
  function storeSignInState(returnTo?: string): void {
    memorySessionStorage.entries.set(
      AUTH_STORAGE_KEYS.OAUTH_CONTEXT,
      JSON.stringify({ ...sharedConfig, codeVerifier: 'code-verifier', returnTo })
    );
  }

  /** The session another tab stored once its own sign-in completed. */
  function storeSessionFromAnotherTab(): TokenInfo {
    const session: TokenInfo = {
      token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-from-another-tab', expiresAt: new Date(Date.now() + HOUR_MS),
    };
    localEntries.set(TOKEN_KEY, JSON.stringify(session));
    return session;
  }

  beforeEach(() => {
    memorySessionStorage.reset();
    localEntries = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localEntries.get(key) ?? null,
      setItem: (key: string, value: string) => { localEntries.set(key, value); },
      removeItem: (key: string) => { localEntries.delete(key); },
    });
    openPage('');
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should keep the session in local storage', () => {
    const service = new AuthService(sharedConfig, new ExecutionContext());

    service.updateToken({ token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1' });

    expect(JSON.parse(localEntries.get(TOKEN_KEY) ?? '{}').refreshToken).toBe('refresh-1');
    expect(memorySessionStorage.entries.has(TOKEN_KEY)).toBe(false);
  });

  describe('when this tab returns from sign-in after another tab already signed in', () => {
    it('should use that session without exchanging its own code', async () => {
      const session = storeSessionFromAnotherTab();
      storeSignInState();
      openPage('?code=auth-code&state=state');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const service = new AuthService(sharedConfig, new ExecutionContext());

      await expect(service.authenticate(sharedConfig)).resolves.toBe(true);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.getToken()).toBe(session.token);
    });

    it('should forget the sign-in state, so a later load is not taken for a callback', async () => {
      storeSessionFromAnotherTab();
      storeSignInState();
      openPage('?code=auth-code&state=state');
      const service = new AuthService(sharedConfig, new ExecutionContext());
      expect(AuthService.isInOAuthCallback()).toBe(true);

      await service.authenticate(sharedConfig);

      expect(memorySessionStorage.entries.has(AUTH_STORAGE_KEYS.OAUTH_CONTEXT)).toBe(false);
      expect(AuthService.isInOAuthCallback()).toBe(false);
    });

    it('should take the code out of the address bar and restore the page the sign-in started from', async () => {
      const returnTo = `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`;
      storeSessionFromAnotherTab();
      storeSignInState(returnTo);
      openPage('?code=auth-code&state=state');
      const service = new AuthService(sharedConfig, new ExecutionContext());

      await service.authenticate(sharedConfig);

      expect(replaceState).toHaveBeenCalledWith({}, '', returnTo);
    });
  });
});
