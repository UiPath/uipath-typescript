import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1', 'v2'];

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

      if (allAssets.items.length === 0) {
        console.log('No assets available to test getById. Create an asset in the tenant first.');
        return;
      }

      const assetId = allAssets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping getById test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await assets.getById(assetId, folderId);

      expect(result).toBeDefined();
      expect(result.id).toBe(assetId);
      expect(result.name).toBeDefined();
      expect(result.valueType).toBeDefined();
      expect(typeof result.name).toBe('string');
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

      if (result.items.length === 0) {
        console.log('No assets available to validate structure');
        return;
      }

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
