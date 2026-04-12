// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EntityService } from "../../../../src/services/data-fabric/entities";
import { ApiClient } from "../../../../src/core/http/api-client";
import { PaginationHelpers } from "../../../../src/utils/pagination/helpers";
import {
  createMockEntityResponse,
  createMockEntities,
  createMockEntityRecords,
  createMockSingleInsertResponse,
  createMockInsertResponse,
  createMockSingleUpdateResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
  createMockEntityWithExternalFields,
  createMockEntityWithNestedReferences,
  createMockEntityWithSqlFieldTypes,
} from "../../../utils/mocks/entities";
import {
  createServiceTestDependencies,
  createMockApiClient,
} from "../../../utils/setup";
import { createMockError } from "../../../utils/mocks/core";
import type {
  EntityGetRecordByIdOptions,
  EntityInsertRecordOptions,
  EntityInsertRecordsOptions,
  EntityUpdateRecordOptions,
  EntityUpdateRecordsOptions,
  EntityDeleteRecordsOptions,
  EntityRecord,
  EntityGetAllRecordsOptions,
  EntityMetadataUpdateOptions,
} from "../../../../src/models/data-fabric/entities.types";
import { EntityFieldType } from "../../../../src/models/data-fabric/entities.types";
import { ENTITY_TEST_CONSTANTS } from "../../../utils/constants/entities";
import { TEST_CONSTANTS } from "../../../utils/constants/common";
import { DATA_FABRIC_ENDPOINTS } from "../../../../src/utils/constants/endpoints";

// ===== MOCKING =====
// Mock the dependencies
vi.mock("../../../../src/core/http/api-client");

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import("../../../utils/mocks/core");
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock(
  "../../../../src/utils/pagination/helpers",
  async () => (await mocks).mockPaginationHelpers,
);

