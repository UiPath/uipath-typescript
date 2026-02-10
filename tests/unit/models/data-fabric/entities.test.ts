// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEntityWithMethods } from '../../../../src/models/data-fabric/entities.models';
import type { EntityServiceModel } from '../../../../src/models/data-fabric/entities.models';
import { createBasicEntity, createMockEntityRecord, createMockEntityRecords, createMockSingleInsertResponse, createMockInsertResponse, createMockUpdateResponse, createMockDeleteResponse, createMockBlob } from '../../../utils/mocks/entities';
import { ENTITY_TEST_CONSTANTS } from '../../../utils/constants/entities';

// ===== TEST SUITE =====
describe('Entity Models', () => {
  let mockService: EntityServiceModel;

  beforeEach(() => {
    // Create a mock service
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getRecordsById: vi.fn(),
      getRecordById: vi.fn(),
      insertById: vi.fn(),
      batchInsertById: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
      downloadAttachment: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on entity', () => {
    describe('entity.insert()', () => {
      it('should call entity.insert with entity id and single record', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA;
        const mockResponse = createMockSingleInsertResponse(testData);
        mockService.insertById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.insert(testData);

        expect(mockService.insertById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          undefined
        );
        expect(result).toEqual(mockResponse);
        expect(result.id).toBeDefined();
      });

      it('should call entity.insert with options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA;
        const options = {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
        };
        const mockResponse = createMockSingleInsertResponse(testData, {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
        });
        mockService.insertById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.insert(testData, options);

        expect(mockService.insertById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          options
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.insert(ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA)).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED);
      });
    });

    describe('entity.batchInsert()', () => {
      it('should call entity.batchInsert with entity id and data array', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [
          ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
          ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA_2
        ];
        const mockResponse = createMockInsertResponse(testData);
        mockService.batchInsertById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.batchInsert(testData);

        expect(mockService.batchInsertById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          undefined
        );
        expect(result).toEqual(mockResponse);
        expect(result.successRecords).toHaveLength(2);
        expect(result.failureRecords).toHaveLength(0);
      });

      it('should call entity.batchInsert with options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA];
        const options = {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
          failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
        };
        const mockResponse = createMockInsertResponse(testData, {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
        });
        mockService.batchInsertById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.batchInsert(testData, options);

        expect(mockService.batchInsertById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          options
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.batchInsert([ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA])).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED);
      });

      it('should handle partial failures in batchInsert', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [
          ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
          { name: ENTITY_TEST_CONSTANTS.TEST_INVALID_RECORD_NAME, age: null } // Missing required field
        ];
        const mockResponse = createMockInsertResponse(testData, { successCount: 1 });
        mockService.batchInsertById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.batchInsert(testData);

        expect(result.successRecords).toHaveLength(1);
        expect(result.failureRecords).toHaveLength(1);

        // Validate successful record data
        expect(result.successRecords[0]).toHaveProperty('id');
        expect(result.successRecords[0].name).toBe(testData[0].name);
        expect(result.successRecords[0].age).toBe(testData[0].age);

        // Validate failure record structure
        expect(result.failureRecords[0]).toHaveProperty('error');
        expect(result.failureRecords[0]).toHaveProperty('record');
        expect(result.failureRecords[0].record).toEqual(testData[1]);
        expect(typeof result.failureRecords[0].error).toBe('string');
      });
    });

    describe('entity.update()', () => {
      it('should call entity.update with entity id and data', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [
          { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME, age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE },
          { id: ENTITY_TEST_CONSTANTS.RECORD_ID_2, name: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_NAME, age: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_AGE }
        ];
        const mockResponse = createMockUpdateResponse(testData);
        mockService.updateById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.update(testData);

        expect(mockService.updateById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          undefined
        );
        expect(result).toEqual(mockResponse);
        expect(result.successRecords).toHaveLength(2);
        expect(result.failureRecords).toHaveLength(0);
      });

      it('should call entity.update with options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [
          { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME, age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE }
        ];
        const options = {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
          failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
        };
        const mockResponse = createMockUpdateResponse(testData, { 
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL 
        });
        mockService.updateById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.update(testData, options);

        expect(mockService.updateById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          testData,
          options
        );
        expect(result).toEqual(mockResponse);
        
        // Validate response structure and data
        expect(result.successRecords).toHaveLength(1);
        expect(result.failureRecords).toHaveLength(0);
        expect(result.successRecords[0].id).toBe(testData[0].id);
        expect(result.successRecords[0].name).toBe(testData[0].name);
        expect(result.successRecords[0].age).toBe(testData[0].age);
        
        // Verify expansion level affected the data (reference fields should be objects)
        if (result.successRecords[0].updatedBy) {
          expect(typeof result.successRecords[0].updatedBy).toBe('object');
          expect(result.successRecords[0].updatedBy).toHaveProperty('id');
        }
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.update([
          { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_UPDATED_NAME }
        ])).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED);
      });

      it('should handle partial failures in update', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const testData = [
          { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_VALID_UPDATE_NAME },
          { id: ENTITY_TEST_CONSTANTS.TEST_INVALID_ID, name: ENTITY_TEST_CONSTANTS.TEST_INVALID_UPDATE_NAME }
        ];
        const mockResponse = createMockUpdateResponse(testData, { successCount: 1 });
        mockService.updateById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.update(testData);

        expect(result.successRecords).toHaveLength(1);
        expect(result.failureRecords).toHaveLength(1);
        
        // Validate successful record data
        expect(result.successRecords[0].id).toBe(testData[0].id);
        expect(result.successRecords[0].name).toBe(testData[0].name);
        
        // Validate failure record structure
        expect(result.failureRecords[0]).toHaveProperty('error');
        expect(result.failureRecords[0]).toHaveProperty('record');
        expect(result.failureRecords[0].record).toEqual(testData[1]);
        expect(typeof result.failureRecords[0].error).toBe('string');
      });
    });

    describe('entity.delete()', () => {
      it('should call entity.delete with entity id and record ids', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const recordIds = [
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID_2
        ];
        const mockResponse = createMockDeleteResponse(recordIds);
        mockService.deleteById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.delete(recordIds);

        expect(mockService.deleteById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          recordIds,
          undefined
        );
        expect(result).toEqual(mockResponse);
        expect(result.successRecords).toHaveLength(2);
        expect(result.failureRecords).toHaveLength(0);
      });

      it('should call entity.delete with options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const recordIds = [ENTITY_TEST_CONSTANTS.RECORD_ID];
        const options = {
          failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
        };
        const mockResponse = createMockDeleteResponse(recordIds);
        mockService.deleteById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.delete(recordIds, options);

        expect(mockService.deleteById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          recordIds,
          options
        );
        expect(result).toEqual(mockResponse);
        
        // Validate response structure and data
        expect(result.successRecords).toHaveLength(1);
        expect(result.failureRecords).toHaveLength(0);
        expect(result.successRecords[0]).toHaveProperty('id');
        expect(result.successRecords[0].id).toBe(recordIds[0]);
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.delete([ENTITY_TEST_CONSTANTS.RECORD_ID])).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED);
      });

      it('should handle partial failures in delete', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const recordIds = [
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.TEST_INVALID_ID
        ];
        const mockResponse = createMockDeleteResponse(recordIds, { successCount: 1 });
        mockService.deleteById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.delete(recordIds);

        expect(result.successRecords).toHaveLength(1);
        expect(result.failureRecords).toHaveLength(1);
        
        // Validate successful deletion
        expect(result.successRecords[0]).toHaveProperty('id');
        expect(result.successRecords[0].id).toBe(recordIds[0]);
        
        // Validate failure record structure
        expect(result.failureRecords[0]).toHaveProperty('error');
        expect(result.failureRecords[0]).toHaveProperty('record');
        expect(result.failureRecords[0].record?.id).toBe(recordIds[1]);
        expect(typeof result.failureRecords[0].error).toBe('string');
      });
    });

    describe('entity.getRecords()', () => {
      it('should call entity.getRecords without options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const mockRecords = createMockEntityRecords(5);
        const mockResponse = {
          items: mockRecords,
          totalCount: 5
        };
        mockService.getRecordsById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.getRecords();

        expect(mockService.getRecordsById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          undefined
        );
        expect(result).toEqual(mockResponse);
        expect(result.items).toHaveLength(5);
      });

      it('should call entity.getRecords with expansion level', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const options = {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
        };
        const mockRecords = createMockEntityRecords(3, { 
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL 
        });
        const mockResponse = {
          items: mockRecords,
          totalCount: 3
        };
        mockService.getRecordsById = vi.fn().mockResolvedValue(mockResponse);

        const result = await entity.getRecords(options);

        expect(mockService.getRecordsById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          options
        );
        expect(result).toEqual(mockResponse);
        
        // Validate response structure and data
        expect(result.items).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        
        // Verify expansion level affected the data (reference fields should be objects)
        result.items.forEach(record => {
          expect(record).toHaveProperty('id');
          if (record.recordOwner) {
            expect(typeof record.recordOwner).toBe('object');
            expect(record.recordOwner).toHaveProperty('id');
          }
        });
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.getRecords()).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED);
      });
    });

    describe('entity.getRecord()', () => {
      it('should call getRecordById with entity id, recordId, and no options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const mockRecord = createMockEntityRecord();
        mockService.getRecordById = vi.fn().mockResolvedValue(mockRecord);

        const result = await entity.getRecord(ENTITY_TEST_CONSTANTS.RECORD_ID);

        expect(mockService.getRecordById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          undefined
        );
        expect(result).toEqual(mockRecord);
      });

      it('should call getRecordById with entity id, recordId, and options', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const options = { expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL };
        const mockRecord = createMockEntityRecord({ name: 'Expanded Record' });
        mockService.getRecordById = vi.fn().mockResolvedValue(mockRecord);

        const result = await entity.getRecord(ENTITY_TEST_CONSTANTS.RECORD_ID, options);

        expect(mockService.getRecordById).toHaveBeenCalledWith(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          options
        );
        expect(result).toEqual(mockRecord);
        expect(result.name).toBe('Expanded Record');
      });

      it('should throw error if entity id is undefined', async () => {
        const entityData = createBasicEntity({ id: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.getRecord(ENTITY_TEST_CONSTANTS.RECORD_ID)).rejects.toThrow(
          ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_ID_UNDEFINED
        );
      });

      it('should throw error if record id is undefined', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(entity.getRecord(undefined as any)).rejects.toThrow(
          ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_RECORD_ID_UNDEFINED
        );
      });
    });

    describe('entity.downloadAttachment()', () => {
      it('should call downloadAttachment with entity name, recordId, and fieldName', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const mockBlob = createMockBlob();
        mockService.downloadAttachment = vi.fn().mockResolvedValue(mockBlob);

        const result = await entity.downloadAttachment(
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME
        );

        expect(mockService.downloadAttachment).toHaveBeenCalledWith({
          entityName: ENTITY_TEST_CONSTANTS.ENTITY_NAME,
          recordId: ENTITY_TEST_CONSTANTS.RECORD_ID,
          fieldName: ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME
        });
        expect(result).toBe(mockBlob);
      });

      it('should return blob with correct content type', async () => {
        const entityData = createBasicEntity();
        const entity = createEntityWithMethods(entityData, mockService);

        const mockBlob = createMockBlob('image data', 'image/png');
        mockService.downloadAttachment = vi.fn().mockResolvedValue(mockBlob);

        const result = await entity.downloadAttachment(
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          'ImageField'
        );

        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('image/png');
      });

      it('should throw error if entity name is undefined', async () => {
        const entityData = createBasicEntity({ name: undefined as any });
        const entity = createEntityWithMethods(entityData, mockService);

        await expect(
          entity.downloadAttachment(ENTITY_TEST_CONSTANTS.RECORD_ID, ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME)
        ).rejects.toThrow(ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_ENTITY_NAME_UNDEFINED);
      });
    });
  });

  describe('Entity data and methods are combined correctly', () => {
    it('should preserve all entity properties', () => {
      const entityData = createBasicEntity();
      const entity = createEntityWithMethods(entityData, mockService);

      expect(entity.id).toBe(ENTITY_TEST_CONSTANTS.ENTITY_ID);
      expect(entity.name).toBe(ENTITY_TEST_CONSTANTS.ENTITY_NAME);
      expect(entity.displayName).toBe(ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME);
      expect(entity.description).toBe(ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION);
      expect(entity.fields).toBeDefined();
      expect(entity.fields.length).toBeGreaterThan(0);
    });

    it('should have all methods available', () => {
      const entityData = createBasicEntity();
      const entity = createEntityWithMethods(entityData, mockService);

      expect(typeof entity.insert).toBe('function');
      expect(typeof entity.batchInsert).toBe('function');
      expect(typeof entity.update).toBe('function');
      expect(typeof entity.delete).toBe('function');
      expect(typeof entity.getRecords).toBe('function');
      expect(typeof entity.getRecord).toBe('function');
      expect(typeof entity.downloadAttachment).toBe('function');
    });
  });
});

