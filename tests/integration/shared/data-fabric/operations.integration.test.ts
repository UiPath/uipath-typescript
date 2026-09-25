import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  getActiveAuth,
  describeIntegration,
  InitMode,
} from '../../config/unified-setup';
import { hasValidPagination } from '../../utils/helpers';
import { query } from '../../../../src/services/data-fabric/operations';
import type { CodedFunctionContext } from '../../../../src/core/config/function-context';

const modes: InitMode[] = ['v0', 'v1'];

describeIntegration('Data Fabric Entity Operations query - Integration Tests', 'both', modes, () => {

  let entityName!: string;
  let ctx!: CodedFunctionContext;

  // The helper builds its own client from a coded-function context, so the
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

  describe('query', () => {
    it('should read records by entity name with totalCount', async () => {
      const result = await query(ctx, entityName);
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should return a paginated response when pageSize is provided', async () => {
      const result = await query(ctx, entityName, { pageSize: 2 });
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(hasValidPagination(result)).toBe(true);
    });
  });
});
