import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionLicense } from '@/core/licensing/session-license';
import type { ApiClient } from '@/core/http/api-client';
import type { TokenInfo } from '@/core/auth/types';
import { UiPathConfig } from '@/core/config/config';
import { AUTH_STORAGE_KEYS } from '@/core/auth/constants';
import { MemoryStore } from '@/utils/storage/memory-store';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '@/utils/constants/endpoints';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { LICENSE_TEST_CONSTANTS } from '@tests/utils/constants/licensing';
import { createTestJwt } from '@tests/utils/jwt';
import { createMockError } from '@tests/utils/mocks/core';
import { createMockApiClient } from '@tests/utils/setup';

const mockApiClient = createMockApiClient();
const post = mockApiClient.post;

let claims: MemoryStore;

function makeConfig(tenantName: string = TEST_CONSTANTS.TENANT_ID): UiPathConfig {
  return new UiPathConfig({
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName,
  });
}

function createLicense(tenantName?: string): SessionLicense {
  return new SessionLicense(makeConfig(tenantName), mockApiClient as unknown as ApiClient, claims);
}

function tokenFor(userId: string): TokenInfo {
  return { token: createTestJwt({ sub: userId }), type: 'oauth' };
}

function claimFor(tenantName: string = TEST_CONSTANTS.TENANT_ID): string | undefined {
  const config = makeConfig(tenantName);
  return claims.read<string>(`${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${config.baseUrl}/${config.orgName}/${config.tenantName}`);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SessionLicense', () => {
  beforeEach(() => {
    claims = new MemoryStore();
    post.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should acquire once when a user signs in, retrying the idempotent POST', async () => {
    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE,
      undefined,
      { retry: expect.objectContaining({ retryMethods: ['POST'] }) }
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not acquire again when the token is refreshed for the same user', async () => {
    const license = createLicense();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire again when a different user signs in, keeping only their claim', async () => {
    const license = createLicense();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.OTHER_USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.OTHER_USER_ID);
  });

  it('should release the claim on logout and acquire again on the next sign-in', async () => {
    const license = createLicense();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    license.onTokenChange(undefined);
    expect(claimFor()).toBeUndefined();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should keep the claim when no token is held yet', async () => {
    const license = createLicense();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    const reloaded = createLicense();
    reloaded.onTokenChange(undefined);
    reloaded.onTokenChange({ token: '', type: 'secret' });

    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not acquire again after a page reload for the same user', async () => {
    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire once across SDK instances signing in while the request is in flight', () => {
    post.mockReturnValue(new Promise(() => {}));

    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire separately per tenant', async () => {
    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    createLicense(LICENSE_TEST_CONSTANTS.OTHER_TENANT_NAME).onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should not acquire for a token without a user', async () => {
    createLicense().onTokenChange({ token: LICENSE_TEST_CONSTANTS.OPAQUE_TOKEN, type: 'oauth' });
    await flush();

    expect(post).not.toHaveBeenCalled();
  });

  it('should warn, not block, and keep the claim when the acquisition fails', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const license = createLicense();

    expect(() => license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID))).not.toThrow();
    await expect(license.settled()).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not provision a personal robot'),
      expect.anything()
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not retry a failed acquisition on token refresh or reload until sign-out', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const license = createLicense();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await license.settled();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    createLicense().onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    expect(post).toHaveBeenCalledTimes(1);

    license.onTokenChange(undefined);
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await flush();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should settle once the acquisition completes', async () => {
    let resolvePost!: () => void;
    post.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePost = resolve; }));
    const license = createLicense();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    let settled = false;
    const settling = license.settled().then(() => { settled = true; });

    await flush();
    expect(settled).toBe(false);

    resolvePost();
    await settling;

    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });
  it('should settle at once when nothing was acquired', async () => {
    await expect(createLicense().settled()).resolves.toBeUndefined();

    expect(post).not.toHaveBeenCalled();
  });
});