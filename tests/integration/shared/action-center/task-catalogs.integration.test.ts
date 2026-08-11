import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { TaskCatalogs } from '../../../../src/services/action-center';
import { generateRandomString } from '../../utils/helpers';
import { TaskCatalogRetentionAction } from '../../../../src/models/action-center/task-catalogs.types';
import { FolderScopedOptions } from '../../../../src/models/common/types';

const modes: InitMode[] = ['v1'];

// Created catalogs are torn down in afterAll (SDK exposes no delete).
const createdCatalogIds: number[] = [];

async function deleteCatalog(id: number, folderId: number): Promise<void> {
  const config = getTestConfig();
  const url = `${config.baseUrl}/${config.orgName}/${config.tenantName}/orchestrator_/odata/TaskCatalogs(${id})`;
  await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${config.secret}`,
      'X-UIPATH-OrganizationUnitId': String(folderId),
    },
  });
}

describe.each(modes)('Action Center Task Catalogs - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let taskCatalogs!: TaskCatalogs;
  let folderId: number;
  // The same folder addressed three ways, to prove each header route resolves.
  let folderVariants: { label: string; options: FolderScopedOptions }[];

  beforeAll(() => {
    const config = getTestConfig();
    if (!config.folderId || !config.folderKey || !config.folderPath) {
      throw new Error('INTEGRATION_TEST_FOLDER_ID, INTEGRATION_TEST_FOLDER_KEY and INTEGRATION_TEST_FOLDER_PATH must all be configured to run Task Catalogs integration tests');
    }
    const service = getServices().taskCatalogs;
    if (!service) {
      throw new Error('taskCatalogs service is not registered for this init mode');
    }
    taskCatalogs = service;
    folderId = Number(config.folderId);
    folderVariants = [
      { label: 'folderId', options: { folderId } },
      { label: 'folderKey', options: { folderKey: config.folderKey } },
      { label: 'folderPath', options: { folderPath: config.folderPath } },
    ];
  });

  afterAll(async () => {
    while (createdCatalogIds.length > 0) {
      const id = createdCatalogIds.pop()!;
      await deleteCatalog(id, folderId);
    }
  });

  describe('getAll', () => {
    it.each([0, 1, 2])('should list task catalogs addressing the folder by variant %i', async (variantIndex) => {
      const { options } = folderVariants[variantIndex];

      const result = await taskCatalogs.getAll({ ...options, pageSize: 100 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should page task catalogs', async () => {
      const result = await taskCatalogs.getAll({ folderId, pageSize: 5 });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should surface catalog items with camelCase fields and no PascalCase leaks', async () => {
      const result = await taskCatalogs.getAll({ folderId, pageSize: 1 });
      if (result.items.length === 0) {
        throw new Error('No task catalogs in the folder to verify the getAll transform. Create one first.');
      }

      const catalog = result.items[0];
      expect(catalog.createdTime).toBeDefined();
      expect((catalog as any).CreationTime).toBeUndefined();
      expect((catalog as any).LastModificationTime).toBeUndefined();
      expect(typeof catalog.name).toBe('string');
    });
  });

  describe('getById + transform', () => {
    it('should retrieve a catalog by id with camelCase fields and no PascalCase leaks', async () => {
      const list = await taskCatalogs.getAll({ folderId, pageSize: 1 });
      if (list.items.length === 0) {
        throw new Error('No task catalogs in the folder to exercise getById. Create one first.');
      }

      const id = list.items[0].id;
      const catalog = await taskCatalogs.getById(id, { folderId });

      expect(catalog.id).toBe(id);
      expect(typeof catalog.name).toBe('string');
      expect(catalog.key).toBeDefined();

      expect(catalog.createdTime).toBeDefined();
      expect((catalog as any).CreationTime).toBeUndefined();
      expect((catalog as any).LastModificationTime).toBeUndefined();

      // OData returns the enum name (string), not a numeric code.
      if (catalog.retentionAction !== null) {
        expect(Object.values(TaskCatalogRetentionAction)).toContain(catalog.retentionAction);
      }
    });
  });

  describe('getByName', () => {
    it('should resolve a catalog by name and match its id', async () => {
      const list = await taskCatalogs.getAll({ folderId, pageSize: 1 });
      if (list.items.length === 0) {
        throw new Error('No task catalogs in the folder to exercise getByName. Create one first.');
      }

      const expected = list.items[0];
      const byName = await taskCatalogs.getByName(expected.name, { folderId });

      expect(byName.id).toBe(expected.id);
      expect(byName.name).toBe(expected.name);
      expect((byName as any).CreationTime).toBeUndefined();
    });

    it('should resolve a catalog by name addressing the folder by key', async () => {
      const list = await taskCatalogs.getAll({ folderId, pageSize: 1 });
      if (list.items.length === 0) {
        throw new Error('No task catalogs in the folder to exercise getByName. Create one first.');
      }

      const expected = list.items[0];
      const byName = await taskCatalogs.getByName(expected.name, { folderKey: getTestConfig().folderKey });

      expect(byName.id).toBe(expected.id);
    });
  });

  describe('create and update lifecycle', () => {
    it('should create a catalog, read it back, and update it (by id and by name)', async () => {
      const name = `sdk-it-${generateRandomString(8)}`;

      const created = await taskCatalogs.create(
        name,
        { description: 'SDK integration test catalog', retentionAction: TaskCatalogRetentionAction.Delete, retentionPeriod: 30, folderId },
      );
      createdCatalogIds.push(created.id);

      expect(created.id).toBeGreaterThan(0);
      expect(created.name).toBe(name);
      expect((created as any).CreationTime).toBeUndefined();

      // Read back addressing the folder by key (different header route than create).
      const fetched = await taskCatalogs.getById(created.id, { folderKey: getTestConfig().folderKey });
      expect(fetched.name).toBe(name);

      // Update by id, passing only the description; name + retention must be preserved (read-modify-write).
      const updatedDescription = 'SDK integration test catalog (updated)';
      const updateResult = await taskCatalogs.updateById(
        created.id,
        { description: updatedDescription, folderPath: getTestConfig().folderPath },
      );
      expect(updateResult).toBeUndefined();

      const afterUpdate = await taskCatalogs.getById(created.id, { folderId });
      expect(afterUpdate.name).toBe(name);
      expect(afterUpdate.description).toBe(updatedDescription);
      expect(afterUpdate.retentionAction).toBe(TaskCatalogRetentionAction.Delete);
      expect(afterUpdate.retentionPeriod).toBe(30);

      // Update by name (resolves the id internally).
      const updatedAgain = 'SDK integration test catalog (updated by name)';
      await taskCatalogs.updateByName(name, { description: updatedAgain, folderId });

      const afterNameUpdate = await taskCatalogs.getById(created.id, { folderId });
      expect(afterNameUpdate.description).toBe(updatedAgain);
    });
  });
});
