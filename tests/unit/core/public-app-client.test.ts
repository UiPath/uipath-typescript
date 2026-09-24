import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PublicAppClient, toAppsBaseUrl } from '@/core/http/public-app-client';

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

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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
