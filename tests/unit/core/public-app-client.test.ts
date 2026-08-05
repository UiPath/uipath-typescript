import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PublicAppClient } from '@/core/http/public-app-client';

/**
 * PublicAppClient: same-origin, cookie-credentialed calls to the Apps gateway for
 * anonymous coded apps, with single-flight session bootstrap on 401.
 */
describe('PublicAppClient', () => {
  const base = 'https://cloud.uipath.com';
  const gateway = `${base}/my_org/apps_/integrations/codedapp/app-123`;
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: PublicAppClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    client = new PublicAppClient(base, 'my_org', 'app-123');
  });

  afterEach(() => vi.restoreAllMocks());

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('startProcess POSTs to the gateway route with credentials and returns the job', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { jobKey: 'J-1', state: 'Pending' }));

    const job = await client.startProcess('proc-1', { amount: 5 });

    expect(job).toEqual({ jobKey: 'J-1', state: 'Pending' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${gateway}/orchestrator/processes/proc-1/jobs`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ inputArguments: { amount: 5 } });
  });

  it('getJobOutput GETs the output route', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { output: { result: 42 } }));

    const out = await client.getJobOutput('J-1');

    expect(out).toEqual({ output: { result: 42 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${gateway}/orchestrator/jobs/J-1/output`);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('on 401 it bootstraps a session then retries the original request once', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // first call: no session
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // POST /session
      .mockResolvedValueOnce(json(201, { jobKey: 'J-2' }));        // retry

    const job = await client.startProcess('proc-1');

    expect(job).toEqual({ jobKey: 'J-2' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${gateway}/session`);
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  });

  it('throws if session bootstrap fails (app not public / feature off)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 })); // /session denied

    await expect(client.startProcess('proc-1')).rejects.toBeTruthy();
  });

  it('surfaces a 404 on job output (session does not own the job)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(client.getJobOutput('someone-elses-job')).rejects.toBeTruthy();
  });
});
