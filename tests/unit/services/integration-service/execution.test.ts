import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import { ValidationError } from '../../../../src/core/errors';
import { createServiceTestDependencies } from '../../../utils/setup';
import { IS_TEST_CONSTANTS } from '../../../utils/mocks';
import { HTTP_TEST_CONSTANTS } from '../../../utils/constants';
import {
  FOLDER_ID,
  FOLDER_KEY,
  FOLDER_PATH_ENCODED,
  TRACEPARENT,
  UIPATH_TRACEPARENT_ID,
} from '../../../../src/utils/constants/headers';

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

  it('sends the folder ID header when folderId is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderId: IS_TEST_CONSTANTS.FOLDER_ID,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_ID]).toBe(String(IS_TEST_CONSTANTS.FOLDER_ID));
  });

  it('sends the encoded folder path header when folderPath is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_PATH_ENCODED]).toBe(IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE);
  });

  it('falls back to the init-time folder key when no folder context is provided', async () => {
    const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
  });

  it('sends no folder header when neither options nor init supply folder context', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBeUndefined();
    expect(init.headers[FOLDER_ID]).toBeUndefined();
    expect(init.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
  });

  it('does not leak folder context into the query string', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      queryParams: { limit: '10' },
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('limit=10');
    expect(url).not.toContain('folderPath');
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

  describe('retry', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('makes a single attempt on a retryable status when no retry options are supplied', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{}' }),
      );

      const result = await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);
    });

    it('retries a retryable status and returns the successful response', async () => {
      vi.useFakeTimers();
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE, body: '{}' }))
        .mockResolvedValueOnce(buildResponse({ body: JSON.stringify([{ id: 1 }]) }));

      const pending = execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        retry: { maxRetries: 1, initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS },
      });

      await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS - 1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      const result = await pending;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      expect(result.body).toEqual([{ id: 1 }]);
    });

    it('returns the last response once the retries are exhausted', async () => {
      vi.useFakeTimers();
      const { instance } = createServiceTestDependencies();
      // A fresh Response per attempt — the retry loop releases the body of each one it discards
      fetchSpy.mockImplementation(async () =>
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{}' }),
      );

      const pending = execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        retry: {
          maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES,
          initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS,
          backoffStrategy: 'constant',
        },
      });

      await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS * (HTTP_TEST_CONSTANTS.MAX_RETRIES + 1));
      const result = await pending;

      expect(fetchSpy).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);
    });

    it('does not retry a POST unless the method is opted in', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{}' }),
      );

      await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        body: { subject: 'New' },
        retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0 },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries a POST when it is listed in retryMethods', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementation(async () =>
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{}' }),
      );

      await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        body: { subject: 'New' },
        retry: {
          maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES,
          initialDelayMs: 0,
          retryMethods: ['POST'],
        },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    });

    it('honours retryableStatusCodes so an unlisted status is not retried', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{}' }),
      );

      await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        retry: {
          maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES,
          initialDelayMs: 0,
          retryableStatusCodes: [HTTP_TEST_CONSTANTS.STATUS_TOO_MANY_REQUESTS],
        },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries a transport failure and rethrows once the retries are exhausted', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockRejectedValue(new Error(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE));

      await expect(
        execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
          retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0 },
        }),
      ).rejects.toThrow(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE);
      expect(fetchSpy).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    });

    it('passes an abort signal to fetch so a caller can cancel the request', async () => {
      const { instance } = createServiceTestDependencies();
      const controller = new AbortController();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await execute(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        signal: controller.signal,
        timeoutMs: HTTP_TEST_CONSTANTS.TIMEOUT_MS,
      });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });
});
