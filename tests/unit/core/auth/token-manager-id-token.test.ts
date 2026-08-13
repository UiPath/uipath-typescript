import { describe, it, expect, vi, afterEach } from 'vitest';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import type { Config } from '@/core/config/config';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// Plain (non-embedded, non-Action-Center) environment
vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

function makeOAuthManager() {
  const context = new ExecutionContext();
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };
  return new TokenManager(context, config, true);
}

describe('TokenManager — id_token handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the id_token set via setToken', () => {
    const manager = makeOAuthManager();
    manager.setToken({ token: 'access', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

    expect(manager.getIdToken()).toBe(TEST_CONSTANTS.ID_TOKEN);
  });

  it('returns undefined when the token has no id_token', () => {
    const manager = makeOAuthManager();
    manager.setToken({ token: 'access', type: 'oauth' });

    expect(manager.getIdToken()).toBeUndefined();
  });

  it('clears the id_token on clearToken', () => {
    const manager = makeOAuthManager();
    manager.setToken({ token: 'access', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

    manager.clearToken();

    expect(manager.getIdToken()).toBeUndefined();
  });

  it('adopts a new id_token when the refresh response includes one', async () => {
    const manager = makeOAuthManager();
    manager.setToken({ token: 'access', type: 'oauth', refreshToken: 'refresh-1', idToken: TEST_CONSTANTS.ID_TOKEN });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'access-2', token_type: 'Bearer', expires_in: 3600,
        refresh_token: 'refresh-2', id_token: TEST_CONSTANTS.ID_TOKEN_REFRESHED
      }))
    );

    await manager.refreshAccessToken();

    expect(manager.getIdToken()).toBe(TEST_CONSTANTS.ID_TOKEN_REFRESHED);
  });

  it('preserves the previous id_token when the refresh response omits one', async () => {
    const manager = makeOAuthManager();
    manager.setToken({ token: 'access', type: 'oauth', refreshToken: 'refresh-1', idToken: TEST_CONSTANTS.ID_TOKEN });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'access-2', token_type: 'Bearer', expires_in: 3600, refresh_token: 'refresh-2'
      }))
    );

    await manager.refreshAccessToken();

    expect(manager.getIdToken()).toBe(TEST_CONSTANTS.ID_TOKEN);
  });
});
