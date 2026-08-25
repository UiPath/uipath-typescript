import { describe, it, expect, beforeAll } from 'vitest';
import { getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { httpRequest } from '../../../../src/index';
import { HTTP_TEST_CONSTANTS } from '../../../utils/constants';

const modes: InitMode[] = ['v1'];

const OPENID_CONFIGURATION = '/identity_/.well-known/openid-configuration';
const UNKNOWN_WELL_KNOWN = '/identity_/.well-known/does-not-exist';
const PROTECTED_ENDPOINT = '/identity_/connect/userinfo';

/**
 * `httpRequest` is not a service — it carries no UiPath auth and takes no SDK instance — so these
 * tests only need reachable URLs, not `getServices()`. The tenant base URL is used because it is
 * guaranteed to exist in every environment the suite runs against, and the endpoints below answer
 * without credentials and without redirecting.
 */
describe.each(modes)('httpRequest - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let baseUrl!: string;

  beforeAll(() => {
    const { baseUrl: configuredBaseUrl } = getTestConfig();
    if (!configuredBaseUrl) {
      throw new Error('UIPATH_BASE_URL must be configured to exercise the HTTP helper');
    }
    baseUrl = configuredBaseUrl.replace(/\/$/, '');
  });

  it('returns a successful response with a parsed body and headers', async () => {
    const response = await httpRequest(`${baseUrl}${OPENID_CONFIGURATION}`);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_OK);
    expect(response.headers['content-type']).toContain('json');
    expect(response.data).toMatchObject({ issuer: expect.any(String) });
  });

  it('resolves with the error status instead of throwing when the server rejects the call', async () => {
    // No Authorization header is sent, so this protected endpoint answers 401. The helper must
    // still resolve — that is the contract separating it from the SDK's service methods, which
    // throw on any non-2xx.
    const response = await httpRequest(`${baseUrl}${PROTECTED_ENDPOINT}`);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_UNAUTHORIZED);
  });

  it('returns a non-retryable status after a single attempt even with retries enabled', async () => {
    const startedAt = Date.now();
    const response = await httpRequest(`${baseUrl}${UNKNOWN_WELL_KNOWN}`, {
      retry: { maxRetries: 3, initialDelayMs: HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS },
    });

    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    // A retried call would have slept at least 2s before the second attempt
    expect(Date.now() - startedAt).toBeLessThan(HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS);
  });

  it('sends query parameters and honours a per-attempt timeout', async () => {
    const response = await httpRequest(`${baseUrl}${OPENID_CONFIGURATION}`, {
      params: { probe: 'sdk-integration' },
      timeoutMs: HTTP_TEST_CONSTANTS.PROBE_TIMEOUT_MS,
    });

    expect(response.ok).toBe(true);
    expect(response.url).toContain('probe=sdk-integration');
  });
});
