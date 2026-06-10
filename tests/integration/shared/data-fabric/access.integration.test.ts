import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

// Data Fabric role and directory APIs require DataFabric.Data.Read on the test
// external app. The standard CI tenant currently returns 403 for these APIs.
describe.each(modes)('Data Fabric Access - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  beforeAll(() => {
    if (process.env.DATA_FABRIC_ACCESS_INTEGRATION !== 'true') {
      throw new Error(
        'DATA_FABRIC_ACCESS_INTEGRATION must be set to run Data Fabric access integration tests ' +
        '(requires DataFabric.Data.Read on the configured external app/PAT)'
      );
    }
  });

  describe('roles.getAll', () => {
    it('should retrieve Data Fabric roles', async () => {
      const { dataFabricRoles } = getServices();

      const roles = await dataFabricRoles.getAll();

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);

      const role = roles[0];
      expect(role.id).toBeDefined();
      expect(role.name).toBeDefined();
      expect(typeof role.id).toBe('string');
      expect(typeof role.name).toBe('string');
    });

    it('should support disabling role stats', async () => {
      const { dataFabricRoles } = getServices();

      const roles = await dataFabricRoles.getAll({ stats: false });

      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe('directory.list', () => {
    it('should retrieve one page of Data Fabric directory principals', async () => {
      const { dataFabricDirectory } = getServices();

      const page = await dataFabricDirectory.list({ skip: 0, top: 1 });

      expect(page).toBeDefined();
      expect(Array.isArray(page.results)).toBe(true);
      expect(page.results.length).toBeLessThanOrEqual(1);

      expect(typeof page.totalCount).toBe('number');

      if (page.results.length > 0) {
        const principal = page.results[0];
        expect(principal.externalId).toBeDefined();
        expect(typeof principal.externalId).toBe('string');
        expect(Array.isArray(principal.roles)).toBe(true);
      }
    });
  });

  describe('directory.getAll', () => {
    it('should retrieve all Data Fabric directory principals', async () => {
      const { dataFabricDirectory } = getServices();

      const principals = await dataFabricDirectory.getAll({ pageSize: 100 });

      expect(Array.isArray(principals)).toBe(true);

      if (principals.length > 0) {
        const principal = principals[0];
        expect(principal.externalId).toBeDefined();
        expect(typeof principal.externalId).toBe('string');
        expect(Array.isArray(principal.roles)).toBe(true);
      }
    });
  });

});
