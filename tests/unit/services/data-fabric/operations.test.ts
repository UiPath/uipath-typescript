import { afterEach, describe, expect, it, vi } from 'vitest';
import { query } from '../../../../src/services/data-fabric/operations';
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

const rows = [{ Id: 'r1', Priority: 'P3' }];

describe('query (entity operations)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the entity by name in the invocation folder and returns the rows', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: rows, totalCount: rows.length } as never);

    const result = await query(ctx, 'Ticket', { filterGroup: { queryFilters: [] } } as never);

    expect(queryRecords).toHaveBeenCalledWith(
      { name: 'Ticket' },
      expect.objectContaining({ folderKey: 'invocation-folder' }),
    );
    expect(result).toEqual(rows);
  });

  it('lets an explicit folderKey override the invocation folder', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: [], totalCount: 0 } as never);

    await query(ctx, 'Ticket', { folderKey: 'other-folder' } as never);

    expect(queryRecords).toHaveBeenCalledWith({ name: 'Ticket' }, expect.objectContaining({ folderKey: 'other-folder' }));
  });

  it('sends no folder when neither the options nor the context name one', async () => {
    const queryRecords = vi
      .spyOn(EntityService.prototype, 'queryRecords')
      .mockResolvedValue({ items: [], totalCount: 0 } as never);
    const tenantCtx: CodedFunctionContext = {
      ...ctx,
      platform: { baseUrl: 'https://cloud.uipath.com', orgId: 'org-id', tenantId: 'tenant-id' },
    };

    await query(tenantCtx, 'Ticket');

    expect(queryRecords).toHaveBeenCalledWith({ name: 'Ticket' }, expect.objectContaining({ folderKey: undefined }));
  });
});
