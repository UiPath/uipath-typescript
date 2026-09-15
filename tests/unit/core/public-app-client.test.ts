import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PublicAppClient } from '@/core/http/public-app-client';

describe('PublicAppClient', () => {
  const baseUrl = 'https://alpha.api.uipath.com';
  const orgName = 'acme';
  const appKey = 'uapp_testkey';
  const integrationBase = `${baseUrl}/${orgName}/apps_/default/api/v1/default/integrations/codedapp`;

  let client: PublicAppClient;
  let fetchMock: any;

  beforeEach(() => {
    client = new PublicAppClient(baseUrl, orgName, appKey);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.restoreAllMocks());

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('posts to the single invoke route, on the path the Apps service is actually mounted at', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { value: [{ Key: 'J-1' }] }));

    const started = await client.invoke('orchestrator.startJob', {
      resource: { type: 'process', key: 'InvoiceBinding' },
      payload: { startInfo: { releaseKey: 'InvoiceBinding' } },
    });

    expect(started).toEqual({ value: [{ Key: 'J-1' }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${integrationBase}/invoke`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-UiPath-App-Key']).toBe(appKey);
    expect(JSON.parse(init.body)).toEqual({
      operation: 'orchestrator.startJob',
      resource: { type: 'process', key: 'InvoiceBinding' },
      payload: { startInfo: { releaseKey: 'InvoiceBinding' } },
    });
  });

  it('names the operation and the resource id for a read, without a payload', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { OutputArguments: '{"total":5}' }));

    await client.invoke('orchestrator.getJob', { resourceId: 'J-1' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      operation: 'orchestrator.getJob',
      resourceId: 'J-1',
    });
  });

  it('on 401 it bootstraps a session then retries the original request once', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // first call: no session
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // POST /session
      .mockResolvedValueOnce(json(201, { value: [{ Key: 'J-2' }] })); // retry

    const started = await client.invoke('orchestrator.startJob', { resource: { type: 'process', key: 'p' } });

    expect(started).toEqual({ value: [{ Key: 'J-2' }] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${integrationBase}/session`);
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(fetchMock.mock.calls[1][1].headers['X-UiPath-App-Key']).toBe(appKey);
  });

  it('throws if session bootstrap fails (app not public / feature off)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 })); // /session denied

    await expect(client.invoke('orchestrator.startJob', { resource: { type: 'process', key: 'p' } })).rejects.toBeTruthy();
  });

  it('surfaces a 404 (the session does not own the resource)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(client.invoke('orchestrator.getJob', { resourceId: 'someone-elses-job' })).rejects.toBeTruthy();
  });
});
