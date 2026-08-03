// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EntityV3Service } from "../../../../src/services/data-fabric/entities-v3";
import { ApiClient } from "../../../../src/core/http/api-client";
import { PaginationHelpers } from "../../../../src/utils/pagination/helpers";
import {
  createServiceTestDependencies,
  createMockApiClient,
} from "../../../utils/setup";
import { createMockError } from "../../../utils/mocks/core";
import { ValidationError } from "../../../../src/core/errors";
import { DATA_FABRIC_V3_ENDPOINTS } from "../../../../src/utils/constants/endpoints/data-fabric";
import { HTTP_METHODS } from "../../../../src/utils/constants/common";
import { RESPONSE_TYPES } from "../../../../src/utils/constants/headers";
import { ENTITY_TEST_CONSTANTS } from "../../../utils/constants/entities";
import { TEST_CONSTANTS } from "../../../utils/constants/common";
import { EntityJoin } from "../../../../src/models/data-fabric/entities.types";
import type {
  EntityV3CreateRequest,
  EntityV3UpdateMetadataRequest,
  EntityV3FieldCreateRequest,
  EntityV3FieldUpdateRequest,
  EntityV3ConditionalUpdateRequest,
  EntityV3AutopilotRequest,
  EntityV3RecordInput,
  EntityV3WriteResponse,
  EntityV3Metadata,
} from "../../../../src/models/data-fabric/entities-v3.types";

// ===== MOCKING =====
vi.mock("../../../../src/core/http/api-client");

const mocks = vi.hoisted(() => {
  return import("../../../utils/mocks/core");
});

vi.mock(
  "../../../../src/utils/pagination/helpers",
  async () => (await mocks).mockPaginationHelpers,
);

// ===== LOCAL TEST FIXTURES =====
// No shared v3 constant set exists, so these local fixtures cover the v3 surface.
// Entity/record/field ids reuse the shared entity constants where they fit.
const V3 = {
  ENTITY_ID: ENTITY_TEST_CONSTANTS.ENTITY_ID,
  ENTITY_NAME: "LoanCaseForBank",
  MEMBER_NAME: "Comments",
  RECORD_ID: ENTITY_TEST_CONSTANTS.RECORD_ID,
  RECORD_ID_2: ENTITY_TEST_CONSTANTS.RECORD_ID_2,
  FIELD_ID: ENTITY_TEST_CONSTANTS.FIELD_ID,
  BUSINESS_KEY: "CASE-001",
  ATTACHMENT_FIELD: "Avatar",
  FOLDER_KEY: "a9f0c1d2-e3b4-45a6-8789-0abcdef12345",
  EXPANSION_LEVEL: 2,
  ENTITY_CLASS: "CaseComposite",
} as const;

const FOLDER_HEADER = { "X-UIPATH-FolderKey": V3.FOLDER_KEY };

/** A minimal v3 write/record envelope. */
const createWriteResponse = (): EntityV3WriteResponse => ({
  Id: V3.RECORD_ID,
  children: {},
});

/** A minimal v3 entity metadata record (raw — no bound methods). */
const createMetadata = (): EntityV3Metadata => ({
  id: V3.ENTITY_ID,
  name: V3.ENTITY_NAME,
  displayName: "Loan Case",
  isComposite: true,
});

