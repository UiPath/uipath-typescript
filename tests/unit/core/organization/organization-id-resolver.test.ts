import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OrganizationIdResolver,
  ORGANIZATION_LOOKUP_CLIENT_ID,
  ORGANIZATION_LOOKUP_REDIRECT_PATH,
} from '../../../../src/core/organization/organization-id-resolver';
import { ValidationError } from '../../../../src/core/errors';
import { TRACEPARENT, UIPATH_TRACEPARENT_ID } from '../../../../src/utils/constants/headers';
import { createServiceTestDependencies } from '../../../utils/setup';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { PLATFORM_TEST_CONSTANTS } from '../../../utils/constants/platform';

const ORGANIZATION_ID = PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID;
const OPAQUE_TOKEN = 'rt_opaque-personal-access-token';

const encodeSegment = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Builds an unsigned JWT whose payload carries the given claims. */
const jwtWith = (claims: Record<string, unknown>): string =>
  `${encodeSegment({ alg: 'none' })}.${encodeSegment(claims)}.signature`;

/** The redirect Identity issues to its login page — the GUID rides inside `returnUrl`. */
const loginRedirect = (organizationId: string): string => {
  const callback = `/identity_/connect/authorize/callback?response_type=code&acr_values=${encodeURIComponent(`tenant:${organizationId}`)}`;
  return `${TEST_CONSTANTS.BASE_URL}/identity_/ui/account/login?returnUrl=${encodeURIComponent(callback)}`;
};

const redirectTo = (location: string): Response => Response.redirect(location, 302);

/** The redirect Identity issues to its error page — details ride in a base64 JSON `errorId`. */
const identityErrorRedirect = (error: string, description: string): string => {
  const blob = Buffer.from(JSON.stringify({ Created: 1, Data: { Error: error, ErrorDescription: description } })).toString('base64url');
  return `${TEST_CONSTANTS.BASE_URL}/identity_/ui/error/error?errorId=${blob}`;
};

/** Creates a resolver over a config/token pair, defaulting to the opaque-token lookup path. */
const createResolver = (
  configOverrides: { organizationId?: string; orgName?: string } = {},
  token: string = OPAQUE_TOKEN
): OrganizationIdResolver => {
  const { config, tokenManager } = createServiceTestDependencies(configOverrides, {
    getToken: vi.fn().mockReturnValue(token),
  });
  return new OrganizationIdResolver(config, tokenManager);
};

