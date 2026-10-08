import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  getActiveAuth,
  describeIntegration,
  InitMode,
} from '../../config/unified-setup';
import { entityOperationHost, runRead } from '../../../../src/services/data-fabric/operations';
import type { CodedFunctionContext } from '../../../../src/core/config/function-context';

const modes: InitMode[] = ['v0', 'v1'];

describeIntegration('Data Fabric Entity Operations - Integration Tests', 'both', modes, () => {

  let entityName!: string;
  let ctx!: CodedFunctionContext;

  // The host builds its own client from a coded-function context, so the
  // context is assembled from the same credential and host the cell runs under.
  // Org and tenant names are accepted where the runtime would put the ids.
  beforeAll(async () => {
    const { entities } = getServices();
    const config = getTestConfig();
    let entityId = config.dataFabricTestEntityId;
    if (!entityId) {
      const all = await entities.getAll();
      entityId = all.find((e) => !e.name.startsWith('sdk_'))?.id;
    }
    if (!entityId) {
      throw new Error('No entity ID available for testing');
    }
    entityName = (await entities.getById(entityId)).name;

    const { token, baseUrl } = getActiveAuth();
    ctx = {
      platform: { baseUrl, orgId: config.orgName, tenantId: config.tenantName },
      robot: { accessToken: token },
    };
  });

  const input = { params: {}, now: new Date().toISOString(), user: { id: 'integration-test' } };

  describe('entityOperationHost', () => {
    it('should read the entity through ctx.self.query', async () => {
      const output = await runRead(async (opCtx) => opCtx.self.query({ limit: 2 }), input, entityOperationHost(ctx, entityName));
      expect(output.status).toBe('done');
      const rows = (output as { result: unknown[] }).result;
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(2);
      rows.forEach((row) => expect(row).toHaveProperty('Id'));
    });

    it('should return one row by Id through ctx.self.get', async () => {
      const output = await runRead(
        async (opCtx) => {
          const [first] = await opCtx.self.query({ limit: 1 });
          return first ? opCtx.self.get(first.Id as string) : null;
        },
        input,
        entityOperationHost(ctx, entityName),
      );
      expect(output.status).toBe('done');
    });
  });
});
