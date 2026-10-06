import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionLicense } from '@/core/licensing/session-license';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { ApiClient } from '@/core/http/api-client';
import { UiPathConfig } from '@/core/config/config';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { LICENSE_TEST_CONSTANTS } from '@tests/utils/constants/licensing';
import { createTestJwt } from '@tests/utils/jwt';
import { createMockError } from '@tests/utils/mocks/core';
import { createMockApiClient } from '@tests/utils/setup';

vi.mock('@/utils/storage/session-store', () => ({ sessionStore: undefined }));
vi.mock('@/core/http/api-client');

const mockApiClient = createMockApiClient();
const post = mockApiClient.post;
const sessionLicenses: SessionLicense[] = [];

function signIn(): TokenManager {
  const context = new ExecutionContext();
  const config = new UiPathConfig({
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
  });
  const tokenManager = new TokenManager(context, config, false);
  sessionLicenses.push(new SessionLicense(config, context, tokenManager));
  return tokenManager;
}

function tokenFor(userId: string): { token: string; type: 'oauth' } {
  return { token: createTestJwt({ sub: userId }), type: 'oauth' };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SessionLicense without a session store', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue(undefined);
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
  });

  afterEach(() => {
    sessionLicenses.length = 0;
    vi.clearAllMocks();
  });

  it('should not re-acquire on refresh after a success', async () => {
    const tokenManager = signIn();

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();
    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should retry on refresh after a failure', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const tokenManager = signIn();

    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();
    tokenManager.setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should acquire once per SDK instance', async () => {
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    signIn().setToken(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });
});
