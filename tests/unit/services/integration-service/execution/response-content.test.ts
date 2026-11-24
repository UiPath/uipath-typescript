import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  headerValue,
  isFileResponse,
  readResponseBody,
} from '@/services/integration-service/execution/response-content';
import { HTTP_TEST_CONSTANTS } from '@tests/utils/constants';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const LABEL = 'Execution.execute';
const BYTES = new Uint8Array([37, 80, 68, 70, 0, 255]);

describe('headerValue', () => {
  it('reads a header whatever the case of its name', () => {
    expect(headerValue({ 'Content-Type': 'text/csv' }, 'content-type')).toBe('text/csv');
    expect(headerValue({ 'content-type': 'text/csv' }, 'content-type')).toBe('text/csv');
    expect(headerValue({}, 'content-type')).toBeUndefined();
  });
});

describe('isFileResponse', () => {
  it.each([
    ['application/pdf', undefined, true],
    ['image/png', undefined, true],
    ['application/vnd.ms-excel', undefined, true],
    ['multipart/mixed; boundary=x', undefined, true],
    ['application/octet-stream', undefined, true],
    ['text/html', 'attachment; filename="page.html"', true],
    ['image/svg+xml', undefined, true],
    ['application/json; charset=utf-8', undefined, false],
    ['application/json', 'attachment; filename="data.json"', false],
    ['text/csv', 'attachment', false],
    ['application/vnd.api+json', undefined, false],
    ['application/problem+xml', undefined, false],
    ['text/html', undefined, false],
    [undefined, undefined, false],
  ])('classifies content type %s with disposition %s as %s', (contentType, disposition, expected) => {
    const headers: Record<string, string> = {};
    if (contentType) headers['content-type'] = contentType;
    if (disposition) headers['content-disposition'] = disposition;

    expect(isFileResponse(headers)).toBe(expected);
  });
});

describe('readResponseBody', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a JSON body', async () => {
    const headers = { 'content-type': 'application/json' };

    const body = await readResponseBody(new Response('{"id":1}', { headers }), headers, false, LABEL);

    expect(body).toEqual({ id: 1 });
  });

  it('returns the text of a body that is not JSON and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const headers = { 'content-type': 'text/plain' };

    const body = await readResponseBody(new Response('plain text', { headers }), headers, false, LABEL);

    expect(body).toBe('plain text');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('returns an empty string for an empty body', async () => {
    const response = new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_NO_CONTENT });

    expect(await readResponseBody(response, {}, false, LABEL)).toBe('');
  });

  it('returns bytes for a file detected from the headers', async () => {
    const headers = { 'content-type': IS_TEST_CONSTANTS.FILE_CONTENT_TYPE };

    const body = await readResponseBody(new Response(BYTES, { headers }), headers, false, LABEL);

    expect(body).toBeInstanceOf(Uint8Array);
    expect(Array.from(body as Uint8Array)).toEqual(Array.from(BYTES));
  });

  it('returns bytes for a successful response when asked for a file', async () => {
    const headers = { 'content-type': 'application/json' };

    const body = await readResponseBody(new Response('{"id":1}', { headers }), headers, true, LABEL);

    expect(body).toBeInstanceOf(Uint8Array);
  });

  it('still parses a failed response when asked for a file', async () => {
    const headers = { 'content-type': 'application/json' };
    const response = new Response(JSON.stringify({ message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE }), {
      status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND,
      headers,
    });

    expect(await readResponseBody(response, headers, true, LABEL)).toEqual({
      message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE,
    });
  });
});
