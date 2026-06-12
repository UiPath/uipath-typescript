import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ServerError } from '../../../../src/core/errors/server';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

const TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

function queryOf(fullUrl: string): string {
  const idx = fullUrl.indexOf('?');
  return idx === -1 ? '' : fullUrl.slice(idx + 1);
}

const mockTokenManager = {
  getValidToken: vi.fn().mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN),
};

const mockConfig = {
  baseUrl: TEST_CONSTANTS.BASE_URL,
  orgName: TEST_CONSTANTS.ORGANIZATION_ID,
  tenantName: TEST_CONSTANTS.TENANT_ID,
};

const mockExecutionContext = {};

let capturedHeaders: Record<string, string> = {};
let capturedUrl = '';

beforeEach(() => {
  capturedHeaders = {};
  capturedUrl = '';
  global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
    capturedUrl = url;
    capturedHeaders = { ...options.headers };
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ result: 'ok' })),
    });
  });
});

function createClient(clientConfig = {}) {
  return new ApiClient(
    mockConfig as any,
    mockExecutionContext as any,
    mockTokenManager as any,
    clientConfig,
  );
}

describe('ApiClient traceparent', () => {
  it('injects a traceparent header with correct W3C format', async () => {
    const client = createClient();
    await client.get('/test');

    expect(capturedHeaders['traceparent']).toBeDefined();
    expect(capturedHeaders['traceparent']).toMatch(TRACEPARENT_REGEX);
  });

  it('injects x-uipath-traceparent-id with same value as traceparent', async () => {
    const client = createClient();
    await client.get('/test');

    expect(capturedHeaders['x-uipath-traceparent-id']).toBeDefined();
    expect(capturedHeaders['x-uipath-traceparent-id']).toBe(capturedHeaders['traceparent']);
  });

  it('generates different traceId and spanId values', async () => {
    const client = createClient();
    await client.get('/test');

    const parts = capturedHeaders['traceparent'].split('-');
    const traceId = parts[1];
    const spanId = parts[2];

    expect(traceId).not.toBe(spanId.padEnd(32, '0'));
    expect(traceId.slice(0, 16)).not.toBe(spanId);
  });

  it('generates unique traceparent per request', async () => {
    const client = createClient();

    await client.get('/test1');
    const first = capturedHeaders['traceparent'];

    await client.get('/test2');
    const second = capturedHeaders['traceparent'];

    expect(first).not.toBe(second);
  });

  it('allows caller to override traceparent via options.headers', async () => {
    const client = createClient();
    const custom = '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01';

    await client.get('/test', { headers: { traceparent: custom } });

    expect(capturedHeaders['traceparent']).toBe(custom);
  });
});

describe('ApiClient query string serialization', () => {
  it('encodes spaces as %20, not + (required for OData $filter)', async () => {
    const client = createClient();
    await client.get('/test', { params: { $filter: "Status eq 'Running'" } });

    const query = queryOf(capturedUrl);
    expect(query).not.toContain('+');
    expect(query).toContain('%20');
    // URLSearchParams also percent-encodes `$` and the single quotes
    expect(query).toBe("%24filter=Status%20eq%20%27Running%27");
  });

  it('preserves a literal + in a value as %2B (not a space)', async () => {
    const client = createClient();
    await client.get('/test', { params: { tag: 'a+b' } });

    const query = queryOf(capturedUrl);
    expect(query).toBe('tag=a%2Bb');
    expect(query).not.toContain('a+b');
  });

  it('joins multiple params with &', async () => {
    const client = createClient();
    await client.get('/test', { params: { $top: 10, $skip: 5 } });

    expect(queryOf(capturedUrl)).toBe('%24top=10&%24skip=5');
  });

  it('omits the query string entirely when no params are provided', async () => {
    const client = createClient();
    await client.get('/test');

    expect(capturedUrl).not.toContain('?');
  });
});

describe('ApiClient error handling', () => {
  it('throws ServerError when server returns a non-JSON body on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com/api/test',
      text: () => Promise.resolve('<html>Redirect</html>'),
    });

    const client = createClient();
    await expect(client.get('/test')).rejects.toBeInstanceOf(ServerError);
  });

  it('includes the HTTP status and URL in the ServerError message and preserves statusCode', async () => {
    const testUrl = 'https://example.com/api/test';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: testUrl,
      text: () => Promise.resolve('<html>Error</html>'),
    });

    const client = createClient();
    await expect(client.get('/test')).rejects.toMatchObject({
      message: expect.stringContaining(`200 ${testUrl}`),
      statusCode: 200,
    });
  });
});
