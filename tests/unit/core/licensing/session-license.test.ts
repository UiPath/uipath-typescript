import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '@tests/utils/session-storage';
import { SessionLicense } from '@/core/licensing/session-license';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { ApiClient } from '@/core/http/api-client';
import { UiPathConfig } from '@/core/config/config';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '@/utils/constants/endpoints';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { LICENSE_TEST_CONSTANTS } from '@tests/utils/constants/licensing';
import { createTestJwt } from '@tests/utils/jwt';
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

const sessionLicenses: SessionLicense[] = [];

function signIn(tenantName?: string): TokenManager {
  const context = new ExecutionContext();
  const config = makeConfig(tenantName);
  const tokenManager = new TokenManager(context, config, false);
  sessionLicenses.push(new SessionLicense(config, context, tokenManager));
  return tokenManager;
}

function tokenFor(userId: string): { token: string; type: 'oauth' } {
  return { token: createTestJwt({ sub: userId }), type: 'oauth' };
}

const failing = () => {
  throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SessionLicense', () => {
  beforeEach(() => {
    memorySessionStorage.reset();
    post.mockReset().mockResolvedValue(undefined);
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
  });

  afterEach(() => {
    sessionLicenses.length = 0;
    vi.clearAllMocks();
  });

  it('should acquire once when a user signs in, retrying the idempotent POST', async () => {
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
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
    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));

    sessionLicenses.push(new SessionLicense(config, context, tokenManager));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should not acquire again when the token is refreshed for the same user', async () => {
    const tokenManager = signIn();

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire again when a different user signs in, keeping only their claim', async () => {
    const tokenManager = signIn();

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.OTHER_USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
    expect([...memorySessionStorage.entries.values()]).toEqual([JSON.stringify(LICENSE_TEST_CONSTANTS.OTHER_USER_ID)]);
  });

  it('should release the claim on logout and acquire again on the next sign-in', async () => {
    const tokenManager = signIn();

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    tokenManager.clearToken();
    expect(memorySessionStorage.entries.size).toBe(0);

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should not acquire again after a page reload for the same user', async () => {
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire once across SDK instances signing in while the request is in flight', () => {
    post.mockReturnValue(new Promise(() => {}));

    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire separately per tenant', async () => {
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    signIn(LICENSE_TEST_CONSTANTS.OTHER_TENANT_NAME).setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should not acquire for a token without a user', async () => {
    signIn().setToken({ token: LICENSE_TEST_CONSTANTS.OPAQUE_TOKEN, type: 'oauth' });
    await flush();

    expect(post).not.toHaveBeenCalled();
  });

  it('should warn, not block, and release the claim when the acquisition fails', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

    expect(() => signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID))).not.toThrow();
    await flush();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not acquire a Studio Web license'),
      expect.anything()
    );
    expect(memorySessionStorage.entries.size).toBe(0);

    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should acquire per SDK instance when the claim cannot be stored', async () => {
    memorySessionStorage.setItem.mockImplementationOnce(failing).mockImplementationOnce(failing);

    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });
});