describe('OrganizationIdResolver', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('configuration and token sources', () => {
    it('should return the organizationId supplied in the SDK configuration without any request', async () => {
      const resolver = createResolver({ organizationId: ORGANIZATION_ID });

      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should treat a GUID-shaped orgName as the organization id', async () => {
      const resolver = createResolver({ orgName: ORGANIZATION_ID });

      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should read the prt_id claim from a JWT access token', async () => {
      const resolver = createResolver({}, jwtWith({ sub: TEST_CONSTANTS.USER_ID, prt_id: ORGANIZATION_ID }));

      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should ignore a prt_id claim that is not a GUID and fall through to the lookup', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));
      const resolver = createResolver({}, jwtWith({ prt_id: 'not-a-guid' }));

      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('authorize-redirect lookup (opaque tokens)', () => {
    it('should resolve the organization id from the login redirect', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));

      await expect(createResolver().resolve()).resolves.toBe(ORGANIZATION_ID);
    });

    it('should start an anonymous authorize request for the configured organization and not follow redirects', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));

      await createResolver().resolve();

      const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const url = new URL(calledUrl);
      expect(url.origin + url.pathname).toBe(`${TEST_CONSTANTS.BASE_URL}/identity_/connect/authorize`);
      expect(url.searchParams.get('client_id')).toBe(ORGANIZATION_LOOKUP_CLIENT_ID);
      expect(url.searchParams.get('redirect_uri')).toBe(`${TEST_CONSTANTS.BASE_URL}/${ORGANIZATION_LOOKUP_REDIRECT_PATH}`);
      expect(url.searchParams.get('acr_values')).toBe(`tenantName:${TEST_CONSTANTS.ORGANIZATION_ID}`);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')?.length).toBeGreaterThanOrEqual(43);
      expect(init.redirect).toBe('manual');

      const headers = init.headers as Record<string, string>;
      expect(headers[TRACEPARENT]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      expect(headers[UIPATH_TRACEPARENT_ID]).toBe(headers[TRACEPARENT]);
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('should rebuild the request on the Identity host when an API gateway bounces it there', async () => {
      const identityHost = 'https://identity.test.uipath.com';
      fetchSpy
        .mockResolvedValueOnce(redirectTo(`${identityHost}/identity_/connect/authorize?client_id=${ORGANIZATION_LOOKUP_CLIENT_ID}`))
        .mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));

      await expect(createResolver().resolve()).resolves.toBe(ORGANIZATION_ID);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const rebuilt = new URL(fetchSpy.mock.calls[1][0] as string);
      expect(rebuilt.origin + rebuilt.pathname).toBe(`${identityHost}/identity_/connect/authorize`);
      // The redirect URI must belong to the host that will validate it, not the gateway we started on
      expect(rebuilt.searchParams.get('redirect_uri')).toBe(`${identityHost}/${ORGANIZATION_LOOKUP_REDIRECT_PATH}`);
      expect(rebuilt.searchParams.get('acr_values')).toBe(`tenantName:${TEST_CONSTANTS.ORGANIZATION_ID}`);
    });

    it('should reject with the decoded Identity error when the lookup request is rejected', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(identityErrorRedirect('invalid_request', 'Invalid redirect_uri')));

      const attempt = createResolver().resolve();
      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(/invalid_request \(Invalid redirect_uri\)/);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject with the plain error code when the redirect carries one', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(`${TEST_CONSTANTS.BASE_URL}/identity_/web/?errorCode=invalid_request`));

      const attempt = createResolver().resolve();
      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(/invalid_request/);
    });

    it('should reject with ValidationError when Identity reports the organization as unregistered', async () => {
      fetchSpy.mockResolvedValueOnce(
        redirectTo(`${TEST_CONSTANTS.BASE_URL}/portal_/unregistered?serviceType=identity&organizationName=${TEST_CONSTANTS.ORGANIZATION_ID}`)
      );

      await expect(createResolver().resolve()).rejects.toBeInstanceOf(ValidationError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject with the response status when the response carries no redirect', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('<html>Just a moment…</html>', { status: 403 }));

      const attempt = createResolver().resolve();
      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(/HTTP 403: <html>Just a moment…<\/html>/);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should retry a transient Identity failure before reading the redirect', async () => {
      vi.useFakeTimers();
      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));

      const attempt = createResolver().resolve();
      await vi.runAllTimersAsync();

      await expect(attempt).resolves.toBe(ORGANIZATION_ID);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should give up after the redirect hop limit', async () => {
      fetchSpy.mockResolvedValue(redirectTo(`${TEST_CONSTANTS.BASE_URL}/identity_/connect/authorize?again=1`));

      const attempt = createResolver().resolve();
      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(/gave up after 3 redirects/);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('memoization', () => {
    it('should resolve once and reuse the result', async () => {
      fetchSpy.mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));
      const resolver = createResolver();

      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);
      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not cache a failed attempt so the next call retries', async () => {
      // Identity reported the organization as unregistered: a definitive answer, not retried
      fetchSpy
        .mockResolvedValueOnce(redirectTo(`${TEST_CONSTANTS.BASE_URL}/portal_/unregistered`))
        .mockResolvedValueOnce(redirectTo(loginRedirect(ORGANIZATION_ID)));
      const resolver = createResolver();

      await expect(resolver.resolve()).rejects.toBeInstanceOf(ValidationError);
      await expect(resolver.resolve()).resolves.toBe(ORGANIZATION_ID);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
