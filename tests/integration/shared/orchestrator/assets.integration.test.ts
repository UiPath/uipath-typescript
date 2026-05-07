import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { isNotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Orchestrator Assets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all assets', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      const result = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve assets with pagination options', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      const result = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve assets with filter', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      const result = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 5,
        filter: "ValueType eq 'Text'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should retrieve a specific asset by ID', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      const allAssets = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      expect(allAssets.items.length, 'No assets available to test getById. Create an asset in the tenant first.').toBeGreaterThan(0);

      const assetId = allAssets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      expect(folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await assets.getById(assetId, folderId!);

      expect(result).toBeDefined();
      expect(result.id).toBe(assetId);
      expect(result.name).toBeDefined();
      expect(result.valueType).toBeDefined();
      expect(typeof result.name).toBe('string');
    });
  });

  describe('getByName', () => {
    it('should retrieve an asset by name using folderKey', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      // Pick an existing asset in the folder so we have a real name to look up
      const allAssets = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allAssets.items.length, 'No assets available to test getByName').toBeGreaterThan(0);
      const existing = allAssets.items[0];

      const result = await assets.getByName(existing.name, { folderKey: config.folderKey });

      expect(result).toBeDefined();
      expect(result.id).toBe(existing.id);
      expect(result.name).toBe(existing.name);
      expect(result.key).toBe(existing.key);
    });

    it('should retrieve an asset by name using folderPath', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      expect(config.folderPath, 'INTEGRATION_TEST_FOLDER_PATH must be configured for getByName').toBeDefined();

      const allAssets = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allAssets.items.length, 'No assets available to test getByName').toBeGreaterThan(0);
      const existing = allAssets.items[0];

      const result = await assets.getByName(existing.name, { folderPath: config.folderPath });

      expect(result).toBeDefined();
      expect(result.id).toBe(existing.id);
      expect(result.name).toBe(existing.name);
    });

    it('should return transformed camelCase fields (no PascalCase leaks)', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      const allAssets = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allAssets.items.length, 'No assets available to validate transform').toBeGreaterThan(0);

      const result = await assets.getByName(allAssets.items[0].name, { folderKey: config.folderKey });

      // Transformed camelCase fields should be present
      expect(result.createdTime).toBeDefined();
      expect(result.valueType).toBeDefined();
      // Original PascalCase keys from the raw OData payload must be gone
      expect((result as any).CreationTime).toBeUndefined();
      expect((result as any).LastModificationTime).toBeUndefined();
      expect((result as any).ValueType).toBeUndefined();
    });

    it('should throw NotFoundError for a nonexistent asset name', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      const missingName = `__uipath-sdk-nonexistent-asset-${Date.now()}`;
      await expect(
        assets.getByName(missingName, { folderKey: config.folderKey }),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('Asset structure validation', () => {
    it('should have expected fields in asset objects', async () => {
      const { assets } = getServices();
      const config = getTestConfig();

      const result = await assets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      expect(result.items.length, 'No assets available to validate structure').toBeGreaterThan(0);

      const asset = result.items[0];

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.name).toBeDefined();
      expect(asset.key).toBeDefined();
      expect(asset.valueType).toBeDefined();
      expect(typeof asset.id).toBe('number');
      expect(typeof asset.name).toBe('string');
      expect(typeof asset.key).toBe('string');
    });
  });
});
