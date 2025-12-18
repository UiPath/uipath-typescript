// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntityService } from '../../../../src/services/data-fabric/entities';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockEntityResponse,
  createMockEntities,
  createMockEntityRecords,
  createMockInsertResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
  createMockEntityWithExternalFields,
  createMockEntityWithNestedReferences,
  createMockEntityWithSqlFieldTypes
} from '../../../utils/mocks/entities';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import type {
  EntityGetRecordsByIdOptions,
  EntityInsertOptions,
  EntityUpdateOptions,
  EntityDeleteOptions,
  EntityRecord,
  DownloadAttachmentOptions
} from '../../../../src/models/data-fabric/entities.types';
import { ENTITY_TEST_CONSTANTS } from '../../../utils/constants/entities';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('EntityService Unit Tests', () => {
  let entityService: EntityService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    entityService = new EntityService(config, executionContext, tokenManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get entity by ID successfully with all fields mapped correctly', async () => {
      const mockResponse = createMockEntityResponse();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(ENTITY_TEST_CONSTANTS.ENTITY_ID);
      expect(result.name).toBe(ENTITY_TEST_CONSTANTS.ENTITY_NAME);
      expect(result.displayName).toBe(ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME);
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(3);

      // Verify the API call has correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        {}
      );

      // Verify entity has methods attached
      expect(typeof result.insert).toBe('function');
      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
      expect(typeof result.getRecords).toBe('function');
    });

    it('should get entity with external fields successfully and transform field metadata', async () => {
      const mockResponse = createMockEntityWithExternalFields();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      expect(result).toBeDefined();
      expect(result.externalFields).toBeDefined();
      expect(result.externalFields?.length).toBeGreaterThan(0);
      expect(result.externalFields![0].externalObjectDetail).toBeDefined();
      expect(result.externalFields![0].externalConnectionDetail).toBeDefined();
      
      // Verify external field metadata field name transformation (fieldDefinition → fieldMetaData)
      const externalField = result.externalFields![0].fields![0];
      expect(externalField.fieldMetaData).toBeDefined();
      expect(externalField.fieldMetaData.id).toBe(ENTITY_TEST_CONSTANTS.FIELD_ID);
      expect(externalField.fieldMetaData.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_EXTERNAL_FIELD);
      
      // NOTE: External fields currently do NOT transform SQL types to friendly names
      // They only transform field names (sqlType → fieldDataType, createTime → createdTime)
      // This tests the ACTUAL current behavior
      expect(externalField.fieldMetaData.fieldDataType).toBeDefined();
      expect(externalField.fieldMetaData.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_NVARCHAR);  // Stays as SQL type
    });

    it('should transform nested reference fields correctly', async () => {
      const mockResponse = createMockEntityWithNestedReferences();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      expect(result).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(3);

      // Verify referenceEntity field is transformed
      const refEntityField = result.fields.find(f => f.name === 'customerId');
      expect(refEntityField).toBeDefined();
      expect(refEntityField?.referenceEntity).toBeDefined();
      expect(refEntityField?.referenceEntity?.id).toBe('ref-entity-id');
      expect(refEntityField?.referenceEntity?.name).toBe(ENTITY_TEST_CONSTANTS.REFERENCE_ENTITY_CUSTOMER);

      // Verify referenceChoiceSet field is transformed
      const refChoiceSetField = result.fields.find(f => f.name === 'status');
      expect(refChoiceSetField).toBeDefined();
      expect(refChoiceSetField?.referenceChoiceSet).toBeDefined();
      expect(refChoiceSetField?.referenceChoiceSet?.id).toBe('ref-choiceset-id');
      expect(refChoiceSetField?.referenceChoiceSet?.name).toBe(ENTITY_TEST_CONSTANTS.REFERENCE_CHOICESET_STATUS);

      // Verify referenceField.definition is transformed
      const refFieldField = result.fields.find(f => f.name === 'relatedField');
      expect(refFieldField).toBeDefined();
      expect(refFieldField?.referenceField).toBeDefined();
      expect(refFieldField?.referenceField?.definition).toBeDefined();
      expect(refFieldField?.referenceField?.definition?.id).toBe('ref-field-def-id');
      expect(refFieldField?.referenceField?.definition?.name).toBe(ENTITY_TEST_CONSTANTS.REFERENCE_FIELD_DEF);
    });

    it('should transform SQL field types to friendly names', async () => {
      const mockResponse = createMockEntityWithSqlFieldTypes();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      expect(result).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(6);

      // Verify UNIQUEIDENTIFIER -> UUID
      const uuidField = result.fields.find(f => f.name === 'id');
      expect(uuidField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_UUID);

      // Verify NVARCHAR -> STRING
      const stringField = result.fields.find(f => f.name === 'name');
      expect(stringField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_STRING);
      expect(stringField?.fieldDataType.lengthLimit).toBe(255);

      // Verify INT -> INTEGER
      const intField = result.fields.find(f => f.name === 'age');
      expect(intField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_INTEGER);

      // Verify DATETIME2 -> DATETIME
      const datetimeField = result.fields.find(f => f.name === 'createdDate');
      expect(datetimeField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_DATETIME);

      // Verify BIT -> BOOLEAN
      const boolField = result.fields.find(f => f.name === 'isActive');
      expect(boolField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_BOOLEAN);

      // Verify DECIMAL -> DECIMAL (stays the same)
      const decimalField = result.fields.find(f => f.name === 'price');
      expect(decimalField?.fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_DECIMAL);
      expect(decimalField?.fieldDataType.decimalPrecision).toBe(2);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getAll', () => {
    it('should return all entities with methods attached', async () => {
      const mockEntities = createMockEntities(3);
      mockApiClient.get.mockResolvedValue(mockEntities);

      const result = await entityService.getAll();

      // Verify the result
      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      
      // Verify each entity has methods
      result.forEach(entity => {
        expect(typeof entity.insert).toBe('function');
        expect(typeof entity.update).toBe('function');
        expect(typeof entity.delete).toBe('function');
        expect(typeof entity.getRecords).toBe('function');
      });

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL,
        {}
      );

      expect(result[0].fields).toBeDefined();
      expect(result[0].fields.length).toBe(3);
      expect(result[0].fields[0].name).toBe('id');
      expect(result[0].fields[0].fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_UUID);
      expect(result[0].fields[1].name).toBe('name');
      expect(result[0].fields[1].fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_STRING);
      expect(result[0].fields[2].name).toBe('age');
      expect(result[0].fields[2].fieldDataType.name).toBe(ENTITY_TEST_CONSTANTS.FIELD_TYPE_INTEGER);
    });

    it('should apply EntityMap transformations correctly to all entities', async () => {
      // Create mock with RAW API field names (before transformation)
      const mockEntitiesRaw = createMockEntities(2);
      mockApiClient.get.mockResolvedValue(mockEntitiesRaw);

      const result = await entityService.getAll();

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      result.forEach(entity => {
        // Verify EntityMap transformations on entity level
        // createTime -> createdTime
        expect(entity.createdTime).toBeDefined();
        expect(entity.createdTime).toBe(ENTITY_TEST_CONSTANTS.CREATED_TIME);
        expect(entity).not.toHaveProperty('createTime'); // Raw field should not exist

        // updateTime -> updatedTime
        expect(entity.updatedTime).toBeDefined();
        expect(entity.updatedTime).toBe(ENTITY_TEST_CONSTANTS.UPDATED_TIME);
        expect(entity).not.toHaveProperty('updateTime'); // Raw field should not exist

        // Verify field-level transformations
        entity.fields.forEach(field => {
          // sqlType -> fieldDataType
          expect(field.fieldDataType).toBeDefined();
          expect(field.fieldDataType.name).toBeDefined();
          expect(field).not.toHaveProperty('sqlType'); // Raw field should not exist

          // Use type assertion to check for any remaining raw field names
          const fieldAsAny = field as any;
          expect(fieldAsAny.fieldDefinition).toBeUndefined(); // Raw field should not exist
          expect(fieldAsAny.createTime).toBeUndefined(); // Raw field should not exist  
          expect(fieldAsAny.updateTime).toBeUndefined(); // Raw field should not exist
        });
      });

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL,
        {}
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(entityService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getRecordsById', () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.mocked(PaginationHelpers.getAll).mockReset();
    });

    it('should return all records without pagination', async () => {
      const mockRecords = createMockEntityRecords(5);
      const mockResponse = {
        items: mockRecords,
        totalCount: 5
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityService.getRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['expansionLevel']
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(5);
    });

    it('should return paginated records when pagination options provided', async () => {
      const mockRecords = createMockEntityRecords(10);
      const mockResponse = {
        items: mockRecords,
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: EntityGetRecordsByIdOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      } as EntityGetRecordsByIdOptions;

      const result = await entityService.getRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, options) as any;

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
    });

    it('should handle expansion level option', async () => {
      // With expansionLevel, reference fields should be expanded to objects
      const mockRecords = createMockEntityRecords(3, { 
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL 
      });
      const mockResponse = {
        items: mockRecords,
        totalCount: 3
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: EntityGetRecordsByIdOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
      } as EntityGetRecordsByIdOptions;

      await entityService.getRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['expansionLevel']
        }),
        expect.objectContaining({
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(entityService.getRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('insertById', () => {
    it('should insert records successfully', async () => {
      const testData = [
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA_2
      ];

      const mockResponse = createMockInsertResponse(testData);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the data we sent (with IDs added)
      expect(result.successRecords[0].name).toBe(testData[0].name);
      expect(result.successRecords[0].age).toBe(testData[0].age);
      expect(result.successRecords[0]).toHaveProperty('id');
      expect(result.successRecords[1].name).toBe(testData[1].name);
      expect(result.successRecords[1]).toHaveProperty('id');

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        testData,
        expect.objectContaining({
          params: expect.any(Object)
        })
      );
    });

    it('should insert records with options', async () => {
      const testData = [{
        ...ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        recordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
        createdBy: ENTITY_TEST_CONSTANTS.USER_ID
      }];
      const options: EntityInsertOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
      } as EntityInsertOptions;

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockInsertResponse(testData, { 
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL 
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData, options);

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
          })
        })
      );

      // Verify reference fields are expanded in the response
      expect(result.successRecords[0].recordOwner).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
      expect(result.successRecords[0].createdBy).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
    });

    it('should handle partial insert failures', async () => {
      const testData = [
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        { name: ENTITY_TEST_CONSTANTS.TEST_INVALID_RECORD_NAME, age: null } // Invalid data
      ];

      // First record succeeds, second fails (1 success, 1 failure from testData)
      const mockResponse = createMockInsertResponse(testData, { successCount: 1 });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData);

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty('error');
      expect(result.failureRecords[0]).toHaveProperty('record');
      // Verify the failure contains the record we tried to insert
      expect(result.failureRecords[0].record).toEqual(testData[1]);
      // Verify the success record has the data plus generated ID
      expect(result.successRecords[0].name).toBe(testData[0].name);
      expect(result.successRecords[0].age).toBe(testData[0].age);
      expect(result.successRecords[0]).toHaveProperty('id');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(entityService.insertById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        [ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA]
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateById', () => {
    it('should update records successfully', async () => {
      const testData: EntityRecord[] = [
        { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME, age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE },
        { id: ENTITY_TEST_CONSTANTS.RECORD_ID_2, name: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_NAME, age: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_AGE }
      ];

      const mockResponse = createMockUpdateResponse(testData);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the data we sent
      expect(result.successRecords).toEqual(testData);

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        testData,
        expect.objectContaining({
          params: expect.any(Object)
        })
      );
    });

    it('should update records with options', async () => {
      const testData: EntityRecord[] = [
        { 
          id: ENTITY_TEST_CONSTANTS.RECORD_ID, 
          name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME, 
          age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
          recordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
          updatedBy: ENTITY_TEST_CONSTANTS.USER_ID
        }
      ];
      const options: EntityUpdateOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
      } as EntityUpdateOptions;

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockUpdateResponse(testData, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData, options);

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
          })
        })
      );

      // Verify reference fields are expanded in the response
      expect(result.successRecords[0].recordOwner).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
      expect(result.successRecords[0].updatedBy).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
    });

    it('should handle partial update failures', async () => {
      const testData: EntityRecord[] = [
        { id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_VALID_UPDATE_NAME },
        { id: ENTITY_TEST_CONSTANTS.TEST_INVALID_ID, name: ENTITY_TEST_CONSTANTS.TEST_INVALID_UPDATE_NAME }
      ];

      // First record succeeds, second fails (1 success, 1 failure from testData)
      const mockResponse = createMockUpdateResponse(testData, { successCount: 1 });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateById(ENTITY_TEST_CONSTANTS.ENTITY_ID, testData);

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty('error');
      expect(result.failureRecords[0]).toHaveProperty('record');
      // Verify the failure contains the record we tried to update
      expect(result.failureRecords[0].record).toEqual(testData[1]);
      expect(result.successRecords[0]).toEqual(testData[0]);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(entityService.updateById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        [{ id: ENTITY_TEST_CONSTANTS.RECORD_ID, name: ENTITY_TEST_CONSTANTS.TEST_UPDATED_NAME }]
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('deleteById', () => {
    it('should delete records successfully', async () => {
      const recordIds = [
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID_2
      ];

      const mockResponse = createMockDeleteResponse(recordIds);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.deleteById(ENTITY_TEST_CONSTANTS.ENTITY_ID, recordIds);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the IDs we sent
      expect(result.successRecords[0].id).toBe(recordIds[0]);
      expect(result.successRecords[1].id).toBe(recordIds[1]);

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        recordIds,
        expect.objectContaining({
          params: expect.any(Object)
        })
      );
    });

    it('should delete records with options', async () => {
      const recordIds = [ENTITY_TEST_CONSTANTS.RECORD_ID];
      const options: EntityDeleteOptions = {
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
      } as EntityDeleteOptions;

      const mockResponse = createMockDeleteResponse(recordIds);
      mockApiClient.post.mockResolvedValue(mockResponse);

      await entityService.deleteById(ENTITY_TEST_CONSTANTS.ENTITY_ID, recordIds, options);

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST
          })
        })
      );
    });

    it('should handle partial delete failures', async () => {
      const recordIds = [
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.TEST_INVALID_ID
      ];

      // First record deleted successfully, second fails (1 success, 1 failure from recordIds)
      const mockResponse = createMockDeleteResponse(recordIds, { successCount: 1 });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.deleteById(ENTITY_TEST_CONSTANTS.ENTITY_ID, recordIds);

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty('error');
      // Verify the failure contains the ID we tried to delete
      expect(result.failureRecords[0].record?.id).toBe(recordIds[1]);
      // Verify the success record contains the ID we deleted
      expect(result.successRecords[0].id).toBe(recordIds[0]);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(entityService.deleteById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        [ENTITY_TEST_CONSTANTS.RECORD_ID]
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('downloadAttachment', () => {
    it('should download attachment successfully', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      mockApiClient.get.mockResolvedValue(mockBlob);

      const options: DownloadAttachmentOptions = {
        entityName: ENTITY_TEST_CONSTANTS.ENTITY_NAME,
        recordId: ENTITY_TEST_CONSTANTS.RECORD_ID,
        fieldName: ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME
      };

      const result = await entityService.downloadAttachment(options);

      // Verify the result is a Blob
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);

      // Verify the API call has correct endpoint and responseType
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ATTACHMENT.DOWNLOAD(
          ENTITY_TEST_CONSTANTS.ENTITY_NAME,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME
        ),
        { responseType: 'blob' }
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      const options: DownloadAttachmentOptions = {
        entityName: ENTITY_TEST_CONSTANTS.ENTITY_NAME,
        recordId: ENTITY_TEST_CONSTANTS.RECORD_ID,
        fieldName: ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME
      };

      await expect(entityService.downloadAttachment(options)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});