// ===== TEST SUITE =====
describe("EntityV3Service Unit Tests", () => {
  let entityV3Service: EntityV3Service;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () {
      return mockApiClient;
    });

    vi.mocked(PaginationHelpers.getAll).mockReset();

    entityV3Service = new EntityV3Service(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ----- Listing / metadata -------------------------------------------------

  describe("getAll", () => {
    it("should list entities and pass entityClass param and folderKey header", async () => {
      const mockEntities = [createMetadata()];
      mockApiClient.get.mockResolvedValue(mockEntities);

      const result = await entityV3Service.getAll({
        entityClass: V3.ENTITY_CLASS,
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockEntities);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.LIST,
        { params: { entityClass: V3.ENTITY_CLASS }, headers: FOLDER_HEADER },
      );
    });

    it("should list entities with empty params/headers when no options provided", async () => {
      mockApiClient.get.mockResolvedValue([]);

      await entityV3Service.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.LIST,
        { params: {}, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(entityV3Service.getAll()).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe("getAllWithChoiceSets", () => {
    it("should call the LIST_ALL endpoint with start/limit params and folderKey header", async () => {
      const mockResponse = { entities: [createMetadata()], choicesets: [] };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await entityV3Service.getAllWithChoiceSets({
        start: 0,
        limit: 50,
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.LIST_ALL,
        { params: { start: 0, limit: 50 }, headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getAllWithChoiceSets(),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getFolderEntities", () => {
    it("should call the FOLDER_ENTITIES endpoint with folderKey header", async () => {
      const mockEntities = [createMetadata()];
      mockApiClient.get.mockResolvedValue(mockEntities);

      const result = await entityV3Service.getFolderEntities({
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockEntities);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.FOLDER_ENTITIES,
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(entityV3Service.getFolderEntities()).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe("getById", () => {
    it("should get entity metadata by id with bound methods attached", async () => {
      const mockMetadata = createMetadata();
      mockApiClient.get.mockResolvedValue(mockMetadata);

      const result = await entityV3Service.getById(V3.ENTITY_ID, {
        folderKey: V3.FOLDER_KEY,
      });

      expect(result.id).toBe(V3.ENTITY_ID);
      expect(result.name).toBe(V3.ENTITY_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.GET_BY_ID(V3.ENTITY_ID),
        { headers: FOLDER_HEADER },
      );

      // Verify bound methods are attached
      expect(typeof result.getRecords).toBe("function");
      expect(typeof result.query).toBe("function");
      expect(typeof result.insert).toBe("function");
      expect(typeof result.update).toBe("function");
      expect(typeof result.delete).toBe("function");
      expect(typeof result.createField).toBe("function");
      expect(typeof result.getMemberRecords).toBe("function");
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getById(V3.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getMetadata", () => {
    it("should get entity metadata by name with bound methods attached", async () => {
      const mockMetadata = createMetadata();
      mockApiClient.get.mockResolvedValue(mockMetadata);

      const result = await entityV3Service.getMetadata(V3.ENTITY_NAME);

      expect(result.name).toBe(V3.ENTITY_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.GET_METADATA(V3.ENTITY_NAME),
        { headers: {} },
      );

      expect(typeof result.getRecords).toBe("function");
      expect(typeof result.query).toBe("function");
      expect(typeof result.delete).toBe("function");
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getMetadata(V3.ENTITY_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Schema CUD ---------------------------------------------------------

  describe("create", () => {
    it("should create an entity via POST and pass folderKey header", async () => {
      const request: EntityV3CreateRequest = {
        displayName: "Users",
        entityDefinition: { name: "Users", fields: [] },
      };
      mockApiClient.post.mockResolvedValue(V3.ENTITY_ID);

      const result = await entityV3Service.create(request, {
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toBe(V3.ENTITY_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.CREATE,
        request,
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      const request: EntityV3CreateRequest = { displayName: "Users" };
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(entityV3Service.create(request)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe("deleteById", () => {
    it("should delete an entity via DELETE and pass folderKey header", async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await entityV3Service.deleteById(V3.ENTITY_ID, {
        folderKey: V3.FOLDER_KEY,
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_BY_ID(V3.ENTITY_ID),
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteById(V3.ENTITY_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateMetadata", () => {
    it("should update metadata via PATCH with entityId merged into the body", async () => {
      const request: EntityV3UpdateMetadataRequest = { displayName: "Renamed" };
      mockApiClient.patch.mockResolvedValue(true);

      const result = await entityV3Service.updateMetadata(
        V3.ENTITY_ID,
        request,
        { folderKey: V3.FOLDER_KEY },
      );

      expect(result).toBe(true);
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_METADATA(V3.ENTITY_ID),
        { entityId: V3.ENTITY_ID, ...request },
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.patch.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateMetadata(V3.ENTITY_ID, { displayName: "X" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("createField", () => {
    it("should create a field via POST with entityId merged into the body", async () => {
      const request: EntityV3FieldCreateRequest = {
        fieldDefinition: { name: "Notes" },
      };
      mockApiClient.post.mockResolvedValue(V3.FIELD_ID);

      const result = await entityV3Service.createField(V3.ENTITY_ID, request);

      expect(result).toBe(V3.FIELD_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.CREATE(V3.ENTITY_ID),
        { entityId: V3.ENTITY_ID, ...request },
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.createField(V3.ENTITY_ID, {
          fieldDefinition: { name: "Notes" },
        }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateField", () => {
    it("should update a field via PATCH with the field id merged into the body", async () => {
      const request: EntityV3FieldUpdateRequest = { displayName: "Internal Notes" };
      mockApiClient.patch.mockResolvedValue(true);

      const result = await entityV3Service.updateField(
        V3.ENTITY_ID,
        V3.FIELD_ID,
        request,
      );

      expect(result).toBe(true);
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.UPDATE(V3.ENTITY_ID, V3.FIELD_ID),
        { id: V3.FIELD_ID, ...request },
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.patch.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateField(V3.ENTITY_ID, V3.FIELD_ID, {}),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteField", () => {
    it("should soft-delete a field via DELETE", async () => {
      mockApiClient.delete.mockResolvedValue(true);

      const result = await entityV3Service.deleteField(
        V3.ENTITY_ID,
        V3.FIELD_ID,
      );

      expect(result).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.DELETE(V3.ENTITY_ID, V3.FIELD_ID),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteField(V3.ENTITY_ID, V3.FIELD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Data reads ---------------------------------------------------------

  describe("getRecords", () => {
    it("should return records without pagination and pass the READ endpoint + excludeFromPrefix", async () => {
      const mockResponse = { items: [createWriteResponse()], totalCount: 1 };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityV3Service.getRecords(V3.ENTITY_NAME);

      expect(result).toEqual(mockResponse);
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ["expansionLevel"],
        }),
        undefined,
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ(V3.ENTITY_NAME),
      );
    });

    it("should forward pagination options and strip folderKey into the header", async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      await entityV3Service.getRecords(V3.ENTITY_NAME, {
        folderKey: V3.FOLDER_KEY,
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
        expansionLevel: V3.EXPANSION_LEVEL,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ headers: FOLDER_HEADER }),
        // folderKey stripped; pageSize + expansionLevel survive
        { pageSize: TEST_CONSTANTS.PAGE_SIZE, expansionLevel: V3.EXPANSION_LEVEL },
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getRecords(V3.ENTITY_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getRecord", () => {
    it("should read a single record by id and return it untransformed", async () => {
      const mockRecord = { Id: V3.RECORD_ID, CaseId: "CASE-001", CaseStatus: "Open" };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const result = await entityV3Service.getRecord(
        V3.ENTITY_NAME,
        V3.RECORD_ID,
        { expansionLevel: V3.EXPANSION_LEVEL, folderKey: V3.FOLDER_KEY },
      );

      expect(result).toEqual(mockRecord);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ_RECORD(V3.ENTITY_NAME, V3.RECORD_ID),
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getRecord(V3.ENTITY_NAME, V3.RECORD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getRecordByKey", () => {
    it("should read a single record by business key and return it untransformed", async () => {
      const mockRecord = { Id: V3.RECORD_ID, CaseId: V3.BUSINESS_KEY };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const result = await entityV3Service.getRecordByKey(
        V3.ENTITY_NAME,
        V3.BUSINESS_KEY,
      );

      expect(result).toEqual(mockRecord);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ_BY_KEY(V3.ENTITY_NAME, V3.BUSINESS_KEY),
        { params: {}, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getRecordByKey(V3.ENTITY_NAME, V3.BUSINESS_KEY),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("query", () => {
    it("should query via POST with expansionLevel query param and the query excludeFromPrefix set", async () => {
      const mockResponse = { items: [createWriteResponse()], totalCount: 1 };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityV3Service.query(V3.ENTITY_NAME, {
        selectedFields: ["CaseId"],
        expansionLevel: V3.EXPANSION_LEVEL,
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockResponse);
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HTTP_METHODS.POST,
          headers: FOLDER_HEADER,
          queryParams: { expansionLevel: V3.EXPANSION_LEVEL },
          excludeFromPrefix: [
            "filterGroup",
            "selectedFields",
            "sortOptions",
            "aggregates",
            "groupBy",
            "joins",
            "childLimit",
          ],
        }),
        // folderKey and expansionLevel stripped; only body query fields remain
        { selectedFields: ["CaseId"] },
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.QUERY(V3.ENTITY_NAME),
      );
    });

    it("should throw a ValidationError without calling the API when more than 3 joins are supplied", async () => {
      const joins: EntityJoin[] = Array.from({ length: 4 }, (_, i) => ({
        joinFieldName: `field${i}`,
        relatedEntityName: `Related${i}`,
        relatedFieldName: `relField${i}`,
      }));

      await expect(
        entityV3Service.query(V3.ENTITY_NAME, { joins }),
      ).rejects.toThrow(ValidationError);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it("should allow exactly 3 joins", async () => {
      const joins: EntityJoin[] = Array.from({ length: 3 }, (_, i) => ({
        joinFieldName: `field${i}`,
        relatedEntityName: `Related${i}`,
        relatedFieldName: `relField${i}`,
      }));
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      await entityV3Service.query(V3.ENTITY_NAME, { joins });

      expect(PaginationHelpers.getAll).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors", async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.query(V3.ENTITY_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("queryWithExpansion", () => {
    it("should POST only the query body fields and pass expansionLevel param + folderKey header", async () => {
      const mockResponse = { value: [{ CaseId: "CASE-001" }], totalRecordCount: 1 };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.queryWithExpansion(V3.ENTITY_NAME, {
        selectedFields: ["CaseId"],
        childLimit: 100,
        expansionLevel: V3.EXPANSION_LEVEL,
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.QUERY_EXPANSION(V3.ENTITY_NAME),
        {
          filterGroup: undefined,
          selectedFields: ["CaseId"],
          sortOptions: undefined,
          aggregates: undefined,
          groupBy: undefined,
          joins: undefined,
          childLimit: 100,
        },
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: FOLDER_HEADER },
      );
    });

    it("should throw a ValidationError without calling the API when more than 3 joins are supplied", async () => {
      const joins: EntityJoin[] = Array.from({ length: 4 }, (_, i) => ({
        joinFieldName: `f${i}`,
        relatedEntityName: `E${i}`,
        relatedFieldName: "Id",
      }));

      await expect(
        entityV3Service.queryWithExpansion(V3.ENTITY_NAME, { joins }),
      ).rejects.toThrow(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.queryWithExpansion(V3.ENTITY_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Data writes --------------------------------------------------------

  describe("insert", () => {
    it("should insert a single record via POST with expansionLevel param and folderKey header", async () => {
      const data: EntityV3RecordInput = { Name: "Alice" };
      const mockResponse = createWriteResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.insert(V3.ENTITY_NAME, data, {
        expansionLevel: V3.EXPANSION_LEVEL,
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT(V3.ENTITY_NAME),
        data,
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.insert(V3.ENTITY_NAME, { Name: "Alice" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("insertRecords", () => {
    it("should batch-insert via POST with expansionLevel + failOnFirst params", async () => {
      const data: EntityV3RecordInput[] = [{ Name: "Alice" }, { Name: "Bob" }];
      const mockResponse = { successRecords: data, failureRecords: [] };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.insertRecords(V3.ENTITY_NAME, data, {
        expansionLevel: V3.EXPANSION_LEVEL,
        failOnFirst: true,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT_BATCH(V3.ENTITY_NAME),
        data,
        {
          params: { expansionLevel: V3.EXPANSION_LEVEL, failOnFirst: true },
          headers: {},
        },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.insertRecords(V3.ENTITY_NAME, [{ Name: "Alice" }]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("insertBulk", () => {
    it("should bulk-insert via POST and return the boolean result", async () => {
      const data: EntityV3RecordInput[] = [{ Name: "Alice" }];
      mockApiClient.post.mockResolvedValue(true);

      const result = await entityV3Service.insertBulk(V3.ENTITY_NAME, data, {
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT_BULK(V3.ENTITY_NAME),
        data,
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.insertBulk(V3.ENTITY_NAME, [{ Name: "Alice" }]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("upsert", () => {
    it("should upsert a record via POST with expansionLevel param", async () => {
      const data: EntityV3RecordInput = { CustomerId: "CUST-001", Name: "Alice" };
      const mockResponse = createWriteResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.upsert(V3.ENTITY_NAME, data, {
        expansionLevel: V3.EXPANSION_LEVEL,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPSERT(V3.ENTITY_NAME),
        data,
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.upsert(V3.ENTITY_NAME, { Name: "Alice" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("update", () => {
    it("should update a record by id via POST with expansionLevel param", async () => {
      const data: EntityV3RecordInput = { Name: "Alice B." };
      const mockResponse = createWriteResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.update(
        V3.ENTITY_NAME,
        V3.RECORD_ID,
        data,
        { expansionLevel: V3.EXPANSION_LEVEL },
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE(V3.ENTITY_NAME, V3.RECORD_ID),
        data,
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.update(V3.ENTITY_NAME, V3.RECORD_ID, { Name: "X" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateByKey", () => {
    it("should update a record by business key via POST", async () => {
      const data: EntityV3RecordInput = { Name: "Alice B." };
      const mockResponse = createWriteResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.updateByKey(
        V3.ENTITY_NAME,
        V3.BUSINESS_KEY,
        data,
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_BY_KEY(V3.ENTITY_NAME, V3.BUSINESS_KEY),
        data,
        { params: {}, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateByKey(V3.ENTITY_NAME, V3.BUSINESS_KEY, { Name: "X" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateRecords", () => {
    it("should batch-update via POST with expansionLevel + failOnFirst params", async () => {
      const data: EntityV3RecordInput[] = [{ Id: V3.RECORD_ID, Name: "Alice B." }];
      const mockResponse = { successRecords: data, failureRecords: [] };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.updateRecords(V3.ENTITY_NAME, data, {
        expansionLevel: V3.EXPANSION_LEVEL,
        failOnFirst: true,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_BATCH(V3.ENTITY_NAME),
        data,
        {
          params: { expansionLevel: V3.EXPANSION_LEVEL, failOnFirst: true },
          headers: {},
        },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateRecords(V3.ENTITY_NAME, [{ Id: V3.RECORD_ID }]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateWhere", () => {
    it("should conditionally update via POST and pass folderKey header", async () => {
      const request: EntityV3ConditionalUpdateRequest = {
        fieldValues: { Status: "Active" },
      };
      const mockResponse = { ...createWriteResponse(), updatedCount: 5 };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.updateWhere(V3.ENTITY_NAME, request, {
        folderKey: V3.FOLDER_KEY,
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_WHERE(V3.ENTITY_NAME),
        request,
        { headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateWhere(V3.ENTITY_NAME, { fieldValues: {} }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteRecord", () => {
    it("should delete a single record via DELETE", async () => {
      const mockResponse = { ...createWriteResponse(), deletedCount: 1 };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteRecord(V3.ENTITY_NAME, V3.RECORD_ID);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_RECORD(V3.ENTITY_NAME, V3.RECORD_ID),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteRecord(V3.ENTITY_NAME, V3.RECORD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteRecords", () => {
    it("should delete multiple records via POST with the id array as body", async () => {
      const recordIds = [V3.RECORD_ID, V3.RECORD_ID_2];
      const mockResponse = { ...createWriteResponse(), deletedCount: 2 };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteRecords(V3.ENTITY_NAME, recordIds);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE(V3.ENTITY_NAME),
        recordIds,
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteRecords(V3.ENTITY_NAME, [V3.RECORD_ID]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteRecordsBatch", () => {
    it("should batch-delete via POST with failOnFirst param", async () => {
      const recordIds = [V3.RECORD_ID, V3.RECORD_ID_2];
      const mockResponse = { successRecords: [], failureRecords: [] };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteRecordsBatch(
        V3.ENTITY_NAME,
        recordIds,
        { failOnFirst: true },
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_BATCH(V3.ENTITY_NAME),
        recordIds,
        { params: { failOnFirst: true }, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteRecordsBatch(V3.ENTITY_NAME, [V3.RECORD_ID]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Members ------------------------------------------------------------

  describe("queryMember", () => {
    it("should query a member via POST with the query excludeFromPrefix set", async () => {
      const mockResponse = { items: [{ CommentId: "CMT-001" }], totalCount: 1 };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityV3Service.queryMember(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        { folderKey: V3.FOLDER_KEY },
      );

      expect(result).toEqual(mockResponse);
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HTTP_METHODS.POST,
          headers: FOLDER_HEADER,
          excludeFromPrefix: [
            "filterGroup",
            "selectedFields",
            "sortOptions",
            "aggregates",
            "groupBy",
            "joins",
            "childLimit",
          ],
        }),
        // folderKey stripped into the header, leaving an empty downstream options bag
        {},
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.QUERY(V3.ENTITY_NAME, V3.MEMBER_NAME),
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.queryMember(V3.ENTITY_NAME, V3.MEMBER_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getMemberRecords", () => {
    it("should read member records via the MEMBER.READ endpoint and strip folderKey into the header", async () => {
      const mockResponse = { items: [{ CommentId: "CMT-001" }], totalCount: 1 };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await entityV3Service.getMemberRecords(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        { folderKey: V3.FOLDER_KEY, pageSize: TEST_CONSTANTS.PAGE_SIZE },
      );

      expect(result).toEqual(mockResponse);
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ headers: FOLDER_HEADER }),
        { pageSize: TEST_CONSTANTS.PAGE_SIZE },
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ(V3.ENTITY_NAME, V3.MEMBER_NAME),
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getMemberRecords(V3.ENTITY_NAME, V3.MEMBER_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getMemberRecord", () => {
    it("should read a single member record by id via GET", async () => {
      const mockRecord = { Id: V3.RECORD_ID, CommentId: "CMT-001" };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const result = await entityV3Service.getMemberRecord(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.RECORD_ID,
      );

      expect(result).toEqual(mockRecord);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ_RECORD(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.RECORD_ID,
        ),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getMemberRecord(V3.ENTITY_NAME, V3.MEMBER_NAME, V3.RECORD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("getMemberRecordByKey", () => {
    it("should read a single member record by business key via GET", async () => {
      const mockRecord = { Id: V3.RECORD_ID, CommentId: "CMT-001" };
      mockApiClient.get.mockResolvedValue(mockRecord);

      const result = await entityV3Service.getMemberRecordByKey(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.BUSINESS_KEY,
      );

      expect(result).toEqual(mockRecord);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ_BY_KEY(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.BUSINESS_KEY,
        ),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.getMemberRecordByKey(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.BUSINESS_KEY,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteMemberRecord", () => {
    it("should delete a single member record via DELETE", async () => {
      const mockResponse = { recordId: V3.RECORD_ID, deletedCount: 1 };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteMemberRecord(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.RECORD_ID,
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.DELETE_RECORD(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.RECORD_ID,
        ),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteMemberRecord(V3.ENTITY_NAME, V3.MEMBER_NAME, V3.RECORD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteMemberRecords", () => {
    it("should delete multiple member records via POST with the id array as body", async () => {
      const recordIds = [V3.RECORD_ID, V3.RECORD_ID_2];
      const mockResponse = { deletedCount: 2 };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteMemberRecords(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        recordIds,
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.DELETE(V3.ENTITY_NAME, V3.MEMBER_NAME),
        recordIds,
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteMemberRecords(V3.ENTITY_NAME, V3.MEMBER_NAME, [V3.RECORD_ID]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("createMemberField", () => {
    it("should create a member field via POST", async () => {
      const request: EntityV3FieldCreateRequest = {
        fieldDefinition: { name: "Priority" },
      };
      mockApiClient.post.mockResolvedValue(V3.FIELD_ID);

      const result = await entityV3Service.createMemberField(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        request,
      );

      expect(result).toBe(V3.FIELD_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.CREATE(V3.ENTITY_NAME, V3.MEMBER_NAME),
        request,
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.createMemberField(V3.ENTITY_NAME, V3.MEMBER_NAME, {
          fieldDefinition: { name: "Priority" },
        }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("updateMemberField", () => {
    it("should update a member field via PATCH with the field id merged into the body", async () => {
      const request: EntityV3FieldUpdateRequest = { displayName: "Priority Level" };
      mockApiClient.patch.mockResolvedValue(true);

      const result = await entityV3Service.updateMemberField(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.FIELD_ID,
        request,
      );

      expect(result).toBe(true);
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.UPDATE(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.FIELD_ID,
        ),
        { id: V3.FIELD_ID, ...request },
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.patch.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.updateMemberField(V3.ENTITY_NAME, V3.MEMBER_NAME, V3.FIELD_ID, {}),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteMemberField", () => {
    it("should soft-delete a member field via DELETE", async () => {
      mockApiClient.delete.mockResolvedValue(true);

      const result = await entityV3Service.deleteMemberField(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.FIELD_ID,
      );

      expect(result).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.DELETE(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.FIELD_ID,
        ),
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteMemberField(V3.ENTITY_NAME, V3.MEMBER_NAME, V3.FIELD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteMemberFieldHard", () => {
    it("should hard-delete a member field via POST with an undefined body", async () => {
      mockApiClient.post.mockResolvedValue(true);

      const result = await entityV3Service.deleteMemberFieldHard(
        V3.ENTITY_NAME,
        V3.MEMBER_NAME,
        V3.FIELD_ID,
      );

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.DELETE_HARD(
          V3.ENTITY_NAME,
          V3.MEMBER_NAME,
          V3.FIELD_ID,
        ),
        undefined,
        { headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteMemberFieldHard(V3.ENTITY_NAME, V3.MEMBER_NAME, V3.FIELD_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Attachments --------------------------------------------------------

  describe("downloadAttachment", () => {
    it("should download an attachment via GET with the blob response type", async () => {
      const mockBlob = new Blob(["file-content"]);
      mockApiClient.get.mockResolvedValue(mockBlob);

      const result = await entityV3Service.downloadAttachment(
        V3.ENTITY_NAME,
        V3.RECORD_ID,
        V3.ATTACHMENT_FIELD,
        { folderKey: V3.FOLDER_KEY },
      );

      expect(result).toBe(mockBlob);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.DOWNLOAD(
          V3.ENTITY_NAME,
          V3.RECORD_ID,
          V3.ATTACHMENT_FIELD,
        ),
        { responseType: RESPONSE_TYPES.BLOB, headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.downloadAttachment(V3.ENTITY_NAME, V3.RECORD_ID, V3.ATTACHMENT_FIELD),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("uploadAttachment", () => {
    it("should upload an attachment via POST with a FormData body and expansionLevel param", async () => {
      const file = new Blob(["file-content"]);
      const mockResponse = { Id: V3.RECORD_ID, [V3.ATTACHMENT_FIELD]: "uploaded" };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.uploadAttachment(
        V3.ENTITY_NAME,
        V3.RECORD_ID,
        V3.ATTACHMENT_FIELD,
        file,
        { expansionLevel: V3.EXPANSION_LEVEL, folderKey: V3.FOLDER_KEY },
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.UPLOAD(
          V3.ENTITY_NAME,
          V3.RECORD_ID,
          V3.ATTACHMENT_FIELD,
        ),
        expect.any(FormData),
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: FOLDER_HEADER },
      );
    });

    it("should handle API errors", async () => {
      const file = new Blob(["file-content"]);
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.uploadAttachment(
          V3.ENTITY_NAME,
          V3.RECORD_ID,
          V3.ATTACHMENT_FIELD,
          file,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("deleteAttachment", () => {
    it("should delete an attachment via DELETE with expansionLevel param", async () => {
      const mockResponse = { Id: V3.RECORD_ID, [V3.ATTACHMENT_FIELD]: null };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await entityV3Service.deleteAttachment(
        V3.ENTITY_NAME,
        V3.RECORD_ID,
        V3.ATTACHMENT_FIELD,
        { expansionLevel: V3.EXPANSION_LEVEL },
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.DELETE(
          V3.ENTITY_NAME,
          V3.RECORD_ID,
          V3.ATTACHMENT_FIELD,
        ),
        { params: { expansionLevel: V3.EXPANSION_LEVEL }, headers: {} },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.deleteAttachment(V3.ENTITY_NAME, V3.RECORD_ID, V3.ATTACHMENT_FIELD),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ----- Autopilot ----------------------------------------------------------

  describe("manageWithAutopilot", () => {
    it("should POST the autopilot request and return the response", async () => {
      const request: EntityV3AutopilotRequest = {
        query: "Create a Customers entity with a name field",
      };
      const mockResponse = { isSuccess: true, action: "create_entity" };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await entityV3Service.manageWithAutopilot(request);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.AUTOPILOT.MANAGE,
        request,
        {},
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.manageWithAutopilot({ query: "hi" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe("manageWithAutopilotStream", () => {
    it("should POST with the stream response type and return the ReadableStream", async () => {
      const request: EntityV3AutopilotRequest = { query: "Add a status field" };
      const mockStream = new ReadableStream<Uint8Array>();
      mockApiClient.post.mockResolvedValue(mockStream);

      const result = await entityV3Service.manageWithAutopilotStream(request);

      expect(result).toBe(mockStream);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_V3_ENDPOINTS.ENTITY.AUTOPILOT.MANAGE_STREAM,
        request,
        { responseType: RESPONSE_TYPES.STREAM },
      );
    });

    it("should handle API errors", async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(
        entityV3Service.manageWithAutopilotStream({ query: "hi" }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
