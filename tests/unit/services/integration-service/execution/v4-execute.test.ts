import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildV4Manifest,
  buildV4UploadForm,
  unwrapV4Response,
  usesV4Engine,
} from '@/services/integration-service/execution/v4-execute';
import { ServerError } from '@/core/errors';
import type { ExecuteFile, ExecuteResult } from '@/models/integration-service/execution.types';
import { HTTP_TEST_CONSTANTS } from '@tests/utils/constants';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const FILE_BYTES = new Uint8Array([37, 80, 68, 70, 13, 10, 45, 45, 0, 255]);
const BOUNDARY = IS_TEST_CONSTANTS.MULTIPART_BOUNDARY;

const file = (): ExecuteFile => ({
  name: IS_TEST_CONSTANTS.FILE_PART_NAME,
  content: FILE_BYTES,
  fileName: IS_TEST_CONSTANTS.FILE_NAME,
  contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE,
});

/** The engine's answer as the SDK's request layer hands it over. */
const engineResult = (body: unknown, overrides: Partial<ExecuteResult> = {}): ExecuteResult => ({
  ok: true,
  status: HTTP_TEST_CONSTANTS.STATUS_OK,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body,
  ...overrides,
});

/** A two-part answer: the JSON description, then the vendor's bytes. */
function twoPartAnswer(envelope: unknown, bytes: Uint8Array, closed = true): Uint8Array {
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${BOUNDARY}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(envelope)}\r\n` +
      `--${BOUNDARY}\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  const tail = encoder.encode(closed ? `\r\n--${BOUNDARY}--\r\n` : '');
  const document = new Uint8Array(head.length + bytes.length + tail.length);
  document.set(head, 0);
  document.set(bytes, head.length);
  document.set(tail, head.length + bytes.length);
  return document;
}

const twoPartResult = (document: Uint8Array, contentType = `multipart/mixed; boundary=${BOUNDARY}`) =>
  engineResult(document, { headers: { 'content-type': contentType } });

describe('usesV4Engine', () => {
  it.each([
    ['4.0.0', true],
    ['4', true],
    ['v4.1.0', true],
    ['5.2.0', true],
    [' 4.0.0 ', true],
    ['3.9.9', false],
    ['1.0.0', false],
    ['latest', false],
    ['', false],
    [undefined, false],
  ])('routes version %s to the version 4 engine: %s', (version, expected) => {
    expect(usesV4Engine(version)).toBe(expected);
  });
});

