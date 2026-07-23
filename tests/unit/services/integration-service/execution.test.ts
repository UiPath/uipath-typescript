import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import { ValidationError } from '../../../../src/core/errors';
import { createServiceTestDependencies } from '../../../utils/setup';
import { IS_TEST_CONSTANTS } from '../../../utils/mocks';
import { FOLDER_KEY, TRACEPARENT, UIPATH_TRACEPARENT_ID } from '../../../../src/utils/constants/headers';

const OBJECT_NAME = 'tickets';

const buildResponse = (init: {
  status?: number;
  statusText?: string;
  body?: string;
  headers?: Record<string, string>;
}) => {
  const status = init.status ?? 200;
  return new Response(init.body ?? '', {
    status,
    statusText: init.statusText ?? 'OK',
    headers: init.headers ?? { 'content-type': 'application/json' },
  });
};

describe('execute', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('executes a GET against the connection passthrough endpoint', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: JSON.stringify([{ id: 1 }]) }));

    const result = await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain(`/elements_/v3/element/instances/${IS_TEST_CONSTANTS.CONNECTION_ID}/${OBJECT_NAME}`);
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: expect.stringMatching(/^Bearer /) });
    expect(init.body).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body).toEqual([{ id: 1 }]);
  });

  it('serializes JSON body for POST', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: JSON.stringify({ id: 42 }) }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
      body: { subject: 'New' },
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"subject":"New"}');
  });

  it('appends query params to the URL', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      queryParams: { limit: '10', status: 'open' },
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('limit=10');
    expect(url).toContain('status=open');
  });

  it('sends folder header when folderKey is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
  });

  it('sends distributed-tracing headers on every request', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    const [, init] = fetchSpy.mock.calls[0];
    // W3C traceparent: 00-<32 hex>-<16 hex>-01, mirrored on the UiPath header
    expect(init.headers[TRACEPARENT]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(init.headers[UIPATH_TRACEPARENT_ID]).toBe(init.headers[TRACEPARENT]);
  });

  it('returns full envelope on non-2xx without throwing', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(
      buildResponse({
        status: 400,
        statusText: 'Bad Request',
        body: JSON.stringify({ error: 'invalid' }),
      }),
    );

    const result = await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.statusText).toBe('Bad Request');
    expect(result.body).toEqual({ error: 'invalid' });
  });

  it('returns raw text when response body is not JSON', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(
      buildResponse({ body: 'plain text', headers: { 'content-type': 'text/plain' } }),
    );

    const result = await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    expect(result.body).toBe('plain text');
  });

  it('preserves "/" separators in a multi-segment objectName', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, 'curated_get_issue/APPS-34728');

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain(
      `/elements_/v3/element/instances/${IS_TEST_CONSTANTS.CONNECTION_ID}/curated_get_issue/APPS-34728`,
    );
    expect(url).not.toContain('%2F');
  });

  it('encodes reserved characters within each path segment', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, 'curated_get_issue/APPS 347#28');

    const [url] = fetchSpy.mock.calls[0];
    // separator stays literal, but the space and "#" inside the segment are escaped
    expect(url).toContain('/curated_get_issue/APPS%20347%2328');
  });

  it('throws ValidationError when connectionId is missing', async () => {
    const { instance } = createServiceTestDependencies();
    await expect(
      execute(instance, '', OBJECT_NAME),
    ).rejects.toThrow(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws ValidationError when objectName is missing', async () => {
    const { instance } = createServiceTestDependencies();
    await expect(
      execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, ''),
    ).rejects.toThrow(ValidationError);
  });
});
