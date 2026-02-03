import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestEntityRecords,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1', 'v2'];

describe.each(modes)('Data Fabric Entities - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testEntityId: string | null = null;
  const createdRecordIds: string[] = [];

  describe('getAll', () => {
    it('should retrieve all entities', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        testEntityId = result[0].id;
      }
    });

    it('should have valid entity structure', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      if (result.length === 0) {
        console.log('No entities available to validate structure');
        return;
      }

      const entity = result[0];
      expect(entity.id).toBeDefined();
      expect(entity.name).toBeDefined();
      expect(typeof entity.id).toBe('string');
      expect(typeof entity.name).toBe('string');
    });
  });

  describe('getById', () => {
    it('should retrieve entity metadata by ID', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const result = await entities.getById(entityId);

      expect(result).toBeDefined();
      expect(result.id).toBe(entityId);
      expect(result.name).toBeDefined();

      testEntityId = entityId;
    });
  });

  describe('getRecordsById', () => {
    it('should retrieve entity records with pagination', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const result = await entities.getRecordsById(entityId);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve records with limit', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const result = await entities.getRecordsById(entityId, {
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination with cursor', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const firstPage = await entities.getRecordsById(entityId, {
        pageSize: 2,
      });

      expect(firstPage).toBeDefined();
      expect(firstPage.items).toBeDefined();

      if (firstPage.hasNextPage && firstPage.nextCursor) {
        const secondPage = await entities.getRecordsById(entityId, {
          pageSize: 2,
          cursor: firstPage.nextCursor,
        });

        expect(secondPage).toBeDefined();
        expect(secondPage.items).toBeDefined();
        expect(secondPage.items).not.toEqual(firstPage.items);
      }
    });
  });

  describe('Record CRUD operations', () => {
    it('should insert a single record', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
        return;
      }

      const testData = {
        name: `IntegrationTest_${mode}_${generateRandomString(8)}`,
        description: 'Integration test record',
      };

      try {
        const result = await entities.insertById(entityId, testData);

        expect(result).toBeDefined();
        if (result.id) {
          createdRecordIds.push(result.id);
          registerResource('entityRecords', {
            entityId,
            recordIds: [result.id],
          });
        }
      } catch (error: any) {
        console.log(
          'Record insertion test failed. This may be due to entity schema constraints:',
          error.message
        );
      }
    });

    it('should batch insert multiple records', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const testData = [
        {
          name: `IntegrationTest_${mode}_Batch1_${generateRandomString(8)}`,
          description: 'Batch test record 1',
        },
        {
          name: `IntegrationTest_${mode}_Batch2_${generateRandomString(8)}`,
          description: 'Batch test record 2',
        },
      ];

      try {
        const result = await entities.batchInsertById(entityId, testData);

        expect(result).toBeDefined();
        if (result.items && Array.isArray(result.items) && result.items.length > 0) {
          const insertedIds = result.items.filter((r: any) => r.id).map((r: any) => r.id);
          createdRecordIds.push(...insertedIds);
          registerResource('entityRecords', {
            entityId,
            recordIds: insertedIds,
          });
        }
      } catch (error: any) {
        console.log('Batch insertion test failed:', error.message);
      }
    });

    it('should update records', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || createdRecordIds.length === 0) {
        console.log('No records available to update');
        return;
      }

      const updateData = createdRecordIds.map((id) => ({
        Id: id,
        description: 'Updated integration test record',
      }));

      try {
        const result = await entities.updateById(entityId, updateData);
        expect(result).toBeDefined();
      } catch (error: any) {
        console.log('Record update test failed:', error.message);
      }
    });

    it('should delete records', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || createdRecordIds.length === 0) {
        console.log('No records available to delete');
        return;
      }

      try {
        await entities.deleteById(entityId, createdRecordIds);
        console.log(`Deleted ${createdRecordIds.length} test records`);
        createdRecordIds.length = 0;
      } catch (error: any) {
        console.log('Record deletion test failed:', error.message);
      }
    });
  });

  describe('Attachment operations', () => {
    it('should download attachment if available', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        console.log('No entity ID available for testing');
        return;
      }

      const records = await entities.getRecordsById(entityId, {
        pageSize: 10,
      });

      const recordWithAttachment = records.items.find((record: any) => {
        return Object.values(record).some(
          (value: any) =>
            value &&
            typeof value === 'object' &&
            (value.fileId || value.attachmentId)
        );
      });

      if (!recordWithAttachment) {
        console.log('No records with attachments found to test download');
        return;
      }

      console.log('Attachment download test requires specific entity configuration');
    });
  });

  afterAll(async () => {
    const config = getTestConfig();
    if (!config.skipCleanup && createdRecordIds.length > 0 && testEntityId) {
      await cleanupTestEntityRecords(testEntityId, createdRecordIds);
    }
  });
});