describe('buildV4Manifest', () => {
  const base = { connectionId: IS_TEST_CONSTANTS.CONNECTION_ID, method: 'GET' as const, url: IS_TEST_CONSTANTS.VENDOR_URL };

  it('describes a bare vendor call', () => {
    expect(buildV4Manifest(base)).toEqual({
      outboundRequestConfig: { method: 'GET', url: IS_TEST_CONSTANTS.VENDOR_URL },
      context: { connectionId: IS_TEST_CONSTANTS.CONNECTION_ID },
    });
  });

  it('carries the connector key', () => {
    const manifest = buildV4Manifest({ ...base, connectorKey: IS_TEST_CONSTANTS.CONNECTOR_KEY });

    expect(manifest.context.connectorKey).toBe(IS_TEST_CONSTANTS.CONNECTOR_KEY);
  });

  it('joins query parameters to the URL', () => {
    const manifest = buildV4Manifest({ ...base, queryParams: { status: 'open', q: 'a b' } });

    expect(manifest.outboundRequestConfig.url).toBe(`${IS_TEST_CONSTANTS.VENDOR_URL}?status=open&q=a+b`);
  });

  it('appends query parameters to a URL that already has a query', () => {
    const manifest = buildV4Manifest({ ...base, url: `${IS_TEST_CONSTANTS.VENDOR_URL}?page=2`, queryParams: { status: 'open' } });

    expect(manifest.outboundRequestConfig.url).toBe(`${IS_TEST_CONSTANTS.VENDOR_URL}?page=2&status=open`);
  });

  it('lists headers as name and value pairs', () => {
    const manifest = buildV4Manifest({ ...base, headers: { Accept: 'application/json' } });

    expect(manifest.outboundRequestConfig.headers).toEqual([{ name: 'Accept', value: 'application/json' }]);
  });

  it('serializes an object body and labels it as JSON', () => {
    const manifest = buildV4Manifest({ ...base, method: 'POST', body: { subject: 'New' } });

    expect(manifest.outboundRequestConfig.body).toBe('{"subject":"New"}');
    expect(manifest.outboundRequestConfig.headers).toEqual([{ name: 'Content-Type', value: 'application/json' }]);
  });

  it('keeps the content type the caller set for a serialized body', () => {
    const manifest = buildV4Manifest({
      ...base,
      method: 'POST',
      headers: { 'content-type': 'application/vnd.api+json' },
      body: { subject: 'New' },
    });

    expect(manifest.outboundRequestConfig.headers).toEqual([{ name: 'content-type', value: 'application/vnd.api+json' }]);
  });

  it('sends a string body as it is, without a content type', () => {
    const manifest = buildV4Manifest({ ...base, method: 'POST', body: 'a=1&b=2' });

    expect(manifest.outboundRequestConfig.body).toBe('a=1&b=2');
    expect(manifest.outboundRequestConfig.headers).toBeUndefined();
  });

  it('names a file as the body and declares its size and type', () => {
    const manifest = buildV4Manifest({ ...base, method: 'PUT', file: file() });

    expect(manifest.outboundRequestConfig.bodyRef).toBe(IS_TEST_CONSTANTS.FILE_PART_NAME);
    expect(manifest.outboundRequestConfig.body).toBeUndefined();
    expect(manifest.attachments).toEqual([
      { name: IS_TEST_CONSTANTS.FILE_PART_NAME, size: FILE_BYTES.length, contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE },
    ]);
  });
});

describe('buildV4UploadForm', () => {
  it('puts the request description first and the file after it', async () => {
    const manifest = buildV4Manifest({
      connectionId: IS_TEST_CONSTANTS.CONNECTION_ID,
      method: 'PUT',
      url: IS_TEST_CONSTANTS.VENDOR_URL,
      file: file(),
    });

    const form = buildV4UploadForm(manifest, file());

    expect(Array.from(form.keys())).toEqual(['manifest', IS_TEST_CONSTANTS.FILE_PART_NAME]);
    const manifestPart = form.get('manifest') as File;
    expect(manifestPart.type).toBe('application/json');
    expect(JSON.parse(await manifestPart.text())).toEqual(manifest);
    const filePart = form.get(IS_TEST_CONSTANTS.FILE_PART_NAME) as File;
    expect(filePart.name).toBe(IS_TEST_CONSTANTS.FILE_NAME);
    expect(filePart.size).toBe(FILE_BYTES.length);
  });
});

