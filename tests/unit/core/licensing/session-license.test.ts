import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionLicense } from '@/core/licensing/session-license';
import { ApiClient } from '@/core/http/api-client';
import type { TokenInfo } from '@/core/auth/types';
import type { IUiPath } from '@/core/types';
import { FunctionService } from '@/services/orchestrator/functions/functions';
import { ProcessService } from '@/services/orchestrator/processes/processes';
import { JobService } from '@/services/orchestrator/jobs/jobs';
import { ProcessInstancesService } from '@/services/maestro/processes/process-instances';
import { CaseInstancesService } from '@/services/maestro/cases/case-instances';
import { UiPathConfig } from '@/core/config/config';
import { AUTH_STORAGE_KEYS } from '@/core/auth/constants';
import { MemoryStore } from '@/utils/storage/memory-store';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '@/utils/constants/endpoints';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { LICENSE_TEST_CONSTANTS } from '@tests/utils/constants/licensing';
import { createTestJwt } from '@tests/utils/jwt';
import { createMockError } from '@tests/utils/mocks/core';
import { createMockApiClient, createServiceTestDependencies } from '@tests/utils/setup';

vi.mock('@/core/http/api-client');

const JOB_STARTING_CLIENTS: Array<[string, new (instance: IUiPath) => object]> = [
  ['Functions', FunctionService],
  ['Processes', ProcessService],
  ['Jobs', JobService],
  ['ProcessInstances', ProcessInstancesService],
  ['CaseInstances', CaseInstancesService],
];

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

function signedIn(userId: string, tenantName?: string): SessionLicense {
  const license = createLicense(tenantName);
  license.onTokenChange(tokenFor(userId));
  return license;
}

function tokenFor(userId: string): TokenInfo {
  return { token: createTestJwt({ sub: userId }), type: 'oauth' };
}

function claimFor(tenantName: string = TEST_CONSTANTS.TENANT_ID): string | undefined {
  const config = makeConfig(tenantName);
  return claims.read<string>(`${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${config.baseUrl}/${config.orgName}/${config.tenantName}`);
}

function holdNextPost(): () => void {
  let resolvePost!: () => void;
  post.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePost = resolve; }));
  return () => resolvePost();
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

  it('should not acquire when a user signs in', async () => {
    signedIn(LICENSE_TEST_CONSTANTS.USER_ID);
    await flush();

    expect(post).not.toHaveBeenCalled();
  });

  it('should acquire when a caller ensures it for the signed-in user, retrying the idempotent POST with a per-attempt timeout', async () => {
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE,
      undefined,
      { retry: expect.objectContaining({ retryMethods: ['POST'] }), timeoutMs: expect.any(Number) }
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should resolve at once when no user is signed in', async () => {
    await expect(createLicense().ensure()).resolves.toBeUndefined();

    expect(post).not.toHaveBeenCalled();
  });

  it('should hand every caller the same request for the signed-in user, in flight or settled', async () => {
    const releasePost = holdNextPost();
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    const first = license.ensure();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    const whileInFlight = license.ensure();
    releasePost();
    await first;
    const afterSettled = license.ensure();

    expect(whileInFlight).toBe(first);
    expect(afterSettled).toBe(first);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire again when a different user signs in, keeping only their claim', async () => {
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    await license.ensure();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.OTHER_USER_ID));
    await license.ensure();

    expect(post).toHaveBeenCalledTimes(2);
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.OTHER_USER_ID);
  });

  it("should acquire for a user who signs in while the previous user's request is in flight", async () => {
    const releaseFirstPost = holdNextPost();
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    void license.ensure();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.OTHER_USER_ID));
    const acquiring = license.ensure();
    releaseFirstPost();
    await acquiring;
    await license.ensure();

    expect(post).toHaveBeenCalledTimes(2);
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.OTHER_USER_ID);
  });

  it('should release the claim on logout and acquire again on the next sign-in', async () => {
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    await license.ensure();
    license.onTokenChange(undefined);
    expect(claimFor()).toBeUndefined();

    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await license.ensure();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should keep the claim when no token is held yet', async () => {
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    const reloaded = createLicense();
    reloaded.onTokenChange(undefined);
    reloaded.onTokenChange({ token: '', type: 'secret' });

    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not acquire again after a page reload for the same user', async () => {
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should acquire again on the next page when a page unload cut the request short', async () => {
    post.mockReturnValueOnce(new Promise(() => {}));
    void signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();
    expect(claimFor()).toBeUndefined();

    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(post).toHaveBeenCalledTimes(2);
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should acquire separately per tenant', async () => {
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID, LICENSE_TEST_CONSTANTS.OTHER_TENANT_NAME).ensure();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should not acquire for a token without a user', async () => {
    const license = createLicense();
    license.onTokenChange({ token: LICENSE_TEST_CONSTANTS.OPAQUE_TOKEN, type: 'oauth' });

    await license.ensure();

    expect(post).not.toHaveBeenCalled();
  });

  it('should warn, not reject, and keep the claim when the acquisition fails', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

    await expect(signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure()).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not provision a personal robot'),
      expect.anything()
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not retry a failed acquisition on token refresh or reload until sign-out', async () => {
    post.mockRejectedValueOnce(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    await license.ensure();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await license.ensure();
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();
    expect(post).toHaveBeenCalledTimes(1);

    license.onTokenChange(undefined);
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await license.ensure();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should settle once the acquisition completes, claiming the user only then', async () => {
    const releasePost = holdNextPost();
    let settled = false;
    const ensuring = signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure().then(() => { settled = true; });

    await flush();
    expect(settled).toBe(false);
    expect(claimFor()).toBeUndefined();

    releasePost();
    await ensuring;

    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not claim a user who signed out while the request was in flight', async () => {
    const releasePost = holdNextPost();
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);
    const ensuring = license.ensure();

    license.onTokenChange(undefined);
    releasePost();
    await ensuring;

    expect(claimFor()).toBeUndefined();
  });
});

describe('SessionLicense in clients that can start a job', () => {
  beforeEach(() => {
    claims = new MemoryStore();
    vi.mocked(ApiClient).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(JOB_STARTING_CLIENTS)('should be ensured before each request of a %s client, not when it is created', async (_, Client) => {
    const license = createLicense();
    const ensure = vi.spyOn(license, 'ensure').mockResolvedValue(undefined);
    const { instance } = createServiceTestDependencies({ sessionLicense: license });

    const client = new Client(instance);
    expect(client).toBeDefined();
    expect(ensure).not.toHaveBeenCalled();

    const [, , , clientConfig] = vi.mocked(ApiClient).mock.calls[0];
    await clientConfig?.beforeSend?.();

    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it.each(JOB_STARTING_CLIENTS)('should not hold the requests of a %s client when the SDK holds its own credential', (_, Client) => {
    const { instance } = createServiceTestDependencies();

    const client = new Client(instance);
    expect(client).toBeDefined();

    const [, , , clientConfig] = vi.mocked(ApiClient).mock.calls[0];
    expect(clientConfig?.beforeSend).toBeUndefined();
  });
});
