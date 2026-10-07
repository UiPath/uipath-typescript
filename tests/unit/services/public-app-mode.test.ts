import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UiPath } from '../../../src/core/uipath';
import { ProcessService } from '../../../src/services/orchestrator/processes';
import { BucketService } from '../../../src/services/orchestrator/buckets';
import { EntityService } from '../../../src/services/data-fabric/entities';
import { AssetService } from '../../../src/services/orchestrator/assets';
import { ValidationError } from '../../../src/core/errors';
import { PUBLIC_APP_UNSUPPORTED_CALL } from '../../../src/core/http/api-client';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

/** Services on a public (anonymous) coded app page: supported calls go to the Apps service, the rest fail clearly. */
describe('public coded app mode', () => {
  const routes = 'https://alpha.uipath.com/my-org/apps_/default/api/v1/default/integrations/codedapp';
  let fetchMock: ReturnType<typeof vi.fn>;
  let sdk: UiPath;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    sdk = new UiPath({ baseUrl: 'https://alpha.api.uipath.com', orgName: 'my-org', tenantName: 'my-tenant', appKey: 'uapp_key' });
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts a process by its binding name and folder path, with the input arguments', async () => {
    fetchMock.mockResolvedValueOnce(json({ value: [{ Key: 'J-1', State: 'Pending' }] }));

    const started = await new ProcessService(sdk).start({ name: 'Invoices' }, { folderPath: 'Shared', inputArguments: '{"a":1}' });

    expect(started[0]).toMatchObject({ key: 'J-1', state: 'Pending' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${routes}/orchestrator/processes/Invoices.Shared/jobs`);
    expect(JSON.parse(init.body)).toEqual({ inputArguments: '{"a":1}' });
  });

  it('sends the binding key even when the page carries an override for it, since the service applies overrides itself', async () => {
    const slot = Symbol.for('uipath.resourceOverwrites.v1');
    (globalThis as any)[slot] = () => ({ 'process.Invoices.Shared': { name: 'Invoices v2', folderPath: 'Shared/Solution 9' } });
    fetchMock.mockResolvedValueOnce(json({ value: [] }));

    try {
      await new ProcessService(sdk).start({ name: 'Invoices' }, { folderPath: 'Shared' });
    } finally {
      delete (globalThis as any)[slot];
    }

    expect(fetchMock.mock.calls[0][0]).toBe(`${routes}/orchestrator/processes/Invoices.Shared/jobs`);
  });

  it('starts a process from the legacy processName form too', async () => {
    fetchMock.mockResolvedValueOnce(json({ value: [] }));

    await new ProcessService(sdk).start({ processName: 'Invoices' });

    expect(fetchMock.mock.calls[0][0]).toBe(`${routes}/orchestrator/processes/Invoices/jobs`);
  });

  it('rejects starting a process by key, which names a release the app can not reach', async () => {
    await expect(new ProcessService(sdk).start({ key: 'release-guid' })).rejects.toBeInstanceOf(ValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('inserts, reads and lists entity records by binding name', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ Id: 'R-1', Title: 'x' }))
      .mockResolvedValueOnce(json({ Id: 'R-1', Title: 'x' }))
      .mockResolvedValueOnce(json({ value: [{ Id: 'R-1' }], totalRecordCount: 1 }));
    const entities = new EntityService(sdk);

    expect(await entities.insertRecord({ name: 'Orders' }, { Title: 'x' })).toEqual({ Id: 'R-1', Title: 'x' });
    expect(await entities.getRecordByName('Orders', 'R-1')).toEqual({ Id: 'R-1', Title: 'x' });
    expect(await entities.getRecordsByName('Orders')).toEqual({ items: [{ Id: 'R-1' }], totalCount: 1 });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${routes}/datafabric/entities/Orders/records`,
      `${routes}/datafabric/entities/Orders/records/R-1`,
      `${routes}/datafabric/entities/Orders/records`,
    ]);
  });

  it('pages entity records with start and limit', async () => {
    fetchMock.mockResolvedValueOnce(json({ value: [{ Id: 'R-3' }, { Id: 'R-4' }], totalRecordCount: 5 }));

    const page = await new EntityService(sdk).getRecordsByName('Orders', { pageSize: 2, jumpToPage: 2 });

    expect(fetchMock.mock.calls[0][0]).toBe(`${routes}/datafabric/entities/Orders/records?start=2&limit=2`);
    expect(page).toMatchObject({ totalCount: 5, hasNextPage: true, nextCursor: { value: '4' }, currentPage: 2, totalPages: 3 });
  });

  it('rejects an entity by id', async () => {
    await expect(new EntityService(sdk).insertRecord({ id: 'entity-guid' }, {})).rejects.toBeInstanceOf(ValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads to a bucket by binding name and returns the path the service picked', async () => {
    fetchMock.mockResolvedValueOnce(json({ path: 'report_abc.pdf' }));

    const result = await new BucketService(sdk).uploadFile({ name: 'Uploads' }, 'report.pdf', new Blob(['x']), { folderPath: 'Shared' });

    expect(result).toEqual({ success: true, statusCode: 200, path: 'report_abc.pdf' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${routes}/orchestrator/buckets/Uploads.Shared/files?fileName=report.pdf`);
  });

  it('rejects a bucket by id', async () => {
    await expect(new BucketService(sdk).uploadFile(7, 'report.pdf', new Blob(['x']))).rejects.toBeInstanceOf(ValidationError);
  });

  it('fails a call the Apps service does not serve with a clear message and no network call', async () => {
    await expect(new AssetService(sdk).getAll()).rejects.toThrow(PUBLIC_APP_UNSUPPORTED_CALL);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