// ===== TEST SUITE =====
describe("EntityService Unit Tests", () => {
  let entityService: EntityService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    entityService = new EntityService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should get entity by ID successfully with all fields mapped correctly", async () => {
      const mockResponse = createMockEntityResponse();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(ENTITY_TEST_CONSTANTS.ENTITY_ID);
      expect(result.name).toBe(ENTITY_TEST_CONSTANTS.ENTITY_NAME);
      expect(result.displayName).toBe(
        ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME,
      );
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(3);

      // Verify the API call has correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        {},
      );

      // Verify entity has methods attached
      expect(typeof result.insertRecord).toBe("function");
      expect(typeof result.insertRecords).toBe("function");
      expect(typeof result.updateRecord).toBe("function");
      expect(typeof result.updateRecords).toBe("function");
      expect(typeof result.deleteRecords).toBe("function");
      expect(typeof result.getAllRecords).toBe("function");
    });

    it("should get entity with external fields successfully and transform field metadata", async () => {
      const mockResponse = createMockEntityWithExternalFields();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      expect(result).toBeDefined();
      expect(result.externalFields).toBeDefined();
      expect(result.externalFields?.length).toBeGreaterThan(0);
      expect(result.externalFields![0].externalObjectDetail).toBeDefined();
      expect(result.externalFields![0].externalConnectionDetail).toBeDefined();

      // Verify external field metadata field name transformation (fieldDefinition → fieldMetaData)
      const externalField = result.externalFields![0].fields![0];
      expect(externalField.fieldMetaData).toBeDefined();
      expect(externalField.fieldMetaData.id).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_ID,
      );
      expect(externalField.fieldMetaData.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_EXTERNAL_FIELD,
      );

      // NOTE: External fields currently do NOT transform SQL types to friendly names
      // They only transform field names (sqlType → fieldDataType, createTime → createdTime)
      // This tests the ACTUAL current behavior
      expect(externalField.fieldMetaData.fieldDataType).toBeDefined();
      expect(externalField.fieldMetaData.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_NVARCHAR,
      ); // Stays as SQL type
    });

    it("should transform nested reference fields correctly", async () => {
      const mockResponse = createMockEntityWithNestedReferences();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      expect(result).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(3);

      // Verify referenceEntity field is transformed
      const refEntityField = result.fields.find((f) => f.name === "customerId");
      expect(refEntityField).toBeDefined();
      expect(refEntityField?.referenceEntity).toBeDefined();
      expect(refEntityField?.referenceEntity?.id).toBe("ref-entity-id");
      expect(refEntityField?.referenceEntity?.name).toBe(
        ENTITY_TEST_CONSTANTS.REFERENCE_ENTITY_CUSTOMER,
      );

      // Verify referenceChoiceSet field is transformed
      const refChoiceSetField = result.fields.find((f) => f.name === "status");
      expect(refChoiceSetField).toBeDefined();
      expect(refChoiceSetField?.referenceChoiceSet).toBeDefined();
      expect(refChoiceSetField?.referenceChoiceSet?.id).toBe(
        "ref-choiceset-id",
      );
      expect(refChoiceSetField?.referenceChoiceSet?.name).toBe(
        ENTITY_TEST_CONSTANTS.REFERENCE_CHOICESET_STATUS,
      );

      // Verify referenceField.definition is transformed
      const refFieldField = result.fields.find(
        (f) => f.name === "relatedField",
      );
      expect(refFieldField).toBeDefined();
      expect(refFieldField?.referenceField).toBeDefined();
      expect(refFieldField?.referenceField?.definition).toBeDefined();
      expect(refFieldField?.referenceField?.definition?.id).toBe(
        "ref-field-def-id",
      );
      expect(refFieldField?.referenceField?.definition?.name).toBe(
        ENTITY_TEST_CONSTANTS.REFERENCE_FIELD_DEF,
      );
    });

    it("should transform SQL field types to friendly names", async () => {
      const mockResponse = createMockEntityWithSqlFieldTypes();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityService.getById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      expect(result).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(result.fields.length).toBe(6);

      // Verify UNIQUEIDENTIFIER -> UUID
      const uuidField = result.fields.find((f) => f.name === "id");
      expect(uuidField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_UUID,
      );

      // Verify NVARCHAR -> STRING
      const stringField = result.fields.find((f) => f.name === "name");
      expect(stringField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_STRING,
      );
      expect(stringField?.fieldDataType.lengthLimit).toBe(255);

      // Verify INT -> INTEGER
      const intField = result.fields.find((f) => f.name === "age");
      expect(intField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_INTEGER,
      );

      // Verify DATETIME2 -> DATETIME
      const datetimeField = result.fields.find((f) => f.name === "createdDate");
      expect(datetimeField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_DATETIME,
      );

      // Verify BIT -> BOOLEAN
      const boolField = result.fields.find((f) => f.name === "isActive");
      expect(boolField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_BOOLEAN,
      );

      // Verify DECIMAL -> DECIMAL (stays the same)
      const decimalField = result.fields.find((f) => f.name === "price");
      expect(decimalField?.fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_DECIMAL,
      );
      expect(decimalField?.fieldDataType.decimalPrecision).toBe(2);
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        entityService.getById(ENTITY_TEST_CONSTANTS.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getAll", () => {
    it("should return all entities with methods attached", async () => {
      const mockEntities = createMockEntities(3);
      mockApiClient.get.mockResolvedValue(mockEntities);

      const result = await entityService.getAll();

      // Verify the result
      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      // Verify each entity has methods
      result.forEach((entity) => {
        expect(typeof entity.insertRecord).toBe("function");
        expect(typeof entity.insertRecords).toBe("function");
        expect(typeof entity.updateRecords).toBe("function");
        expect(typeof entity.deleteRecords).toBe("function");
        expect(typeof entity.getAllRecords).toBe("function");
      });

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL,
        {},
      );

      expect(result[0].fields).toBeDefined();
      expect(result[0].fields.length).toBe(3);
      expect(result[0].fields[0].name).toBe("id");
      expect(result[0].fields[0].fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_UUID,
      );
      expect(result[0].fields[1].name).toBe("name");
      expect(result[0].fields[1].fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_STRING,
      );
      expect(result[0].fields[2].name).toBe("age");
      expect(result[0].fields[2].fieldDataType.name).toBe(
        ENTITY_TEST_CONSTANTS.FIELD_TYPE_INTEGER,
      );
    });

    it("should apply EntityMap transformations correctly to all entities", async () => {
      // Create mock with RAW API field names (before transformation)
      const mockEntitiesRaw = createMockEntities(2);
      mockApiClient.get.mockResolvedValue(mockEntitiesRaw);

      const result = await entityService.getAll();

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      result.forEach((entity) => {
        // Verify EntityMap transformations on entity level
        // createTime -> createdTime
        expect(entity.createdTime).toBeDefined();
        expect(entity.createdTime).toBe(ENTITY_TEST_CONSTANTS.CREATED_TIME);
        expect(entity).not.toHaveProperty("createTime"); // Raw field should not exist

        // updateTime -> updatedTime
        expect(entity.updatedTime).toBeDefined();
        expect(entity.updatedTime).toBe(ENTITY_TEST_CONSTANTS.UPDATED_TIME);
        expect(entity).not.toHaveProperty("updateTime"); // Raw field should not exist

        // Verify field-level transformations
        entity.fields.forEach((field) => {
          // sqlType -> fieldDataType
          expect(field.fieldDataType).toBeDefined();
          expect(field.fieldDataType.name).toBeDefined();
          expect(field).not.toHaveProperty("sqlType"); // Raw field should not exist

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
        {},
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(entityService.getAll()).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe("getAllRecords", () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.mocked(PaginationHelpers.getAll).mockReset();
    });

    it("should return all records without pagination", async () => {
      const mockRecords = createMockEntityRecords(5);
      const mockResponse = {
        items: mockRecords,
        totalCount: 5,
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityService.getAllRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ["expansionLevel"],
        }),
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(5);
    });

    it("should return paginated records when pagination options provided", async () => {
      const mockRecords = createMockEntityRecords(10);
      const mockResponse = {
        items: mockRecords,
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10,
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: EntityGetAllRecordsOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
      } as EntityGetAllRecordsOptions;

      const result = (await entityService.getAllRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        options,
      )) as any;

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
        }),
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
    });

    it("should handle expansion level option", async () => {
      // With expansionLevel, reference fields should be expanded to objects
      const mockRecords = createMockEntityRecords(3, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      });
      const mockResponse = {
        items: mockRecords,
        totalCount: 3,
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: EntityGetAllRecordsOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      } as EntityGetAllRecordsOptions;

      await entityService.getAllRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        options,
      );

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ["expansionLevel"],
        }),
        expect.objectContaining({
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        }),
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(
        entityService.getAllRecords(ENTITY_TEST_CONSTANTS.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getRecordById", () => {
    it("should get a single record by entity ID and record ID successfully", async () => {
      const mockRecord = {
        Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
        name: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.name,
        age: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.age,
        email: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.email,
      };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const result = await entityService.getRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
      );

      expect(result).toBeDefined();
      expect(result.Id).toBe(ENTITY_TEST_CONSTANTS.RECORD_ID);
      expect(result.name).toBe(ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.name);
      expect(result.age).toBe(ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.age);
      expect(result.email).toBe(ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.email);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
        ),
        { params: {} },
      );
    });

    it("should get a record with expansion level option", async () => {
      const mockRecord = {
        Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
        name: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.name,
      };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const options: EntityGetRecordByIdOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      };

      const result = await entityService.getRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        options,
      );

      expect(result).toBeDefined();
      expect(result.Id).toBe(ENTITY_TEST_CONSTANTS.RECORD_ID);
      expect(result.name).toBe(ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.name);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
        ),
        {
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
          }),
        },
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        entityService.getRecordById(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("insertRecordById", () => {
    it("should insert a single record successfully", async () => {
      const testData = ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA;

      const mockResponse = createMockSingleInsertResponse(testData);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
      );

      // Verify the result is the inserted record with generated record ID
      expect(result).toBeDefined();
      expect(result.name).toBe(testData.name);
      expect(result.age).toBe(testData.age);
      expect(result).toHaveProperty("Id");

      // Verify the API call has correct endpoint and body (single object, not array)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        testData,
        expect.objectContaining({
          params: expect.any(Object),
        }),
      );
    });

    it("should insert a record with options", async () => {
      const testData = {
        ...ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        RecordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
        CreatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
      };
      const options: EntityInsertRecordOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      };

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockSingleInsertResponse(testData, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
        options,
      );

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        testData,
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
          }),
        }),
      );

      // Verify reference fields are expanded in the response
      expect(result.RecordOwner).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
      expect(result.CreatedBy).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.insertRecordById(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("insertRecordsById", () => {
    it("should insert records successfully", async () => {
      const testData = [
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA_2,
      ];

      const mockResponse = createMockInsertResponse(testData);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the data we sent (with IDs added)
      expect(result.successRecords[0].name).toBe(testData[0].name);
      expect(result.successRecords[0].age).toBe(testData[0].age);
      expect(result.successRecords[0]).toHaveProperty("Id");
      expect(result.successRecords[1].name).toBe(testData[1].name);
      expect(result.successRecords[1]).toHaveProperty("Id");

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.BATCH_INSERT_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        testData,
        expect.objectContaining({
          params: expect.any(Object),
        }),
      );
    });

    it("should insert records with options", async () => {
      const testData = [
        {
          ...ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
          RecordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
          CreatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
        },
      ];
      const options: EntityInsertRecordsOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
      };

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockInsertResponse(testData, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
        options,
      );

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
          }),
        }),
      );

      // Verify reference fields are expanded in the response
      expect(result.successRecords[0].RecordOwner).toEqual({
        id: ENTITY_TEST_CONSTANTS.USER_ID,
      });
      expect(result.successRecords[0].CreatedBy).toEqual({
        id: ENTITY_TEST_CONSTANTS.USER_ID,
      });
    });

    it("should handle partial insert failures", async () => {
      const testData = [
        ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        { name: ENTITY_TEST_CONSTANTS.TEST_INVALID_RECORD_NAME, age: null }, // Invalid data
      ];

      // First record succeeds, second fails (1 success, 1 failure from testData)
      const mockResponse = createMockInsertResponse(testData, {
        successCount: 1,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.insertRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
      );

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty("error");
      expect(result.failureRecords[0]).toHaveProperty("record");
      // Verify the failure contains the record we tried to insert
      expect(result.failureRecords[0].record).toEqual(testData[1]);
      // Verify the success record has the data plus generated record ID
      expect(result.successRecords[0].name).toBe(testData[0].name);
      expect(result.successRecords[0].age).toBe(testData[0].age);
      expect(result.successRecords[0]).toHaveProperty("Id");
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.insertRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, [
          ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA,
        ]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateRecordById", () => {
    it("should update a single record successfully", async () => {
      const testData = {
        name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME,
        age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
      };

      const mockResponse = createMockSingleUpdateResponse({
        Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
        ...testData,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        testData,
      );

      // Verify the result is the updated record
      expect(result).toBeDefined();
      expect(result.Id).toBe(ENTITY_TEST_CONSTANTS.RECORD_ID);
      expect(result.name).toBe(ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME);
      expect(result.age).toBe(ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE);

      // Verify the API call has correct endpoint and body without record ID
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_RECORD_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
        ),
        {
          name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME,
          age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
        },
        expect.objectContaining({
          params: expect.any(Object),
        }),
      );
    });

    it("should update a record with options", async () => {
      const testData = {
        name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME,
        age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
        RecordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
        UpdatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
      };
      const options: EntityUpdateRecordOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      };

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockSingleUpdateResponse(
        { Id: ENTITY_TEST_CONSTANTS.RECORD_ID, ...testData },
        {
          expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        },
      );
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateRecordById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        testData,
        options,
      );

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        testData,
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
          }),
        }),
      );

      // Verify reference fields are expanded in the response
      expect(result.RecordOwner).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
      expect(result.UpdatedBy).toEqual({ id: ENTITY_TEST_CONSTANTS.USER_ID });
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.updateRecordById(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          { name: ENTITY_TEST_CONSTANTS.TEST_UPDATED_NAME },
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateRecordsById", () => {
    it("should update records successfully", async () => {
      const testData: EntityRecord[] = [
        {
          Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
          name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME,
          age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
        },
        {
          Id: ENTITY_TEST_CONSTANTS.RECORD_ID_2,
          name: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_NAME,
          age: ENTITY_TEST_CONSTANTS.TEST_JANE_UPDATED_AGE,
        },
      ];

      const mockResponse = createMockUpdateResponse(testData);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the data we sent
      expect(result.successRecords).toEqual(testData);

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        testData,
        expect.objectContaining({
          params: expect.any(Object),
        }),
      );
    });

    it("should update records with options", async () => {
      const testData: EntityRecord[] = [
        {
          Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
          name: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_NAME,
          age: ENTITY_TEST_CONSTANTS.TEST_JOHN_UPDATED_AGE,
          RecordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
          UpdatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
        },
      ];
      const options: EntityUpdateRecordsOptions = {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
      } as EntityUpdateRecordsOptions;

      // With expansionLevel, reference fields should be expanded in the response
      const mockResponse = createMockUpdateResponse(testData, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
        options,
      );

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
          }),
        }),
      );

      // Verify reference fields are expanded in the response
      expect(result.successRecords[0].RecordOwner).toEqual({
        id: ENTITY_TEST_CONSTANTS.USER_ID,
      });
      expect(result.successRecords[0].UpdatedBy).toEqual({
        id: ENTITY_TEST_CONSTANTS.USER_ID,
      });
    });

    it("should handle partial update failures", async () => {
      const testData: EntityRecord[] = [
        {
          Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
          name: ENTITY_TEST_CONSTANTS.TEST_VALID_UPDATE_NAME,
        },
        {
          Id: ENTITY_TEST_CONSTANTS.TEST_INVALID_ID,
          name: ENTITY_TEST_CONSTANTS.TEST_INVALID_UPDATE_NAME,
        },
      ];

      // First record succeeds, second fails (1 success, 1 failure from testData)
      const mockResponse = createMockUpdateResponse(testData, {
        successCount: 1,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.updateRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        testData,
      );

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty("error");
      expect(result.failureRecords[0]).toHaveProperty("record");
      // Verify the failure contains the record we tried to update
      expect(result.failureRecords[0].record).toEqual(testData[1]);
      expect(result.successRecords[0]).toEqual(testData[0]);
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.updateRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, [
          {
            Id: ENTITY_TEST_CONSTANTS.RECORD_ID,
            name: ENTITY_TEST_CONSTANTS.TEST_UPDATED_NAME,
          },
        ]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteRecordsById", () => {
    it("should delete records successfully", async () => {
      const recordIds = [
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID_2,
      ];

      const mockResponse = createMockDeleteResponse(recordIds);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.deleteRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        recordIds,
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.successRecords).toHaveLength(2);
      expect(result.failureRecords).toHaveLength(0);
      // Verify the response contains the IDs we sent
      expect(result.successRecords[0].Id).toBe(recordIds[0]);
      expect(result.successRecords[1].Id).toBe(recordIds[1]);

      // Verify the API call has correct endpoint and body
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        recordIds,
        expect.objectContaining({
          params: expect.any(Object),
        }),
      );
    });

    it("should delete records with options", async () => {
      const recordIds = [ENTITY_TEST_CONSTANTS.RECORD_ID];
      const options: EntityDeleteRecordsOptions = {
        failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
      } as EntityDeleteRecordsOptions;

      const mockResponse = createMockDeleteResponse(recordIds);
      mockApiClient.post.mockResolvedValue(mockResponse);

      await entityService.deleteRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        recordIds,
        options,
      );

      // Verify options are passed in params
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            failOnFirst: ENTITY_TEST_CONSTANTS.FAIL_ON_FIRST,
          }),
        }),
      );
    });

    it("should handle partial delete failures", async () => {
      const recordIds = [
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.TEST_INVALID_ID,
      ];

      // First record deleted successfully, second fails (1 success, 1 failure from recordIds)
      const mockResponse = createMockDeleteResponse(recordIds, {
        successCount: 1,
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityService.deleteRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        recordIds,
      );

      expect(result.successRecords).toHaveLength(1);
      expect(result.failureRecords).toHaveLength(1);
      expect(result.failureRecords[0]).toHaveProperty("error");
      // Verify the failure contains the ID we tried to delete
      expect(result.failureRecords[0].record?.Id).toBe(recordIds[1]);
      // Verify the success record contains the ID we deleted
      expect(result.successRecords[0].Id).toBe(recordIds[0]);
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.deleteRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, [
          ENTITY_TEST_CONSTANTS.RECORD_ID,
        ]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("downloadAttachment", () => {
    it("should download attachment successfully", async () => {
      const mockBlob = new Blob(["test content"], { type: "application/pdf" });
      mockApiClient.get.mockResolvedValue(mockBlob);

      const result = await entityService.downloadAttachment(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
      );

      // Verify the result is a Blob
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);

      // Verify the API call has correct endpoint and responseType
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.DOWNLOAD_ATTACHMENT(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        ),
        { responseType: "blob" },
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        entityService.downloadAttachment(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("uploadAttachment", () => {
    it.each([
      {
        type: "Blob",
        file: new Blob(["test file content"], { type: "application/pdf" }),
        response: { id: ENTITY_TEST_CONSTANTS.RECORD_ID, status: "uploaded" },
      },
      {
        type: "Uint8Array",
        file: new Uint8Array([72, 101, 108, 108, 111]),
        response: { id: ENTITY_TEST_CONSTANTS.RECORD_ID },
      },
    ])(
      "should upload attachment successfully with $type",
      async ({ file, response }) => {
        mockApiClient.post.mockResolvedValue(response);

        const result = await entityService.uploadAttachment(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
          file,
        );

        expect(result).toEqual(response);
        expect(mockApiClient.post).toHaveBeenCalledWith(
          DATA_FABRIC_ENDPOINTS.ENTITY.UPLOAD_ATTACHMENT(
            ENTITY_TEST_CONSTANTS.ENTITY_ID,
            ENTITY_TEST_CONSTANTS.RECORD_ID,
            ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
          ),
          expect.any(FormData),
          { params: {} },
        );
      },
    );

    it("should include expansionLevel query parameter when provided", async () => {
      const mockUploadResponse = { id: ENTITY_TEST_CONSTANTS.RECORD_ID };
      mockApiClient.post.mockResolvedValue(mockUploadResponse);

      const file = new Blob(["test"]);

      await entityService.uploadAttachment(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        file,
        { expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPLOAD_ATTACHMENT(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        ),
        expect.any(FormData),
        { params: { expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL } },
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      const file = new Blob(["test"]);

      await expect(
        entityService.uploadAttachment(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
          file,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteAttachment", () => {
    it("should delete attachment successfully", async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await entityService.deleteAttachment(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ENTITY_TEST_CONSTANTS.RECORD_ID,
        ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ATTACHMENT(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        ),
        {},
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.delete.mockRejectedValue(error);

      await expect(
        entityService.deleteAttachment(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          ENTITY_TEST_CONSTANTS.RECORD_ID,
          ENTITY_TEST_CONSTANTS.ATTACHMENT_FIELD_NAME,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("queryRecords", () => {
    it("should return items and totalCount from query response", async () => {
      const mockRecords = createMockEntityRecords(2);
      mockApiClient.post.mockResolvedValue({
        value: mockRecords,
        totalRecordCount: 2,
      });

      const result = await entityService.queryRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        {},
        { params: {} },
      );
    });

    it("should pass filter options in request body", async () => {
      mockApiClient.post.mockResolvedValue({ value: [], totalRecordCount: 0 });

      const options = {
        filterGroup: {
          logicalOperator: 0 as const,
          queryFilters: [{ fieldName: "name", operator: "=", value: "Alice" }],
        },
        limit: 10,
        start: 0,
      };

      const result = await entityService.queryRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        options,
      );

      expect(result.totalCount).toBe(0);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { filterGroup: options.filterGroup, limit: 10, start: 0 },
        { params: {} },
      );
    });

    it("should pass expansionLevel as a query param, not in the request body", async () => {
      mockApiClient.post.mockResolvedValue({ value: [], totalRecordCount: 0 });

      await entityService.queryRecords(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL,
        limit: 10,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { limit: 10 },
        { params: { expansionLevel: ENTITY_TEST_CONSTANTS.EXPANSION_LEVEL } },
      );
    });

    it("should support nested filterGroups", async () => {
      mockApiClient.post.mockResolvedValue({ value: [], totalRecordCount: 0 });

      const options = {
        filterGroup: {
          logicalOperator: 0 as const,
          filterGroups: [
            {
              logicalOperator: 1 as const,
              queryFilters: [
                { fieldName: "status", operator: "=", value: "active" },
              ],
            },
          ],
        },
      };

      await entityService.queryRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        options,
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { filterGroup: options.filterGroup },
        { params: {} },
      );
    });

    it("should handle missing value and totalRecordCount gracefully", async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await entityService.queryRecords(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
      );

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.queryRecords(ENTITY_TEST_CONSTANTS.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("importRecordsById", () => {
    it("should post FormData to bulk upload endpoint with a File and return result", async () => {
      const mockResponse = {
        totalRecords: 3,
        insertedRecords: 3,
        errorFileLink: null,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const file = new File(
        ["name,age\nAlice,30\nBob,25\nCharlie,40"],
        "import.csv",
        { type: "text/csv" },
      );

      const result = await entityService.importRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        file,
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        expect.any(FormData),
        {},
      );
    });

    it("should accept a plain Blob", async () => {
      mockApiClient.post.mockResolvedValue({
        totalRecords: 2,
        insertedRecords: 2,
        errorFileLink: null,
      });

      const blob = new Blob(["name\nAlice\nBob"], { type: "text/csv" });

      await entityService.importRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        blob,
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        expect.any(FormData),
        {},
      );
    });

    it("should return errorFileLink when some records fail", async () => {
      const mockResponse = {
        totalRecords: 3,
        insertedRecords: 2,
        errorFileLink: "error-file-abc123",
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const file = new File(["name\nAlice\nBob\nCharlie"], "import.csv", {
        type: "text/csv",
      });

      const result = await entityService.importRecordsById(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        file,
      );

      expect(result.errorFileLink).toBe("error-file-abc123");
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      const file = new File(["name\nAlice"], "import.csv", {
        type: "text/csv",
      });

      await expect(
        entityService.importRecordsById(ENTITY_TEST_CONSTANTS.ENTITY_ID, file),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("create", () => {
    it("should post entity schema and return created entity ID", async () => {
      mockApiClient.post.mockResolvedValue(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      const result = await entityService.create(
        "my_entity",
        "A test entity",
        [{ name: "title", type: EntityFieldType.Text }],
        { displayName: "My Entity", isRbacEnabled: true },
      );

      expect(result).toBe(ENTITY_TEST_CONSTANTS.ENTITY_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          description: "A test entity",
          displayName: "My Entity",
          entityDefinition: expect.objectContaining({
            name: "my_entity",
            folderId: "00000000-0000-0000-0000-000000000000",
            isRbacEnabled: true,
            isInsightsEnabled: false,
          }),
        }),
        {},
      );
    });

    it("should use name as displayName when displayName is not provided", async () => {
      mockApiClient.post.mockResolvedValue("new-id");

      await entityService.create("my_new_entity", "", []);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          displayName: "my_new_entity",
          entityDefinition: expect.objectContaining({ name: "my_new_entity" }),
        }),
        {},
      );
    });

    it("should throw if entity name has spaces", async () => {
      await expect(
        entityService.create("My New Entity", "", []),
      ).rejects.toThrow("Invalid entity name 'My New Entity'");
    });

    it("should throw if entity name has uppercase letters", async () => {
      await expect(entityService.create("MyEntity", "", [])).rejects.toThrow(
        "Invalid entity name 'MyEntity'",
      );
    });

    it("should throw if field name is invalid", async () => {
      await expect(
        entityService.create("myentity", "", [{ name: "Bad Field Name" }]),
      ).rejects.toThrow("Invalid field name 'Bad Field Name'");
    });

    it("should pass custom folderId to the entity definition", async () => {
      mockApiClient.post.mockResolvedValue(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      await entityService.create("my_entity", "desc", [], {
        folderId: ENTITY_TEST_CONSTANTS.FIELD_ID,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          entityDefinition: expect.objectContaining({
            folderId: ENTITY_TEST_CONSTANTS.FIELD_ID,
          }),
        }),
        {},
      );
    });

    it("should pass isInsightsEnabled: true when provided", async () => {
      mockApiClient.post.mockResolvedValue(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      await entityService.create("my_entity", "desc", [], {
        isInsightsEnabled: true,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          entityDefinition: expect.objectContaining({
            isInsightsEnabled: true,
          }),
        }),
        {},
      );
    });

    it("should pass externalFields when provided", async () => {
      mockApiClient.post.mockResolvedValue(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      const externalFields = [{ connectionId: ENTITY_TEST_CONSTANTS.EXTERNAL_CONNECTION_ID }];

      await entityService.create("my_entity", "desc", [], { externalFields });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          entityDefinition: expect.objectContaining({
            externalFields,
          }),
        }),
        {},
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(entityService.create("test_entity", "", [])).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe("deleteEntityById", () => {
    it("should call POST on the entity delete endpoint", async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.deleteEntityById(ENTITY_TEST_CONSTANTS.ENTITY_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ENTITY(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        {},
        {},
      );
    });

    it("should handle API errors", async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.deleteEntityById(ENTITY_TEST_CONSTANTS.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateEntitySchema", () => {
    const mockRawEntity = {
      id: ENTITY_TEST_CONSTANTS.ENTITY_ID,
      name: "my_entity",
      displayName: "My Entity",
      description: "Test entity",
      isRbacEnabled: false,
      fields: [
        {
          id: ENTITY_TEST_CONSTANTS.FIELD_ID,
          name: "title",
          displayName: "Title",
          description: "",
          isRequired: false,
          isUnique: false,
          isRbacEnabled: false,
          isSystemField: false,
          isPrimaryKey: false,
          fieldDisplayType: "Basic",
          sqlType: { name: "NVARCHAR", lengthLimit: 200 },
        },
      ],
    };

    it("should GET entity and POST full schema with added field", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        addFields: [{ name: "count", type: EntityFieldType.Number }],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(ENTITY_TEST_CONSTANTS.ENTITY_ID),
        {},
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          entityDefinition: expect.objectContaining({
            id: ENTITY_TEST_CONSTANTS.ENTITY_ID,
            name: "my_entity",
            fields: expect.arrayContaining([
              expect.objectContaining({ name: "title" }),
              expect.objectContaining({ name: "count", type: "int" }),
            ]),
          }),
        }),
        {},
      );
    });

    it("should remove specified fields from the schema", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        removeFields: ["title"],
      });

      const call = mockApiClient.post.mock.calls[0][1];
      expect(call.entityDefinition.fields).toHaveLength(0);
    });

    it("should update field metadata in-place", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        updateFields: [
          {
            id: ENTITY_TEST_CONSTANTS.FIELD_ID,
            displayName: "Product Title",
            isRequired: true,
          },
        ],
      });

      const call = mockApiClient.post.mock.calls[0][1];
      const titleField = call.entityDefinition.fields[0];
      expect(titleField.displayName).toBe("Product Title");
      expect(titleField.isRequired).toBe(true);
    });

    it("should preserve existing entity metadata when updating fields", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        addFields: [{ name: "status", type: EntityFieldType.Text }],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT_ENTITY,
        expect.objectContaining({
          displayName: mockRawEntity.displayName,
          description: mockRawEntity.description,
        }),
        {},
      );
    });

    it("should apply combined add, remove, and update in one call", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        addFields: [{ name: "notes", type: EntityFieldType.LongText }],
        removeFields: ["title"],
        updateFields: [],
      });

      const call = mockApiClient.post.mock.calls[0][1];
      const fields = call.entityDefinition.fields;
      expect(fields.find((f: any) => f.name === "title")).toBeUndefined();
      expect(fields.find((f: any) => f.name === "notes")).toBeDefined();
      expect(fields.find((f: any) => f.name === "notes").type).toBe("text");
    });

    it("should leave field unchanged when updateFields ID does not match any existing field", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        updateFields: [{ id: "non-existent-id", displayName: "Ghost" }],
      });

      const call = mockApiClient.post.mock.calls[0][1];
      const titleField = call.entityDefinition.fields[0];
      expect(titleField.displayName).toBe("Title");
    });

    it("should pass through the existing schema unchanged when options is empty", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {});

      const call = mockApiClient.post.mock.calls[0][1];
      expect(call.entityDefinition.fields).toHaveLength(1);
      expect(call.entityDefinition.fields[0].name).toBe("title");
    });

    it.each([
      { type: EntityFieldType.Text,     expectedApiType: "text"     },
      { type: EntityFieldType.LongText, expectedApiType: "text"     },
      { type: EntityFieldType.Number,   expectedApiType: "int"      },
      { type: EntityFieldType.Decimal,  expectedApiType: "decimal"  },
      { type: EntityFieldType.Boolean,  expectedApiType: "bit"      },
      { type: EntityFieldType.DateTime, expectedApiType: "datetime" },
      { type: EntityFieldType.Date,     expectedApiType: "date"     },
      { type: EntityFieldType.File,     expectedApiType: "file"     },
    ])(
      "should map EntityFieldType.$type to apiType '$expectedApiType' for added fields",
      async ({ type, expectedApiType }) => {
        mockApiClient.get.mockResolvedValue(mockRawEntity);
        mockApiClient.post.mockResolvedValue(undefined);

        await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
          addFields: [{ name: "new_field", type }],
        });

        const call = mockApiClient.post.mock.calls[0][1];
        const newField = call.entityDefinition.fields.find(
          (f: any) => f.name === "new_field",
        );
        expect(newField).toBeDefined();
        expect(newField.type).toBe(expectedApiType);
      },
    );

    it("should set isEncrypted on an added field when specified", async () => {
      mockApiClient.get.mockResolvedValue(mockRawEntity);
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
        addFields: [{ name: "secret_field", type: EntityFieldType.Text, isEncrypted: true }],
      });

      const call = mockApiClient.post.mock.calls[0][1];
      const secretField = call.entityDefinition.fields.find(
        (f: any) => f.name === "secret_field",
      );
      expect(secretField?.isEncrypted).toBe(true);
    });

    it("should handle API errors", async () => {
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        entityService.updateEntitySchema(ENTITY_TEST_CONSTANTS.ENTITY_ID, {
          addFields: [],
        }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateEntitySchemaMetadata", () => {
    it("should call UPDATE_ENTITY_METADATA endpoint with provided options", async () => {
      mockApiClient.post.mockResolvedValue({ data: undefined });

      const options: EntityMetadataUpdateOptions = {
        displayName: ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME,
        description: ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION,
        isRbacEnabled: true,
      };

      await entityService.updateEntitySchemaMetadata(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        options,
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_ENTITY_METADATA(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        options,
        {},
      );
    });

    it("should update only displayName when only displayName is provided", async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchemaMetadata(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        { displayName: ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_ENTITY_METADATA(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { displayName: ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME },
        {},
      );
    });

    it("should update only description when only description is provided", async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchemaMetadata(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        { description: ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_ENTITY_METADATA(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { description: ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION },
        {},
      );
    });

    it("should update only isRbacEnabled when only isRbacEnabled is provided", async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await entityService.updateEntitySchemaMetadata(
        ENTITY_TEST_CONSTANTS.ENTITY_ID,
        { isRbacEnabled: false },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_ENTITY_METADATA(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
        ),
        { isRbacEnabled: false },
        {},
      );
    });

    it("should handle API errors", async () => {
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        entityService.updateEntitySchemaMetadata(
          ENTITY_TEST_CONSTANTS.ENTITY_ID,
          { displayName: "X" },
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
