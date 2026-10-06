import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '../../../utils/session-storage';
import { AuthService } from '../../../../src/core/auth/service';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { AUTH_STORAGE_KEYS } from '../../../../src/core/auth/constants';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

vi.mock('../../../../src/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

describe('AuthService OAuth sign-in start (browser)', () => {
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  let windowStub: { location: { href: string; search: string }; document: object };

  beforeEach(() => {
    memorySessionStorage.reset();
    windowStub = { location: { href: '', search: '' }, document: {} };
    vi.stubGlobal('window', windowStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should store the sign-in state and redirect to the authorization URL', async () => {
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(memorySessionStorage.entries.get(AUTH_STORAGE_KEYS.CODE_VERIFIER)).toBeTruthy();
    expect(JSON.parse(memorySessionStorage.entries.get(AUTH_STORAGE_KEYS.OAUTH_CONTEXT)).clientId).toBe(TEST_CONSTANTS.CLIENT_ID);
    expect(windowStub.location.href).toContain(TEST_CONSTANTS.CLIENT_ID);
  });

  it('should not redirect when the sign-in state cannot be stored', async () => {
    memorySessionStorage.setItem.mockImplementationOnce(() => {
      throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
    });
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).rejects.toThrow('Could not store the OAuth sign-in state');

    expect(windowStub.location.href).toBe('');
  });
});
