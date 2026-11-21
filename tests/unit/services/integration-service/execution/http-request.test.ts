import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
import { executeHttp } from '@/services/integration-service/execution/http-request';
import type { Connection } from '@/models/integration-service/connections.types';
import { ValidationError } from '@/core/errors';
import { FOLDER_KEY, TRACEPARENT, UIPATH_TRACEPARENT_ID } from '@/utils/constants/headers';
import { resource } from '@/resources';
import { createServiceTestDependencies } from '@tests/utils/setup';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';
import { HTTP_TEST_CONSTANTS } from '@tests/utils/constants';
import { OVERRIDE_TEST_CONSTANTS } from '@tests/utils/constants/overrides';

const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
const PASSTHROUGH_PATH = `/elements_/v3/element/instances/${IS_TEST_CONSTANTS.CONNECTION_ID}/http-request`;

/** The Integration Service answer: `status` is its own, `vendor` is what it reports about the vendor call. */
const carrierResponse = (vendor: unknown, status: number = HTTP_TEST_CONSTANTS.STATUS_OK) =>
  new Response(JSON.stringify(vendor), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const vendorSuccess = (body: unknown = [{ id: 1 }]) => ({
  code: HTTP_TEST_CONSTANTS.STATUS_OK,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body,
});

describe('executeHttp', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  const sentBody = (call = 0): Record<string, unknown> => JSON.parse(fetchSpy.mock.calls[call][1].body);

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts the vendor request to the connection passthrough endpoint', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain(PASSTHROUGH_PATH);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: expect.stringMatching(/^Bearer /),
      'Content-Type': 'application/json',
    });
    expect(sentBody()).toEqual({ method: 'GET', url: IS_TEST_CONSTANTS.VENDOR_PATH });
  });

  it('accepts a Connection input as the connection id', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));
    const input: { connection: Connection<typeof IS_TEST_CONSTANTS.CONNECTOR_KEY> } = {
      connection: IS_TEST_CONSTANTS.CONNECTION_ID,
    };

    await executeHttp(instance, input.connection, IS_TEST_CONSTANTS.VENDOR_PATH);

    expect(fetchSpy.mock.calls[0][0]).toContain(PASSTHROUGH_PATH);
    expectTypeOf(input.connection).toMatchTypeOf<string>();
  });

  it('returns the vendor response, not the Integration Service one', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess([{ id: 7 }])));

    const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_OK);
    expect(result.body).toEqual([{ id: 7 }]);
    expect(result.isVendorError).toBe(false);
  });

  it('sends headers and query params to the vendor inside the request body', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'GET', {
      headers: { accept: 'application/json' },
      queryParams: { status: 'open' },
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).not.toContain('status=open');
    expect(sentBody()).toEqual({
      method: 'GET',
      url: IS_TEST_CONSTANTS.VENDOR_PATH,
      headers: { accept: 'application/json' },
      query: { status: 'open' },
    });
  });

  it('serializes an object body as a JSON string for the vendor', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess({ id: 42 })));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
      body: { subject: 'New' },
    });

    expect(sentBody()).toMatchObject({ method: 'POST', body: '{"subject":"New"}' });
  });

  it('sends a string body as is', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
      body: 'subject=New',
    });

    expect(sentBody().body).toBe('subject=New');
  });

  it('returns a vendor error without throwing', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(
      carrierResponse({
        code: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND,
        statusText: 'Not Found',
        headers: {},
        body: { message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE },
      }),
    );

    const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    expect(result.isVendorError).toBe(true);
    expect(result.body).toEqual({ message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE });
  });

  it('returns the Integration Service failure when the call does not reach the vendor', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(
      carrierResponse(
        { message: IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND },
        HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND,
      ),
    );

    const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    expect(result.isVendorError).toBe(false);
    expect(result.body).toEqual({ message: IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND });
  });

  it('sends the folder header and keeps folder context out of the vendor request', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'GET', {
      folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[FOLDER_KEY]).toBe(IS_TEST_CONSTANTS.FOLDER_KEY);
    expect(sentBody()).not.toHaveProperty('folderKey');
  });

  it('sends distributed-tracing headers', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers[TRACEPARENT]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(init.headers[UIPATH_TRACEPARENT_ID]).toBe(init.headers[TRACEPARENT]);
  });

  it('throws ValidationError when connectionId is missing', async () => {
    const { instance } = createServiceTestDependencies();

    await expect(executeHttp(instance, '', IS_TEST_CONSTANTS.VENDOR_PATH)).rejects.toBeInstanceOf(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws ValidationError when url is missing', async () => {
    const { instance } = createServiceTestDependencies();

    await expect(executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, '')).rejects.toBeInstanceOf(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('with a declared connection or a published override', () => {
    afterEach(() => {
      delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
    });

    it('sends the request through the connection a handle declares', async () => {
      const { instance } = createServiceTestDependencies();
      const handle = resource.connection({
        id: IS_TEST_CONSTANTS.CONNECTION_ID,
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
      });
      fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

      await executeHttp(instance, handle, IS_TEST_CONSTANTS.VENDOR_PATH);

      expect(fetchSpy.mock.calls[0][0]).toContain(PASSTHROUGH_PATH);
    });

    it('targets the connection an override remapped the id to', async () => {
      const { instance } = createServiceTestDependencies();
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`connection.${IS_TEST_CONSTANTS.CONNECTION_ID}`]: {
          ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
        },
      });
      fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

      expect(fetchSpy.mock.calls[0][0]).toContain(
        `/elements_/v3/element/instances/${OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID}/http-request`,
      );
    });
  });

  describe('retry', () => {
    const failingCarrier = async () => carrierResponse({}, HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);

    it('makes a single attempt when no retry options are supplied', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementation(failingCarrier);

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries a failed call when the vendor method is GET', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementationOnce(failingCarrier).mockResolvedValueOnce(carrierResponse(vendorSuccess()));

      const result = await executeHttp(
        instance,
        IS_TEST_CONSTANTS.CONNECTION_ID,
        IS_TEST_CONSTANTS.VENDOR_PATH,
        'GET',
        { retry: { maxRetries: 1, initialDelayMs: 0 } },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
    });

    it('does not retry when the vendor method is POST', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementation(failingCarrier);

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
        body: { subject: 'New' },
        retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0 },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries a vendor POST when it is listed in retryMethods', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementation(failingCarrier);

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
        body: { subject: 'New' },
        retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0, retryMethods: ['POST'] },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    });

    it('does not retry a vendor error status', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockImplementation(async () =>
        carrierResponse({ code: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE, body: {} }),
      );

      const result = await executeHttp(
        instance,
        IS_TEST_CONSTANTS.CONNECTION_ID,
        IS_TEST_CONSTANTS.VENDOR_PATH,
        'GET',
        { retry: { maxRetries: HTTP_TEST_CONSTANTS.MAX_RETRIES, initialDelayMs: 0 } },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE);
      expect(result.isVendorError).toBe(true);
    });
  });

  describe('version 4 connectors', () => {
    const V4_PATH = '/elements_/v4/execute';
    const v4 = { connectorVersion: IS_TEST_CONSTANTS.CONNECTOR_VERSION_V4 };
    const fileBytes = new Uint8Array([1, 2, 3]);
    const upload = {
      name: IS_TEST_CONSTANTS.FILE_PART_NAME,
      content: fileBytes,
      contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE,
    };
    const engineSuccess = (body: unknown = { id: 1 }) => ({
      status: HTTP_TEST_CONSTANTS.STATUS_OK,
      headers: { 'content-type': 'application/json' },
      body,
    });

    it('sends the call to the version 4 engine', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(carrierResponse(engineSuccess()));

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'POST', {
        ...v4,
        connectorKey: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        headers: { Accept: 'application/json' },
        queryParams: { notify: 'true' },
        body: { subject: 'New' },
      });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain(V4_PATH);
      expect(url).not.toContain('/v3/');
      expect(init.method).toBe('POST');
      expect(sentBody()).toEqual({
        outboundRequestConfig: {
          method: 'POST',
          url: `${IS_TEST_CONSTANTS.VENDOR_URL}?notify=true`,
          headers: [
            { name: 'Accept', value: 'application/json' },
            { name: 'Content-Type', value: 'application/json' },
          ],
          body: '{"subject":"New"}',
        },
        context: { connectionId: IS_TEST_CONSTANTS.CONNECTION_ID, connectorKey: IS_TEST_CONSTANTS.CONNECTOR_KEY },
      });
    });

    it('returns the vendor response the engine reports', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(carrierResponse(engineSuccess([{ id: 7 }])));

      const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', v4);

      expect(result.ok).toBe(true);
      expect(result.body).toEqual([{ id: 7 }]);
      expect(result.isVendorError).toBe(false);
    });

    it('reports a vendor error status as a vendor error', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        carrierResponse({ status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND, headers: {}, body: { message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE } }),
      );

      const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', v4);

      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
      expect(result.isVendorError).toBe(true);
    });

    it('returns the engine response when the engine itself failed', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(
        carrierResponse({ error: { kind: 'credential' } }, HTTP_TEST_CONSTANTS.STATUS_PRECONDITION_FAILED),
      );

      const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', v4);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_PRECONDITION_FAILED);
      expect(result.isVendorError).toBe(false);
    });

    it('takes the connector key from a resource.connection() handle', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(carrierResponse(engineSuccess()));
      const connection = resource.connection({
        id: IS_TEST_CONSTANTS.CONNECTION_ID,
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
      });

      await executeHttp(instance, connection, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', v4);

      expect(sentBody().context).toEqual({
        connectionId: IS_TEST_CONSTANTS.CONNECTION_ID,
        connectorKey: IS_TEST_CONSTANTS.CONNECTOR_KEY,
      });
    });

    it('returns a vendor file as bytes', async () => {
      const { instance } = createServiceTestDependencies();
      const boundary = IS_TEST_CONSTANTS.MULTIPART_BOUNDARY;
      const envelope = { status: HTTP_TEST_CONSTANTS.STATUS_OK, headers: { 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE } };
      const document = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(envelope)}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
        Buffer.from(fileBytes),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      fetchSpy.mockResolvedValue(
        new Response(document, { headers: { 'content-type': `multipart/mixed; boundary=${boundary}` } }),
      );

      const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', v4);

      expect(result.ok).toBe(true);
      expect(result.headers).toEqual({ 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE });
      expect(Array.from(result.body as Uint8Array)).toEqual(Array.from(fileBytes));
    });

    it('uploads a file as the vendor request body', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy.mockResolvedValue(carrierResponse(engineSuccess()));

      await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'PUT', {
        ...v4,
        file: upload,
      });

      const init = fetchSpy.mock.calls[0][1];
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.headers['Content-Type']).toBeUndefined();
      const manifest = JSON.parse(await (init.body.get('manifest') as File).text());
      expect(manifest.outboundRequestConfig.bodyRef).toBe(IS_TEST_CONSTANTS.FILE_PART_NAME);
      expect(manifest.attachments).toEqual([
        { name: IS_TEST_CONSTANTS.FILE_PART_NAME, size: fileBytes.length, contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE },
      ]);
      expect((init.body.get(IS_TEST_CONSTANTS.FILE_PART_NAME) as File).size).toBe(fileBytes.length);
    });

    it('rejects a file together with a body', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'PUT', {
          ...v4,
          file: upload,
          body: { a: 1 },
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects a file for a connector that is not version 4', async () => {
      const { instance } = createServiceTestDependencies();

      await expect(
        executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'PUT', { file: upload }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each([[IS_TEST_CONSTANTS.CONNECTOR_VERSION_V3], [undefined]])(
      'keeps a connector of version %s on the version 3 endpoint',
      async (connectorVersion) => {
        const { instance } = createServiceTestDependencies();
        fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

        await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'GET', {
          connectorVersion,
        });

        expect(fetchSpy.mock.calls[0][0]).toContain(PASSTHROUGH_PATH);
      },
    );

    it('retries the engine call when the vendor method is retryable', async () => {
      const { instance } = createServiceTestDependencies();
      fetchSpy
        .mockResolvedValueOnce(carrierResponse({}, HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE))
        .mockResolvedValueOnce(carrierResponse(engineSuccess()));

      const result = await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_URL, 'GET', {
        ...v4,
        retry: { maxRetries: 1, initialDelayMs: 0 },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
    });
  });
});