describe('unwrapV4Response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the vendor response of a successful call', () => {
    const result = unwrapV4Response(
      engineResult({ status: HTTP_TEST_CONSTANTS.STATUS_OK, headers: { 'content-type': 'application/json' }, body: { id: 1 } }),
    );

    expect(result).toEqual({
      ok: true,
      status: HTTP_TEST_CONSTANTS.STATUS_OK,
      statusText: '',
      body: { id: 1 },
      headers: { 'content-type': 'application/json' },
      isVendorError: false,
    });
  });

  it('reports a vendor error status as a vendor error', () => {
    const result = unwrapV4Response(
      engineResult({ status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND, headers: {}, body: { message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE } }),
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    expect(result.isVendorError).toBe(true);
    expect(result.body).toEqual({ message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE });
  });

  it('joins a repeated header and drops an empty one', () => {
    const result = unwrapV4Response(
      engineResult({ status: HTTP_TEST_CONSTANTS.STATUS_OK, headers: { 'set-cookie': ['a=1', 'b=2'], 'x-count': 3, 'x-empty': null } }),
    );

    expect(result.headers).toEqual({ 'set-cookie': 'a=1, b=2', 'x-count': '3' });
  });

  it('decodes a body the engine marked as base64 to bytes', () => {
    const result = unwrapV4Response(
      engineResult({
        status: HTTP_TEST_CONSTANTS.STATUS_OK,
        headers: { 'content-type': 'text/plain' },
        bodyEncoding: 'base64',
        body: Buffer.from(FILE_BYTES).toString('base64'),
      }),
    );

    expect(result.body).toBeInstanceOf(Uint8Array);
    expect(Array.from(result.body as Uint8Array)).toEqual(Array.from(FILE_BYTES));
  });

  it('returns the engine response when the engine itself failed', () => {
    const engineError = { error: { kind: 'credential', message: IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND } };

    const result = unwrapV4Response(
      engineResult(engineError, { ok: false, status: HTTP_TEST_CONSTANTS.STATUS_PRECONDITION_FAILED }),
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_PRECONDITION_FAILED);
    expect(result.isVendorError).toBe(false);
    expect(result.body).toEqual(engineError);
  });

  it.each([['text'], [null], [[1, 2]], [{ noStatus: true }]])(
    'returns a successful answer that reports no vendor status as it is: %o',
    (body) => {
      const result = unwrapV4Response(engineResult(body));

      expect(result.body).toEqual(body);
      expect(result.isVendorError).toBe(false);
    },
  );

  it('returns bytes that are not a two-part answer as they are', () => {
    const result = unwrapV4Response(engineResult(FILE_BYTES, { headers: { 'content-type': 'application/pdf' } }));

    expect(result.body).toBe(FILE_BYTES);
    expect(result.isVendorError).toBe(false);
  });

  describe('two-part answer', () => {
    const envelope = { status: HTTP_TEST_CONSTANTS.STATUS_OK, headers: { 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE } };

    it('returns the vendor status and headers with the bytes as the body', () => {
      const result = unwrapV4Response(twoPartResult(twoPartAnswer(envelope, FILE_BYTES)));

      expect(result.ok).toBe(true);
      expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_OK);
      expect(result.headers).toEqual({ 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE });
      expect(Array.from(result.body as Uint8Array)).toEqual(Array.from(FILE_BYTES));
    });

    it('reads a quoted boundary', () => {
      const result = unwrapV4Response(
        twoPartResult(twoPartAnswer(envelope, FILE_BYTES), `multipart/mixed; boundary="${BOUNDARY}"`),
      );

      expect(Array.from(result.body as Uint8Array)).toEqual(Array.from(FILE_BYTES));
    });

    it('returns an empty body for an empty second part', () => {
      const result = unwrapV4Response(twoPartResult(twoPartAnswer(envelope, new Uint8Array(0))));

      expect((result.body as Uint8Array).length).toBe(0);
    });

    it('reports a vendor error that arrives with bytes', () => {
      const result = unwrapV4Response(
        twoPartResult(twoPartAnswer({ status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND, headers: {} }, FILE_BYTES)),
      );

      expect(result.isVendorError).toBe(true);
    });

    it('refuses an answer that was cut short', () => {
      expect(() => unwrapV4Response(twoPartResult(twoPartAnswer(envelope, FILE_BYTES, false)))).toThrow(ServerError);
    });

    it('refuses an answer without a boundary', () => {
      expect(() => unwrapV4Response(twoPartResult(twoPartAnswer(envelope, FILE_BYTES), 'multipart/mixed'))).toThrow(
        ServerError,
      );
    });

    it('refuses an answer with no parts', () => {
      expect(() => unwrapV4Response(twoPartResult(new TextEncoder().encode('not a document')))).toThrow(ServerError);
    });

    it('refuses an answer whose first part is not JSON', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const document = new TextEncoder().encode(
        `--${BOUNDARY}\r\n\r\nnot json\r\n--${BOUNDARY}\r\n\r\nbytes\r\n--${BOUNDARY}--`,
      );

      expect(() => unwrapV4Response(twoPartResult(document))).toThrow(ServerError);
    });

    it('refuses an answer whose first part is not an object', () => {
      const document = new TextEncoder().encode(
        `--${BOUNDARY}\r\n\r\n[1]\r\n--${BOUNDARY}\r\n\r\nbytes\r\n--${BOUNDARY}--`,
      );

      expect(() => unwrapV4Response(twoPartResult(document))).toThrow(ServerError);
    });
  });
});
