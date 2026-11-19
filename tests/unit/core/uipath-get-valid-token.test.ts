import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UiPath } from '@/core/uipath';
import { AuthenticationError } from '@/core/errors';
import { TOKEN_EXPIRY_BUFFER_MS } from '@/core/auth/constants';
import { IDENTITY_ENDPOINTS } from '@/utils/constants/endpoints';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { clearContractEnv } from '@tests/utils/env-contract';

// The auth service and token manager are the real ones here, so these tests cover the whole path
// behind the public method. Only the network is replaced.
const REFRESH_TOKEN = 'refresh-1';
const ROTATED_REFRESH_TOKEN = 'refresh-2';
const HOUR_MS = 60 * 60 * 1000;

const baseConfig = {
  baseUrl: TEST_CONSTANTS.BASE_URL,
  orgName: TEST_CONSTANTS.ORGANIZATION_ID,
  tenantName: TEST_CONSTANTS.TENANT_ID,
};

function createOAuthSdk(): UiPath {
  return new UiPath({
    ...baseConfig,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  });
}

function mockRefreshResponse() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({
      access_token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: ROTATED_REFRESH_TOKEN,
    }))
  );
}

describe('UiPath.getValidToken()', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    // Keeps a UIPATH_* variable on the machine from configuring the instances built here.
    restoreEnv = clearContractEnv();
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('should return the secret as it is for secret-based authentication', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sdk = new UiPath({ ...baseConfig, secret: TEST_CONSTANTS.CLIENT_SECRET });

    await expect(sdk.getValidToken()).resolves.toBe(TEST_CONSTANTS.CLIENT_SECRET);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should return the current token without a request while no renewal is due', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      expiresAt: new Date(Date.now() + HOUR_MS),
    });

    await expect(sdk.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should renew a token that is about to expire and return the new one', async () => {
    const fetchSpy = mockRefreshResponse();
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_BUFFER_MS / 2),
    });

    await expect(sdk.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);

    const [url, init] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(String(init?.body));
    expect(String(url)).toContain(IDENTITY_ENDPOINTS.TOKEN);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe(REFRESH_TOKEN);
    // getToken() reads the renewed token afterwards: both getters share one session.
    expect(sdk.getToken()).toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
  });

  it('should renew an expired token and return the new one', async () => {
    mockRefreshResponse();
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(sdk.getToken()).toBeUndefined();
    await expect(sdk.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
  });

  it('should share one renewal between calls made at the same time', async () => {
    const fetchSpy = mockRefreshResponse();
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      expiresAt: new Date(Date.now() - 1000),
    });

    const tokens = await Promise.all([sdk.getValidToken(), sdk.getValidToken(), sdk.getValidToken()]);

    expect(tokens).toEqual(Array(3).fill(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject with an AuthenticationError when the instance has no configuration', async () => {
    const sdk = new UiPath();

    await expect(sdk.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('should reject with an AuthenticationError before sign-in', async () => {
    const sdk = createOAuthSdk();

    await expect(sdk.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('should reject with an AuthenticationError when an expired token has no refresh token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(sdk.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should reject with an AuthenticationError when the renewal is rejected', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400, headers: { 'content-type': 'application/json' } })
    );
    const sdk = createOAuthSdk();
    sdk.updateToken({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(sdk.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
  });
});
