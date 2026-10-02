import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionLicense, clearSessionLicenses } from '@/core/licensing/session-license';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { ApiClient } from '@/core/http/api-client';
import { UiPathConfig } from '@/core/config/config';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '@/utils/constants/endpoints';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { createTestJwt } from '@tests/utils/jwt';
import { createMockRawStudioWebLicense } from '@tests/utils/mocks/functions';
import { FUNCTION_LICENSE_TEST_CONSTANTS } from '@tests/utils/constants/functions';
import { createMockError } from '@tests/utils/mocks/core';
import { createMockApiClient } from '@tests/utils/setup';

vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/http/api-client');

const mockApiClient = createMockApiClient();
const post = mockApiClient.post;

function makeConfig(tenantName: string = TEST_CONSTANTS.TENANT_ID): UiPathConfig {
  return new UiPathConfig({
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName,
  });
}

function signIn(tenantName?: string): { tokenManager: TokenManager; sessionLicense: SessionLicense } {
  const context = new ExecutionContext();
  const config = makeConfig(tenantName);
  const tokenManager = new TokenManager(context, config, false);
  const sessionLicense = new SessionLicense(config, context, tokenManager);
  return { tokenManager, sessionLicense };
}

function tokenFor(userId: string): { token: string; type: 'oauth' } {
  return { token: createTestJwt({ sub: userId }), type: 'oauth' };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SessionLicense', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    clearSessionLicenses();
    post.mockReset().mockResolvedValue(createMockRawStudioWebLicense());
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should acquire once when a user signs in, retrying the idempotent POST', async () => {
    const { tokenManager } = signIn();

    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE,
      undefined,
      { retry: expect.objectContaining({ retryMethods: ['POST'] }) }
    );
  });

  it('should acquire for a token already held when constructed', async () => {
    const context = new ExecutionContext();
    const config = makeConfig();
    const tokenManager = new TokenManager(context, config, false);
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));

    const sessionLicense = new SessionLicense(config, context, tokenManager);
    await flush();

    expect(sessionLicense).toBeInstanceOf(SessionLicense);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should not acquire again when the token is refreshed for the same user', async () => {
    const { tokenManager } = signIn();

    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire again when a different user signs in', async () => {
    const { tokenManager } = signIn();

    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.OTHER_USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should acquire again after a logout and a new sign-in', async () => {
    const { tokenManager } = signIn();

    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();
    tokenManager.clearToken();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should reuse the license held in session storage after a page reload', async () => {
    signIn().tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    clearSessionLicenses();
    signIn().tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should share one acquisition across SDK instances for the same sign-in', async () => {
    let resolve!: (value: unknown) => void;
    post.mockReturnValue(new Promise((r) => { resolve = r; }));

    signIn().tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    signIn().tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    resolve(createMockRawStudioWebLicense());
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire separately per tenant', async () => {
    signIn().tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    signIn(FUNCTION_LICENSE_TEST_CONSTANTS.OTHER_TENANT_NAME).tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should not acquire for an opaque token', async () => {
    signIn().tokenManager.setToken({ token: FUNCTION_LICENSE_TEST_CONSTANTS.OPAQUE_TOKEN, type: 'oauth' });
    await flush();

    expect(post).not.toHaveBeenCalled();
  });

  it('should warn and not block when the acquisition fails', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const { tokenManager } = signIn();

    expect(() => tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID))).not.toThrow();
    await flush();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not acquire a Studio Web license'),
      expect.anything()
    );
  });

  it('should not remember a failed acquisition', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const { tokenManager, sessionLicense } = signIn();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    const license = await sessionLicense.acquire();

    expect(post).toHaveBeenCalledTimes(2);
    expect(license?.isLicensed).toBe(true);
  });

  it('should acquire afresh when asked to refresh', async () => {
    const { tokenManager, sessionLicense } = signIn();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    await sessionLicense.acquire(true);

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should return the held license without a request', async () => {
    const { tokenManager, sessionLicense } = signIn();
    tokenManager.setToken(tokenFor(FUNCTION_LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    const license = await sessionLicense.acquire();

    expect(post).toHaveBeenCalledTimes(1);
    expect(license?.robotType).toBeDefined();
  });
});
