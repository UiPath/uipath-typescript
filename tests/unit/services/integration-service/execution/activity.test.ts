import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeActivity } from '@/services/integration-service/execution/activity';
import { ValidationError } from '@/core/errors';
import { UiPath } from '@/core/uipath';
import type { CodedFunctionContext } from '@/core/config/function-context';
import { createServiceTestDependencies } from '@tests/utils/setup';
import { IS_TEST_CONSTANTS } from '@tests/utils/mocks';
import { HTTP_TEST_CONSTANTS, TEST_CONSTANTS } from '@tests/utils/constants';
import { clearContractEnv } from '@tests/utils/env-contract';
import { functionContext, TEST_PLATFORM } from '@tests/utils/function-context';
import {
  FOLDER_ID,
  FOLDER_KEY,
  FOLDER_PATH_ENCODED,
  TRACEPARENT,
  UIPATH_TRACEPARENT_ID,
} from '@/utils/constants/headers';
import { resource } from '@/resources';
import {
  HAS_MORE_HEADER,
  MAX_FOLLOWED_PAGES,
  NEXT_PAGE_TOKEN_HEADER,
} from '@/services/integration-service/execution/pagination';
import { OVERRIDE_TEST_CONSTANTS } from '@tests/utils/constants/overrides';

const OBJECT_NAME = 'tickets';
const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);

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

