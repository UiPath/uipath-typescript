import { describe, it, expect } from 'vitest';
import { unwrapProxyResponse } from '@/services/integration-service/execution/proxy-response';
import type { ExecuteResult } from '@/models/integration-service/execution.types';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';
import { HTTP_TEST_CONSTANTS } from '@tests/utils/constants';

/** The answer Integration Service gives to a passthrough call: always 200, vendor response inside. */
const carrier = (body: unknown): ExecuteResult => ({
  ok: true,
  status: HTTP_TEST_CONSTANTS.STATUS_OK,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body,
});

describe('unwrapProxyResponse', () => {
  it('returns the vendor status, headers and body for a vendor success', () => {
    const result = unwrapProxyResponse(
      carrier({
        code: HTTP_TEST_CONSTANTS.STATUS_OK,
        statusText: 'OK',
        headers: { 'x-vendor-request-id': 'abc' },
        body: [{ id: 1 }],
      }),
    );

    expect(result).toEqual({
      ok: true,
      status: HTTP_TEST_CONSTANTS.STATUS_OK,
      statusText: 'OK',
      headers: { 'x-vendor-request-id': 'abc' },
      body: [{ id: 1 }],
      isVendorError: false,
    });
  });

  it('marks a vendor non-2xx as a vendor error although Integration Service answered 200', () => {
    const result = unwrapProxyResponse(
      carrier({
        code: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND,
        statusText: 'Not Found',
        headers: {},
        body: { message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    expect(result.isVendorError).toBe(true);
    expect(result.body).toEqual({ message: IS_TEST_CONSTANTS.VENDOR_ERROR_MESSAGE });
  });

  it('falls back to the raw string body when the vendor body is not JSON', () => {
    const result = unwrapProxyResponse(
      carrier({ code: HTTP_TEST_CONSTANTS.STATUS_OK, rawStringBody: '<html></html>' }),
    );

    expect(result.body).toBe('<html></html>');
  });

  it('prefers the parsed body over the raw string body', () => {
    const result = unwrapProxyResponse(
      carrier({ code: HTTP_TEST_CONSTANTS.STATUS_OK, body: { id: 1 }, rawStringBody: '{"id":1}' }),
    );

    expect(result.body).toEqual({ id: 1 });
  });

  it('defaults the status text and headers the vendor response lacks', () => {
    const result = unwrapProxyResponse(carrier({ code: HTTP_TEST_CONSTANTS.STATUS_NO_CONTENT }));

    expect(result.statusText).toBe('');
    expect(result.headers).toEqual({});
    expect(result.body).toBeUndefined();
  });

  it('turns non-string header values into strings and drops empty ones', () => {
    const result = unwrapProxyResponse(
      carrier({ code: HTTP_TEST_CONSTANTS.STATUS_OK, headers: { 'content-length': 42, 'x-empty': null } }),
    );

    expect(result.headers).toEqual({ 'content-length': '42' });
  });

  it('returns the Integration Service response when the call did not reach the vendor', () => {
    const failure: ExecuteResult = {
      ok: false,
      status: HTTP_TEST_CONSTANTS.STATUS_UNAUTHORIZED,
      statusText: 'Unauthorized',
      headers: {},
      body: { message: IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND },
    };

    expect(unwrapProxyResponse(failure)).toEqual({ ...failure, isVendorError: false });
  });

  it.each([
    ['a list', [{ id: 1 }]],
    ['text', 'plain text'],
    ['an object without a vendor status', { id: 1 }],
    ['an object whose status is not a number', { code: '200' }],
  ])('returns the response as is when the body is %s', (_label, body) => {
    const result = unwrapProxyResponse(carrier(body));

    expect(result.body).toEqual(body);
    expect(result.status).toBe(HTTP_TEST_CONSTANTS.STATUS_OK);
    expect(result.isVendorError).toBe(false);
  });
});
