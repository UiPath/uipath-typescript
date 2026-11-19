import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PUBLIC_APP_ENDPOINTS, PublicAppClient, publicBindingKey } from '@/core/http/public-app-client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('PublicAppClient', () => {
  const routes = 'https://alpha.api.uipath.com/my-org/apps_/default/api/v1/default/integrations/codedapp';
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: PublicAppClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new PublicAppClient('https://alpha.api.uipath.com', 'my-org', 'uapp_key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs to the Apps route with the app key and credentials', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { value: [{ Key: 'J-1', State: 'Pending' }] }));

    const started = await client.request('POST', PUBLIC_APP_ENDPOINTS.START_JOB('Invoices.Shared'), { body: { inputArguments: '{"a":1}' } });

    expect(started).toEqual({ value: [{ Key: 'J-1', State: 'Pending' }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/orchestrator/processes/Invoices.Shared/jobs`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-UiPath-App-Key']).toBe('uapp_key');
    expect(JSON.parse(init.body)).toEqual({ inputArguments: '{"a":1}' });
  });

  it('request sends a JSON body and query params to an Apps service route', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { Id: 'R-1' }));

    const record = await client.request('POST', 'integrations/codedapp/datafabric/entities/Orders/records', {
      body: { Title: 'x' },
      params: { start: 20, limit: undefined },
    });

    expect(record).toEqual({ Id: 'R-1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/datafabric/entities/Orders/records?start=20`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ Title: 'x' });
  });

  it('serves only the public app routes', () => {
    expect(client.serves('integrations/codedapp/datafabric/entities/Orders/records')).toBe(true);
    expect(client.serves('datafabric_/api/EntityService/Orders/read')).toBe(false);
  });

  it('uploadFile streams the file as is with its type and returns the stored path', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { path: 'report_abc.pdf' }));
    const file = new Blob(['%PDF'], { type: 'application/pdf' });

    const result = await client.uploadFile('Uploads.Shared', 'report.pdf', file);

    expect(result).toEqual({ path: 'report_abc.pdf' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/orchestrator/buckets/Uploads.Shared/files?fileName=report.pdf`);
    expect(init.body).toBe(file);
    expect(init.headers['Content-Type']).toBe('application/pdf');
  });

  it('uploadFile sends bytes without a type as octet-stream and resends them after a session bootstrap', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, { path: 'data_abc' }));
    const bytes = new Uint8Array([1, 2, 3]);

    await client.uploadFile('Uploads', 'data', bytes);

    expect(fetchMock.mock.calls[2][1].body).toBe(bytes);
    expect(fetchMock.mock.calls[2][1].headers['Content-Type']).toBe('application/octet-stream');
  });

  it('on 401 it bootstraps a session then retries the original request once', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, { value: [{ Key: 'J-2' }] }));

    const started = await client.request('POST', PUBLIC_APP_ENDPOINTS.START_JOB('Invoices.Shared'));

    expect(started).toEqual({ value: [{ Key: 'J-2' }] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${routes}/session`);
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(fetchMock.mock.calls[1][1].headers['X-UiPath-App-Key']).toBe('uapp_key');
  });

  it('throws if session bootstrap fails (app not public / feature off)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(client.request('POST', PUBLIC_APP_ENDPOINTS.START_JOB('Invoices.Shared'))).rejects.toBeDefined();
  });

  it('surfaces a 404 when the session cannot read the job', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(client.request('GET', 'integrations/codedapp/orchestrator/jobs/someone-elses-job/output')).rejects.toBeDefined();
  });
});

describe('publicBindingKey', () => {
  it('scopes the name by folder path when there is one, the way bindings_v2.json keys it', () => {
    expect(publicBindingKey('Invoices', 'Shared/Finance')).toBe('Invoices.Shared/Finance');
    expect(publicBindingKey('Orders')).toBe('Orders');
  });
});
