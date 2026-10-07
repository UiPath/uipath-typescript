import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PublicAppClient, publicBindingKey, toAppsBaseUrl } from '@/core/http/public-app-client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * PublicAppClient: cookie-credentialed calls to the Apps service for anonymous coded apps, with single-flight
 * session bootstrap on 401.
 */
describe('PublicAppClient', () => {
  const routes = 'https://alpha.uipath.com/my-org/apps_/default/api/v1/default/integrations/codedapp';
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: PublicAppClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    client = new PublicAppClient('https://alpha.api.uipath.com', 'my-org', 'uapp_key');
  });

  afterEach(() => vi.restoreAllMocks());

  it('startProcess POSTs to the Apps origin with the app key and credentials', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { value: [{ Key: 'J-1', State: 'Pending' }] }));

    const started = await client.startProcess('Invoices.Shared', '{"a":1}');

    expect(started).toEqual({ value: [{ Key: 'J-1', State: 'Pending' }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/orchestrator/processes/Invoices.Shared/jobs`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-UiPath-App-Key']).toBe('uapp_key');
    expect(JSON.parse(init.body)).toEqual({ inputArguments: '{"a":1}' });
  });

  it('getJob GETs the job output route', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { Key: 'J-1', OutputArguments: '{"Sum":12}' }));

    const job = await client.getJob('J-1');

    expect(job).toEqual({ Key: 'J-1', OutputArguments: '{"Sum":12}' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/orchestrator/jobs/J-1/output`);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('insertRecord POSTs the record as JSON to the entity records route', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { Id: 'R-1', Title: 'x' }));

    const record = await client.insertRecord('Orders', { Title: 'x' });

    expect(record).toEqual({ Id: 'R-1', Title: 'x' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/datafabric/entities/Orders/records`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ Title: 'x' });
  });

  it('getRecord and listRecords GET the record routes, with start and limit only when given', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { Id: 'R-1' })).mockResolvedValueOnce(json(200, { value: [] })).mockResolvedValueOnce(json(200, { value: [] }));

    await client.getRecord('Orders', 'R 1');
    await client.listRecords('Orders', { start: 20, limit: 10 });
    await client.listRecords('Orders');

    expect(fetchMock.mock.calls[0][0]).toBe(`${routes}/datafabric/entities/Orders/records/R%201`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${routes}/datafabric/entities/Orders/records?start=20&limit=10`);
    expect(fetchMock.mock.calls[2][0]).toBe(`${routes}/datafabric/entities/Orders/records`);
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
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // first call: no session
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // POST /session
      .mockResolvedValueOnce(json(200, { value: [{ Key: 'J-2' }] })); // retry

    const started = await client.startProcess('Invoices.Shared');

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

    await expect(client.startProcess('Invoices.Shared')).rejects.toBeDefined();
  });

  it('surfaces a 404 when the session cannot read the job', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(client.getJob('someone-elses-job')).rejects.toBeDefined();
  });
});

describe('publicBindingKey', () => {
  it('scopes the name by folder path when there is one, the way bindings_v2.json keys it', () => {
    expect(publicBindingKey('Invoices', 'Shared/Finance')).toBe('Invoices.Shared/Finance');
    expect(publicBindingKey('Orders')).toBe('Orders');
  });
});

describe('toAppsBaseUrl', () => {
  it('maps each API host to the Apps origin behind it', () => {
    expect(toAppsBaseUrl('https://alpha.api.uipath.com')).toBe('https://alpha.uipath.com');
    expect(toAppsBaseUrl('https://staging.api.uipath.com/')).toBe('https://staging.uipath.com');
    expect(toAppsBaseUrl('https://api.uipath.com')).toBe('https://cloud.uipath.com');
  });

  it('keeps a base URL that is not an API host', () => {
    expect(toAppsBaseUrl('https://alpha.uipath.com')).toBe('https://alpha.uipath.com');
    expect(toAppsBaseUrl('https://automation.contoso.com/')).toBe('https://automation.contoso.com');
  });
});
