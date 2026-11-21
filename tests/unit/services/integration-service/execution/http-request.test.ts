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
    vi.restoreAllMocks();
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

  it('sends URLSearchParams as URL-encoded text', async () => {
    const { instance } = createServiceTestDependencies();
    fetchSpy.mockResolvedValue(carrierResponse(vendorSuccess()));

    await executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
      body: new URLSearchParams({ subject: 'New ticket' }),
    });

    expect(sentBody().body).toBe('subject=New+ticket');
  });

  it.each([
    ['a Uint8Array', () => new Uint8Array([1, 2, 3])],
    ['an ArrayBuffer', () => new ArrayBuffer(4)],
    ['a Blob', () => new Blob(['bytes'])],
    ['a FormData', () => new FormData()],
  ])('throws ValidationError for %s body before sending anything', async (_name, makeBody) => {
    const { instance } = createServiceTestDependencies();

    await expect(
      executeHttp(instance, IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.VENDOR_PATH, 'POST', {
        body: makeBody(),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
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
});
