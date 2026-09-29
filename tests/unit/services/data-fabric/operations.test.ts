import { afterEach, describe, expect, it, vi } from 'vitest';
import { entityOperationHost, runRead } from '../../../../src/services/data-fabric/operations';
import { EntityService } from '../../../../src/services/data-fabric/entities';
import type { CodedFunctionContext } from '../../../../src/core/config/function-context';

const ctx: CodedFunctionContext = {
  platform: {
    baseUrl: 'https://cloud.uipath.com',
    orgId: 'org-id',
    tenantId: 'tenant-id',
    folderKey: 'invocation-folder',
  },
  robot: { accessToken: 'workload-token' },
};

const input = { params: {}, now: '2026-09-25T10:00:00.000Z', user: { id: 'caller-1' } };
const rows = [{ Id: 'r1', Priority: 'P3' }];

describe('entityOperationHost', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the entity by name in the invocation folder and hands the rows to the runtime', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: rows, totalCount: rows.length } as never);

    const output = await runRead(async (opCtx) => opCtx.self.query({ where: { Priority: 'P3' } }), input, entityOperationHost(ctx, 'Ticket'));

    expect(queryRecords).toHaveBeenCalledWith(
      { name: 'Ticket' },
      expect.objectContaining({
        folderKey: 'invocation-folder',
        filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: 'Priority', operator: '=', value: 'P3' }] },
      }),
    );
    expect(output).toEqual({ status: 'done', result: rows, prints: [] });
  });

  it('reads another entity through ctx.query with the same client', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: [], totalCount: 0 } as never);

    await runRead(
      async (opCtx) => {
        await opCtx.self.query();
        return opCtx.query('Customer');
      },
      input,
      entityOperationHost(ctx, 'Ticket'),
    );

    expect(queryRecords).toHaveBeenNthCalledWith(1, { name: 'Ticket' }, expect.anything());
    expect(queryRecords).toHaveBeenNthCalledWith(2, { name: 'Customer' }, expect.anything());
  });

  it('sends no folder when the context names none', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: [], totalCount: 0 } as never);
    const tenantCtx: CodedFunctionContext = {
      ...ctx,
      platform: { baseUrl: 'https://cloud.uipath.com', orgId: 'org-id', tenantId: 'tenant-id', folderKey: null },
    };

    await runRead(async (opCtx) => opCtx.self.query(), input, entityOperationHost(tenantCtx, 'Ticket'));

    expect(queryRecords).toHaveBeenCalledWith({ name: 'Ticket' }, expect.objectContaining({ folderKey: undefined }));
  });

  it('refuses a name that is not an entity name without calling the SDK', async () => {
    const queryRecords = vi.spyOn(EntityService.prototype, 'queryRecords');

    await expect(entityOperationHost(ctx, 'Ticket').read('../Other', { pageSize: 1 })).rejects.toBeInstanceOf(TypeError);
    expect(queryRecords).not.toHaveBeenCalled();
  });

  it('fails the run with the read error when queryRecords rejects', async () => {
    vi.spyOn(EntityService.prototype, 'queryRecords').mockRejectedValue(new Error('API failure'));

    const output = await runRead(async (opCtx) => opCtx.self.query(), input, entityOperationHost(ctx, 'Ticket'));

    expect(output).toEqual({ status: 'failed', error: { message: 'API failure' }, prints: [] });
  });
});
