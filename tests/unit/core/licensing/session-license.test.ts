import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionLicense } from '@/core/licensing/session-license';
import type { TokenInfo } from '@/core/auth/types';
import { UiPathConfig } from '@/core/config/config';
import { AUTH_STORAGE_KEYS } from '@/core/auth/constants';
import {
  AuthenticationError,
  AuthorizationError,
  HttpStatus,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '@/core/errors';
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
  return new SessionLicense(makeConfig(tenantName), mockApiClient, claims);
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

const BLOCKING_FAILURES = [
  { status: HttpStatus.BAD_REQUEST, error: new ValidationError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  { status: HttpStatus.FORBIDDEN, error: new AuthorizationError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  { status: HttpStatus.NOT_FOUND, error: new NotFoundError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  {
    status: HttpStatus.CONFLICT,
    error: new ValidationError({ message: TEST_CONSTANTS.ERROR_MESSAGE, statusCode: HttpStatus.CONFLICT }),
  },
];

const TRANSIENT_FAILURES = [
  { status: 'no response', error: new NetworkError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  { status: HttpStatus.UNAUTHORIZED, error: new AuthenticationError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  { status: HttpStatus.TOO_MANY_REQUESTS, error: new RateLimitError({ message: TEST_CONSTANTS.ERROR_MESSAGE }) },
  {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    error: new ServerError({ message: TEST_CONSTANTS.ERROR_MESSAGE, statusCode: HttpStatus.SERVICE_UNAVAILABLE }),
  },
  { status: 'a non-SDK error', error: createMockError(TEST_CONSTANTS.ERROR_MESSAGE) },
];

describe('SessionLicense', () => {
  beforeEach(() => {
    claims = new MemoryStore();
    post.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should not acquire when a user signs in', async () => {
    signedIn(LICENSE_TEST_CONSTANTS.USER_ID);
    await flush();

    expect(post).not.toHaveBeenCalled();
  });

  it('should acquire when a caller ensures it for the signed-in user, retrying the idempotent POST within one deadline', async () => {
    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE,
      undefined,
      {
        retry: expect.objectContaining({ retryMethods: ['POST'], maxRetryAfterMs: expect.any(Number) }),
        timeoutMs: expect.any(Number),
        signal: expect.any(AbortSignal),
      }
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should cut the whole acquisition short once its deadline passes', async () => {
    vi.useFakeTimers();
    post.mockImplementationOnce((_path: string, _body: unknown, options: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason));
      })
    );

    const ensuring = signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();
    await vi.runAllTimersAsync();

    await expect(ensuring).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not provision a personal robot'),
      expect.anything()
    );
    expect(claimFor()).toBeUndefined();
  });

  it('should clear the deadline once the acquisition settles', async () => {
    vi.useFakeTimers();

    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(vi.getTimerCount()).toBe(0);
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

  it.each(BLOCKING_FAILURES)('should warn, not reject, and keep the claim when the server refuses with $status', async ({ error }) => {
    post.mockRejectedValueOnce(error);

    await expect(signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure()).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not provision a personal robot'),
      error
    );
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it.each(TRANSIENT_FAILURES)('should warn, not reject, and leave the claim unwritten when the acquisition fails with $status', async ({ error }) => {
    post.mockRejectedValueOnce(error);

    await expect(signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure()).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not provision a personal robot'),
      error
    );
    expect(claimFor()).toBeUndefined();
  });

  it('should acquire again on the next page, not on token refresh, after a transient failure', async () => {
    post.mockRejectedValueOnce(
      new ServerError({ message: TEST_CONSTANTS.ERROR_MESSAGE, statusCode: HttpStatus.SERVICE_UNAVAILABLE })
    );
    const license = signedIn(LICENSE_TEST_CONSTANTS.USER_ID);

    await license.ensure();
    license.onTokenChange(tokenFor(LICENSE_TEST_CONSTANTS.USER_ID));
    await license.ensure();
    expect(post).toHaveBeenCalledTimes(1);

    await signedIn(LICENSE_TEST_CONSTANTS.USER_ID).ensure();

    expect(post).toHaveBeenCalledTimes(2);
    expect(claimFor()).toBe(LICENSE_TEST_CONSTANTS.USER_ID);
  });

  it('should not retry a refused acquisition on token refresh or reload until sign-out', async () => {
    post.mockRejectedValueOnce(
      new ValidationError({ message: TEST_CONSTANTS.ERROR_MESSAGE, statusCode: HttpStatus.CONFLICT })
    );
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
