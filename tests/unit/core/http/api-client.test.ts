import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ServerError } from '../../../../src/core/errors/server';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

const TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

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

beforeEach(() => {
  capturedHeaders = {};
  global.fetch = vi.fn().mockImplementation((_url: string, options: any) => {
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

describe('ApiClient error handling', () => {
  it('throws ServerError when server returns a non-JSON body on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com/api/test',
      text: () => Promise.resolve('<html>Redirect</html>'),
      blob: () => Promise.resolve(new Blob()),
    });

    const client = createClient();
    await expect(client.get('/test')).rejects.toBeInstanceOf(ServerError);
  });

  it('includes the HTTP status code and URL in the ServerError message', async () => {
    const testUrl = 'https://example.com/api/test';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: testUrl,
      text: () => Promise.resolve('<html>Error</html>'),
      blob: () => Promise.resolve(new Blob()),
    });

    const client = createClient();
    await expect(client.get('/test')).rejects.toMatchObject({
      message: expect.stringContaining('non-JSON response'),
    });
  });
});