describe('executeActivity', () => {
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

    const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

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

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
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

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      queryParams: { limit: '10', status: 'open' },
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('limit=10');
    expect(url).toContain('status=open');
  });

  it('sends folder header when folderKey is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
  });

  it('sends the folder ID header when folderId is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderId: IS_TEST_CONSTANTS.FOLDER_ID,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_ID]).toBe(String(IS_TEST_CONSTANTS.FOLDER_ID));
  });

  it('sends the encoded folder path header when folderPath is provided', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
      folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_PATH_ENCODED]).toBe(IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE);
  });

  it('falls back to the meta-tag folder key when no folder context is provided', async () => {
    const { instance } = createServiceTestDependencies({ metaFolderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
  });

  it('sends no folder header when neither options nor init supply folder context', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBeUndefined();
    expect(init.headers[FOLDER_ID]).toBeUndefined();
    expect(init.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
  });

  it('does not leak folder context into the query string', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
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

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

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

    const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

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

    const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

    expect(result.body).toBe('plain text');
  });

  it('preserves "/" separators in a multi-segment objectName', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, 'curated_get_issue/APPS-34728');

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain(
      `/elements_/v3/element/instances/${IS_TEST_CONSTANTS.CONNECTION_ID}/curated_get_issue/APPS-34728`,
    );
    expect(url).not.toContain('%2F');
  });

  it('encodes reserved characters within each path segment', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

    await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, 'curated_get_issue/APPS 347#28');

    const [url] = fetchSpy.mock.calls[0];
    // separator stays literal, but the space and "#" inside the segment are escaped
    expect(url).toContain('/curated_get_issue/APPS%20347%2328');
  });

  it('throws ValidationError when connectionId is missing', async () => {
    const { instance } = createServiceTestDependencies();
    await expect(
      executeActivity(instance, '', OBJECT_NAME),
    ).rejects.toThrow(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws ValidationError when objectName is missing', async () => {
    const { instance } = createServiceTestDependencies();
    await expect(
      executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, ''),
    ).rejects.toThrow(ValidationError);
  });

  describe('with a declared connection or a published override', () => {
    const handle = resource.connection({ id: IS_TEST_CONSTANTS.CONNECTION_ID, connector: IS_TEST_CONSTANTS.CONNECTOR_KEY });
    const remappedPath = `/elements_/v3/element/instances/${OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID}/${OBJECT_NAME}`;

    const publishRemap = (properties: Record<string, string>) => {
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`connection.${IS_TEST_CONSTANTS.CONNECTION_ID}`]: properties,
      });
    };

    afterEach(() => {
      delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
    });

    it('executes against the connection a handle declares', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      const result = await executeActivity(instance, handle, OBJECT_NAME);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/elements_/v3/element/instances/${IS_TEST_CONSTANTS.CONNECTION_ID}/${OBJECT_NAME}`);
      expect(init.method).toBe('GET');
      expect(result.ok).toBe(true);
    });

    it.each([
      ['a handle', handle],
      ['a plain id', IS_TEST_CONSTANTS.CONNECTION_ID],
    ])('executes against the remapped connection in its folder for %s', async (_label, connection) => {
      const { instance } = createServiceTestDependencies();
      publishRemap({
        ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
        folderKey: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY,
      });
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await (typeof connection === 'string'
        ? executeActivity(instance, connection, OBJECT_NAME)
        : executeActivity(instance, connection, OBJECT_NAME));

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain(remappedPath);
      expect(init.headers[FOLDER_KEY]).toBe(OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY);
    });

    it("scopes to the override's folder over the meta-tag folder key", async () => {
      const { instance } = createServiceTestDependencies({ metaFolderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      publishRemap({
        ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
        folderKey: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY,
      });
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, handle, OBJECT_NAME);

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers[FOLDER_KEY]).toBe(OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY);
    });

    it("sends the override's folder for the mapped connection even when a folder option is passed", async () => {
      const { instance } = createServiceTestDependencies();
      publishRemap({
        ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
        folderKey: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY,
      });
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, handle, OBJECT_NAME, 'GET', { folderId: IS_TEST_CONSTANTS.FOLDER_ID });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain(remappedPath);
      expect(init.headers[FOLDER_KEY]).toBe(OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY);
      expect(init.headers[FOLDER_ID]).toBeUndefined();
    });

    it('keeps the meta-tag folder fallback when the override names no folder', async () => {
      const { instance } = createServiceTestDependencies({ metaFolderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      publishRemap({ ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID });
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, handle, OBJECT_NAME);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain(remappedPath);
      expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
    });
  });

  describe('on a version 4 connector', () => {
    const SCRIPT = 'SendMessageToChannel';
    const CONNECTOR_KEY = 'uipath-salesforce-slack';
    const V4_OPTIONS = { connectorVersion: '4.0.0', connectorKey: CONNECTOR_KEY };

    it('posts the script reference and the inbound call to the version 4 engine', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ body: JSON.stringify({ status: 200, headers: { 'x-vendor': ['a'] }, body: { ok: true } }) }),
      );

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'POST', {
        ...V4_OPTIONS,
        queryParams: { send_as: 'bot' },
        headers: { 'x-trace': '1' },
        body: { channel: 'C1', messageToSend: 'hi' },
      });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/elements_/v4/execute');
      expect(url).not.toContain('send_as');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        context: {
          connectionId: IS_TEST_CONSTANTS.CONNECTION_ID,
          connectorKey: CONNECTOR_KEY,
          script: { reference: SCRIPT },
        },
        request: {
          body: { channel: 'C1', messageToSend: 'hi' },
          query: { send_as: 'bot' },
          headers: { 'x-trace': '1' },
        },
      });
      expect(result).toEqual({ ok: true, status: 200, statusText: '', headers: { 'x-vendor': 'a' }, body: { ok: true } });
    });

    it('sends scriptRef in place of objectName when both are given', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: JSON.stringify({ status: 200, body: [] }) }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        ...V4_OPTIONS,
        scriptRef: 'ListTickets',
      });

      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).context.script).toEqual({ reference: 'ListTickets' });
    });

    it('takes the connector key from a connection handle', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: JSON.stringify({ status: 200, body: [] }) }));
      const handle = resource.connection({ id: IS_TEST_CONSTANTS.CONNECTION_ID, connector: CONNECTOR_KEY });

      await executeActivity(instance, handle, SCRIPT, 'POST', { connectorVersion: '4.0.0' });

      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).context.connectorKey).toBe(CONNECTOR_KEY);
    });

    it("reports the vendor's status when the vendor refused the call", async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ body: JSON.stringify({ status: 404, body: { error: 'channel_not_found' } }) }),
      );

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'POST', V4_OPTIONS);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.body).toEqual({ error: 'channel_not_found' });
    });

    it('throws ValidationError without a connector key', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'POST', { connectorVersion: '4.0.0' }),
      ).rejects.toThrow(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['files', { files: [{ name: IS_TEST_CONSTANTS.FILE_PART_NAME, content: new Uint8Array([1]) }] }],
      ['maxRecords', { maxRecords: 10 }],
      ['fileResponse', { fileResponse: true }],
      ['urlInputFields', { urlInputFields: ['link'] }],
      ['bodyPartName', { bodyPartName: 'metadata' }],
    ])('throws ValidationError for %s, which the version 4 engine cannot honour', async (name, option) => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'GET', { ...V4_OPTIONS, ...option }),
      ).rejects.toThrow(new RegExp(`${name} is not supported by executeActivity on a version 4 connector`));
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('names every refused option in one error', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'GET', {
          ...V4_OPTIONS,
          maxRecords: 10,
          fileResponse: true,
        }),
      ).rejects.toThrow(/fileResponse, maxRecords are not supported/);
    });

    it('accepts an option left at its off value', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: JSON.stringify({ status: 200, body: [] }) }));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'GET', {
        ...V4_OPTIONS,
        fileResponse: false,
        urlInputFields: [],
      });

      expect(result.ok).toBe(true);
    });

    it.each([
      ['headers', { headers: { 'x-trace': '1' } }],
      ['scriptRef', { scriptRef: SCRIPT }],
    ])('throws ValidationError for %s without a version 4 connector', async (name, option) => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', option),
      ).rejects.toThrow(new RegExp(`${name} is not supported by executeActivity without a version 4 connector`));
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('retries the carrier request only when the activity method is retryable', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE, body: '{}' }),
      );

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, SCRIPT, 'POST', {
        ...V4_OPTIONS,
        retry: { maxRetries: 2, initialDelayMs: 1 },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps the version 3 endpoint for a connector below version 4', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', { connectorVersion: '3.2.0' });

      expect(fetchSpy.mock.calls[0][0]).toContain('/elements_/v3/element/instances/');
    });
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

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);
    });

    it('retries a retryable status and returns the successful response', async () => {
      vi.useFakeTimers();
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE, body: '{}' }))
        .mockResolvedValueOnce(buildResponse({ body: JSON.stringify([{ id: 1 }]) }));

      const pending = executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
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

      const pending = executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
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

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
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

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
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

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
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
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
          retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0 },
        }),
      ).rejects.toThrow(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE);
      expect(fetchSpy).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    });

    it('passes an abort signal to fetch so a caller can cancel the request', async () => {
      const { instance } = createServiceTestDependencies();
      const controller = new AbortController();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        signal: controller.signal,
        timeoutMs: HTTP_TEST_CONSTANTS.TIMEOUT_MS,
      });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('with a UiPath built from a coded-function context', () => {
    let restoreEnv: () => void;

    beforeEach(() => {
      restoreEnv = clearContractEnv();
    });

    afterEach(() => {
      restoreEnv();
    });

    const contextInFolder = (folderKey: string): CodedFunctionContext =>
      functionContext({ platform: { ...TEST_PLATFORM, folderKey } });

    it('does not scope the call to the invocation folder when no folder option is supplied', async () => {
      // A folder header that is not the connection's makes Integration Service answer 404, and the
      // connection a function uses can live outside the folder it runs in.
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(new UiPath(contextInFolder(TEST_CONSTANTS.FOLDER_KEY)), IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('sends an explicit folderKey option', async () => {
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(new UiPath(contextInFolder(TEST_CONSTANTS.FOLDER_KEY)), IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
      });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
    });
  });
  describe('request body', () => {
    it('sends an empty JSON body for a write with no body', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST');

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.body).toBe('{}');
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('sends no body for a DELETE with no body', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'DELETE');

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.body).toBeUndefined();
    });
  });

  describe('paging', () => {
    const pageResponse = (records: unknown[], token?: string, hasMore = 'true') =>
      buildResponse({
        body: JSON.stringify(records),
        headers: {
          'content-type': 'application/json',
          ...(token ? { [HAS_MORE_HEADER]: hasMore, [NEXT_PAGE_TOKEN_HEADER]: token } : {}),
        },
      });

    it('reports the paging state of a single page when the connector has more records', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN });
      expect(result.body).toEqual([{ id: 1 }]);
    });

    it('leaves page unset when the response is not a paged list', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(pageResponse([{ id: 1 }]));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME);

      expect(result.page).toBeUndefined();
    });

    it('follows the pages until maxRecords records are gathered', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }, { id: 2 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(pageResponse([{ id: 3 }, { id: 4 }], IS_TEST_CONSTANTS.PAGE_TOKEN_2));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        queryParams: { status: 'open' },
        maxRecords: 3,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const secondUrl = new URL(fetchSpy.mock.calls[1][0]);
      expect(secondUrl.searchParams.get('nextPage')).toBe(IS_TEST_CONSTANTS.PAGE_TOKEN);
      expect(secondUrl.searchParams.get('status')).toBe('open');
      expect(result.body).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      // Records remain, so the caller gets the token of the page after the last one read
      expect(result.page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN_2 });
      expect(result.headers[HAS_MORE_HEADER]).toBeUndefined();
      expect(result.headers[NEXT_PAGE_TOKEN_HEADER]).toBeUndefined();
    });

    it('fetches every record for maxRecords -1 and stops at the last page', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(pageResponse([{ id: 2 }], IS_TEST_CONSTANTS.PAGE_TOKEN_2))
        .mockResolvedValueOnce(pageResponse([{ id: 3 }], IS_TEST_CONSTANTS.PAGE_TOKEN_DONE));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: -1,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(result.body).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('stops when the connector reports no more records', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(pageResponse([{ id: 2 }], IS_TEST_CONSTANTS.PAGE_TOKEN_2, 'false'));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 10,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('does not fetch another page when the first already holds maxRecords records', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(pageResponse([{ id: 1 }, { id: 2 }], IS_TEST_CONSTANTS.PAGE_TOKEN));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 2,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN });
    });

    it('trims a first page that holds more than maxRecords records', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(pageResponse([{ id: 1 }, { id: 2 }, { id: 3 }], IS_TEST_CONSTANTS.PAGE_TOKEN));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 2,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.page).toEqual({ hasMore: true, nextPageToken: IS_TEST_CONSTANTS.PAGE_TOKEN });
      expect(result.headers[NEXT_PAGE_TOKEN_HEADER]).toBeUndefined();
    });

    it('leaves page unset when maxRecords gathered every page', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(pageResponse([{ id: 2 }], IS_TEST_CONSTANTS.PAGE_TOKEN_DONE));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: -1,
      });

      expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.page).toBeUndefined();
    });

    it('stops when the connector repeats a page token', async () => {
      const { instance } = createServiceTestDependencies();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // A fresh response per call: the connector answers every page with the same token
      fetchSpy.mockImplementation(async () => pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: -1,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.body).toEqual([{ id: 1 }, { id: 1 }]);
      expect(result.page).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('repeated a page token'));
      warn.mockRestore();
    });

    it('stops after the page cap and returns the token to continue from', async () => {
      const { instance } = createServiceTestDependencies();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      let call = 0;
      fetchSpy.mockImplementation(async () => pageResponse([{ id: call }], `token-${call++}`));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: -1,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(MAX_FOLLOWED_PAGES + 1);
      expect(result.body).toHaveLength(MAX_FOLLOWED_PAGES + 1);
      expect(result.page).toEqual({ hasMore: true, nextPageToken: `token-${MAX_FOLLOWED_PAGES}` });
      warn.mockRestore();
    });

    it('returns the failing page when a later page fails', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(
          buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR, body: '{"message":"boom"}' }),
        );

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 10,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);
      expect(result.body).toEqual({ message: 'boom' });
    });

    it('keeps the records gathered so far when a later page is not a list', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN))
        .mockResolvedValueOnce(buildResponse({ body: '{}' }));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 10,
      });

      expect(result.body).toEqual([{ id: 1 }]);
    });

    it('returns a failed first page as is', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND, body: '{}' }));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        maxRecords: 10,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    });

    it('ignores maxRecords for a method other than GET', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(pageResponse([{ id: 1 }], IS_TEST_CONSTANTS.PAGE_TOKEN));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        body: { subject: 'New' },
        maxRecords: 10,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws ValidationError for an invalid maxRecords before sending anything', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', { maxRecords: 0 }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('body paths', () => {
    it('sends a body whose keys are paths as a nested body', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        body: { 'fields.summary': 'New', 'fields.labels[0]': 'urgent' },
      });

      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ fields: { summary: 'New', labels: ['urgent'] } });
    });

    it('sends a body that is not a plain object as it is', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', { body: [{ 'a.b': 1 }] });

      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual([{ 'a.b': 1 }]);
    });
  });

  describe('URL input fields', () => {
    it('sends a listed query parameter that holds a URL as Base64', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        queryParams: { referenceID: IS_TEST_CONSTANTS.VENDOR_URL, limit: '10' },
        urlInputFields: ['referenceID'],
      });

      const sent = new URL(fetchSpy.mock.calls[0][0]).searchParams;
      expect(sent.get('referenceID')).toBe(Buffer.from(IS_TEST_CONSTANTS.VENDOR_URL).toString('base64'));
      expect(sent.get('limit')).toBe('10');
    });

    it('sends the query as given when no field is listed', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '[]' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        queryParams: { referenceID: IS_TEST_CONSTANTS.VENDOR_URL },
      });

      expect(new URL(fetchSpy.mock.calls[0][0]).searchParams.get('referenceID')).toBe(IS_TEST_CONSTANTS.VENDOR_URL);
    });
  });

  describe('files', () => {
    const fileBytes = new Uint8Array([1, 2, 3]);
    const upload = {
      name: IS_TEST_CONSTANTS.FILE_PART_NAME,
      content: fileBytes,
      fileName: IS_TEST_CONSTANTS.FILE_NAME,
      contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE,
    };

    it('uploads files as a multipart form with the body as a part', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        files: [upload],
        body: { title: 'Report' },
      });

      const init = fetchSpy.mock.calls[0][1];
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.body.get('body')).toBe('{"title":"Report"}');
      expect((init.body.get(IS_TEST_CONSTANTS.FILE_PART_NAME) as File).name).toBe(IS_TEST_CONSTANTS.FILE_NAME);
      // The form sets its own content type, with the boundary
      expect(init.headers['Content-Type']).toBeUndefined();
    });

    it('names the body part as asked', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', {
        files: [upload],
        body: { title: 'Report' },
        bodyPartName: 'metadata',
      });

      expect(fetchSpy.mock.calls[0][1].body.get('metadata')).toBe('{"title":"Report"}');
    });

    it('sends JSON when the files list is empty', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{}' }));

      await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', { files: [], body: { a: 1 } });

      expect(fetchSpy.mock.calls[0][1].body).toBe('{"a":1}');
    });

    it('rejects a file without a name before sending anything', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'POST', { files: [{ ...upload, name: '' }] }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a file response as bytes', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        new Response(fileBytes, { headers: { 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE } }),
      );

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET');

      expect(result.body).toBeInstanceOf(Uint8Array);
      expect(Array.from(result.body as Uint8Array)).toEqual(Array.from(fileBytes));
    });

    it('reads a successful response as bytes when fileResponse is set', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(buildResponse({ body: '{"id":1}' }));

      const result = await executeActivity(instance, IS_TEST_CONSTANTS.CONNECTION_ID, OBJECT_NAME, 'GET', {
        fileResponse: true,
      });

      expect(result.body).toBeInstanceOf(Uint8Array);
    });
  });
});
