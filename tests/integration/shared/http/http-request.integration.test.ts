import { describe, it, expect, beforeAll } from 'vitest';
import { getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { httpRequest } from '../../../../src/index';
import { HTTP_TEST_CONSTANTS } from '../../../utils/constants';

const modes: InitMode[] = ['v1'];

/** A path no application serves. What the environment answers with is not our concern. */
const UNKNOWN_PATH = '/this-path-does-not-exist-sdk-probe';

/**
 * `httpRequest` is not a service — it carries no UiPath auth and takes no SDK instance — so these
 * tests only need a reachable host, and the tenant base URL is the one guaranteed to exist.
 *
 * They assert the helper's contract, never a particular status from a particular endpoint: the
 * suite runs against several environments, and a WAF or identity config can change 404 into 403
 * without anything being wrong with the helper.
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

  it('reaches a live server and maps the response', async () => {
    // Whatever the environment answers with, it must arrive as a resolved response rather than a
    // thrown error, with `ok` agreeing with the status. Status-specific behaviour is covered
    // exhaustively in the unit tests, where the server can be controlled.
    const response = await httpRequest(baseUrl);

    expect(typeof response.status).toBe('number');
    expect(response.ok).toBe(response.status >= 200 && response.status < 300);
    expect(response.headers).toBeTypeOf('object');
    expect(typeof response.url).toBe('string');
    expect(response.url.length).toBeGreaterThan(0);
  });

  it('does not retry a status outside retryableStatusCodes', async () => {
    // An empty list makes every status non-retryable, so this holds whatever the server returns.
    const startedAt = Date.now();
    await httpRequest(`${baseUrl}${UNKNOWN_PATH}`, {
      retry: {
        maxRetries: 3,
        initialDelayMs: HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS,
        retryableStatusCodes: [],
      },
    });

    expect(Date.now() - startedAt).toBeLessThan(HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS);
  });

  it('retries a status listed as retryable, waiting between attempts', async () => {
    // Mark whatever the server actually returns as retryable, so the loop runs against a live
    // endpoint regardless of environment. One retry must cost at least one delay.
    const { status } = await httpRequest(`${baseUrl}${UNKNOWN_PATH}`);

    const startedAt = Date.now();
    await httpRequest(`${baseUrl}${UNKNOWN_PATH}`, {
      retry: {
        maxRetries: 1,
        initialDelayMs: HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS,
        retryableStatusCodes: [status],
        retryMethods: ['GET'],
      },
    });

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(HTTP_TEST_CONSTANTS.PROBE_RETRY_DELAY_MS);
  });

  it('sends query parameters and accepts a per-attempt timeout', async () => {
    const response = await httpRequest(baseUrl, {
      params: { probe: 'sdk-integration' },
      timeoutMs: HTTP_TEST_CONSTANTS.PROBE_TIMEOUT_MS,
    });

    expect(typeof response.status).toBe('number');
  });
});
