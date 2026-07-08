// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createEntityV3WithMethods } from "../../../../src/models/data-fabric/entities-v3.models";
import type { EntityV3ServiceModel } from "../../../../src/models/data-fabric/entities-v3.models";
import type {
  EntityV3Metadata,
  EntityV3RecordInput,
  EntityV3ConditionalUpdateRequest,
  EntityV3UpdateMetadataRequest,
  EntityV3FieldCreateRequest,
  EntityV3FieldUpdateRequest,
  EntityV3ReadOptions,
  EntityV3QueryOptions,
  EntityV3InsertOptions,
  EntityV3SchemaOptions,
} from "../../../../src/models/data-fabric/entities-v3.types";

// ===== TEST CONSTANTS =====
const ENTITY_ID = "11111111-1111-1111-1111-111111111111";
const ENTITY_NAME = "LoanCaseForBank";
const ENTITY_DISPLAY_NAME = "Loan Case For Bank";
const RECORD_ID = "22222222-2222-2222-2222-222222222222";
const RECORD_ID_2 = "33333333-3333-3333-3333-333333333333";
const RECORD_KEY = "CASE-001";
const MEMBER_NAME = "Comments";
const FIELD_ID = "44444444-4444-4444-4444-444444444444";
const FIELD_NAME = "Avatar";
const FOLDER_KEY = "55555555-5555-5555-5555-555555555555";

const ERROR_NAME_UNDEFINED = "Entity name is undefined";
const ERROR_ID_UNDEFINED = "Entity ID is undefined";
const ERROR_MEMBER_UNDEFINED = "Member name is undefined";
const ERROR_RECORD_ID_UNDEFINED = "Record ID is undefined";
const ERROR_RECORD_KEY_UNDEFINED = "Record key is undefined";
const ERROR_FIELD_ID_UNDEFINED = "Field ID is undefined";

const RECORD_INPUT: EntityV3RecordInput = { CaseId: "CASE-001", CaseStatus: "Open" };
const RECORD_INPUT_2: EntityV3RecordInput = { CaseId: "CASE-002", CaseStatus: "Closed" };
const SCHEMA_OPTIONS: EntityV3SchemaOptions = { folderKey: FOLDER_KEY };
const READ_OPTIONS: EntityV3ReadOptions = { expansionLevel: 1 };
const QUERY_OPTIONS: EntityV3QueryOptions = { selectedFields: ["CaseId"] };
const INSERT_OPTIONS: EntityV3InsertOptions = { expansionLevel: 1 };
const CONDITIONAL_UPDATE_REQUEST: EntityV3ConditionalUpdateRequest = {
  fieldValues: { CaseStatus: "Closed" },
};
const UPDATE_METADATA_REQUEST: EntityV3UpdateMetadataRequest = { displayName: "Renamed" };
const FIELD_CREATE_REQUEST: EntityV3FieldCreateRequest = {
  fieldDefinition: { name: "Notes" },
};
const FIELD_UPDATE_REQUEST: EntityV3FieldUpdateRequest = { displayName: "Internal Notes" };

// A sentinel value used to prove the service's return value is passed through unchanged.
const SENTINEL = { sentinel: true };

/** Builds entity metadata, allowing individual fields to be overridden or omitted. */
const makeEntity = (overrides: Partial<EntityV3Metadata> = {}): EntityV3Metadata => ({
  id: ENTITY_ID,
  name: ENTITY_NAME,
  displayName: ENTITY_DISPLAY_NAME,
  ...overrides,
});

// ===== TEST SUITE =====
describe("Entity V3 Models", () => {
  let mockService: EntityV3ServiceModel;

  beforeEach(() => {
    mockService = {
      // Service-level entry points (not bound, but required to satisfy the type)
      getAll: vi.fn(),
      getAllWithChoiceSets: vi.fn(),
      getFolderEntities: vi.fn(),
      getById: vi.fn(),
      getMetadata: vi.fn(),
      create: vi.fn(),
      deleteById: vi.fn(),
      updateMetadata: vi.fn(),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      manageWithAutopilot: vi.fn(),
      manageWithAutopilotStream: vi.fn(),
      // Data operations
      getRecords: vi.fn(),
      getRecord: vi.fn(),
      getRecordByKey: vi.fn(),
      query: vi.fn(),
      queryWithExpansion: vi.fn(),
      insert: vi.fn(),
      insertRecords: vi.fn(),
      insertBulk: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateByKey: vi.fn(),
      updateRecords: vi.fn(),
      updateWhere: vi.fn(),
      deleteRecord: vi.fn(),
      deleteRecords: vi.fn(),
      deleteRecordsBatch: vi.fn(),
      queryMember: vi.fn(),
      getMemberRecords: vi.fn(),
      getMemberRecord: vi.fn(),
      getMemberRecordByKey: vi.fn(),
      deleteMemberRecord: vi.fn(),
      deleteMemberRecords: vi.fn(),
      createMemberField: vi.fn(),
      updateMemberField: vi.fn(),
      deleteMemberField: vi.fn(),
      deleteMemberFieldHard: vi.fn(),
      downloadAttachment: vi.fn(),
      uploadAttachment: vi.fn(),
      deleteAttachment: vi.fn(),
    } as EntityV3ServiceModel;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Data-operation bound methods — addressed by the entity's NAME
  // -------------------------------------------------------------------------
  describe("data-operation bound methods (addressed by entity name)", () => {
    describe("entity.getRecords()", () => {
      it("should delegate to service.getRecords with entity name and forward options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getRecords = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getRecords(READ_OPTIONS);

        expect(mockService.getRecords).toHaveBeenCalledWith(ENTITY_NAME, READ_OPTIONS);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.getRecord()", () => {
      it("should delegate to service.getRecord with entity name, recordId, and options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getRecord = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getRecord(RECORD_ID, READ_OPTIONS);

        expect(mockService.getRecord).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, READ_OPTIONS);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getRecord("")).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.getRecordByKey()", () => {
      it("should delegate to service.getRecordByKey with entity name, key, and options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getRecordByKey = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getRecordByKey(RECORD_KEY, READ_OPTIONS);

        expect(mockService.getRecordByKey).toHaveBeenCalledWith(ENTITY_NAME, RECORD_KEY, READ_OPTIONS);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if key is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getRecordByKey("")).rejects.toThrow(ERROR_RECORD_KEY_UNDEFINED);
      });
    });

    describe("entity.query()", () => {
      it("should delegate to service.query with entity name and forward options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.query = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.query(QUERY_OPTIONS);

        expect(mockService.query).toHaveBeenCalledWith(ENTITY_NAME, QUERY_OPTIONS);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.queryWithExpansion()", () => {
      it("should delegate to service.queryWithExpansion with entity name and forward options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.queryWithExpansion = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.queryWithExpansion(QUERY_OPTIONS);

        expect(mockService.queryWithExpansion).toHaveBeenCalledWith(ENTITY_NAME, QUERY_OPTIONS);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.insert()", () => {
      it("should delegate to service.insert with entity name, data, and options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.insert = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.insert(RECORD_INPUT, INSERT_OPTIONS);

        expect(mockService.insert).toHaveBeenCalledWith(ENTITY_NAME, RECORD_INPUT, INSERT_OPTIONS);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.insertRecords()", () => {
      it("should delegate to service.insertRecords with entity name and data array", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.insertRecords = vi.fn().mockResolvedValue(SENTINEL);

        const data = [RECORD_INPUT, RECORD_INPUT_2];
        const result = await entity.insertRecords(data);

        expect(mockService.insertRecords).toHaveBeenCalledWith(ENTITY_NAME, data, undefined);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.insertBulk()", () => {
      it("should delegate to service.insertBulk with entity name and data array", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.insertBulk = vi.fn().mockResolvedValue(true);

        const data = [RECORD_INPUT, RECORD_INPUT_2];
        const result = await entity.insertBulk(data);

        expect(mockService.insertBulk).toHaveBeenCalledWith(ENTITY_NAME, data, undefined);
        expect(result).toBe(true);
      });
    });

    describe("entity.upsert()", () => {
      it("should delegate to service.upsert with entity name, data, and options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.upsert = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.upsert(RECORD_INPUT, INSERT_OPTIONS);

        expect(mockService.upsert).toHaveBeenCalledWith(ENTITY_NAME, RECORD_INPUT, INSERT_OPTIONS);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.update()", () => {
      it("should delegate to service.update with entity name, recordId, and data", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.update = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.update(RECORD_ID, RECORD_INPUT);

        expect(mockService.update).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, RECORD_INPUT, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.update("", RECORD_INPUT)).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.updateByKey()", () => {
      it("should delegate to service.updateByKey with entity name, key, and data", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateByKey = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.updateByKey(RECORD_KEY, RECORD_INPUT);

        expect(mockService.updateByKey).toHaveBeenCalledWith(ENTITY_NAME, RECORD_KEY, RECORD_INPUT, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if key is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.updateByKey("", RECORD_INPUT)).rejects.toThrow(ERROR_RECORD_KEY_UNDEFINED);
      });
    });

    describe("entity.updateRecords()", () => {
      it("should delegate to service.updateRecords with entity name and data array", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateRecords = vi.fn().mockResolvedValue(SENTINEL);

        const data = [{ Id: RECORD_ID, ...RECORD_INPUT }];
        const result = await entity.updateRecords(data);

        expect(mockService.updateRecords).toHaveBeenCalledWith(ENTITY_NAME, data, undefined);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.updateWhere()", () => {
      it("should delegate to service.updateWhere with entity name and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateWhere = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.updateWhere(CONDITIONAL_UPDATE_REQUEST);

        expect(mockService.updateWhere).toHaveBeenCalledWith(ENTITY_NAME, CONDITIONAL_UPDATE_REQUEST, undefined);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.deleteRecord()", () => {
      it("should delegate to service.deleteRecord with entity name and recordId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteRecord = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.deleteRecord(RECORD_ID);

        expect(mockService.deleteRecord).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteRecord("")).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteRecords()", () => {
      it("should delegate to service.deleteRecords with entity name and record ids", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteRecords = vi.fn().mockResolvedValue(SENTINEL);

        const ids = [RECORD_ID, RECORD_ID_2];
        const result = await entity.deleteRecords(ids);

        expect(mockService.deleteRecords).toHaveBeenCalledWith(ENTITY_NAME, ids, undefined);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.deleteRecordsBatch()", () => {
      it("should delegate to service.deleteRecordsBatch with entity name and record ids", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteRecordsBatch = vi.fn().mockResolvedValue(SENTINEL);

        const ids = [RECORD_ID, RECORD_ID_2];
        const result = await entity.deleteRecordsBatch(ids);

        expect(mockService.deleteRecordsBatch).toHaveBeenCalledWith(ENTITY_NAME, ids, undefined);
        expect(result).toBe(SENTINEL);
      });
    });

    describe("entity.downloadAttachment()", () => {
      it("should delegate to service.downloadAttachment with entity name, recordId, and fieldName", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        const blob = new Blob(["data"]);
        mockService.downloadAttachment = vi.fn().mockResolvedValue(blob);

        const result = await entity.downloadAttachment(RECORD_ID, FIELD_NAME);

        expect(mockService.downloadAttachment).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, FIELD_NAME, undefined);
        expect(result).toBe(blob);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.downloadAttachment("", FIELD_NAME)).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.uploadAttachment()", () => {
      it("should delegate to service.uploadAttachment with entity name, recordId, fieldName, and file", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        const file = new Blob(["data"], { type: "application/pdf" });
        mockService.uploadAttachment = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.uploadAttachment(RECORD_ID, FIELD_NAME, file);

        expect(mockService.uploadAttachment).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, FIELD_NAME, file, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.uploadAttachment("", FIELD_NAME, new Blob())).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteAttachment()", () => {
      it("should delegate to service.deleteAttachment with entity name, recordId, and fieldName", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteAttachment = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.deleteAttachment(RECORD_ID, FIELD_NAME);

        expect(mockService.deleteAttachment).toHaveBeenCalledWith(ENTITY_NAME, RECORD_ID, FIELD_NAME, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteAttachment("", FIELD_NAME)).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Composite member bound methods — addressed by entity name + member name
  // -------------------------------------------------------------------------
  describe("composite member bound methods (addressed by entity name + member name)", () => {
    describe("entity.queryMember()", () => {
      it("should delegate to service.queryMember with entity name, member name, and options", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.queryMember = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.queryMember(MEMBER_NAME, QUERY_OPTIONS);

        expect(mockService.queryMember).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, QUERY_OPTIONS);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.queryMember("")).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });
    });

    describe("entity.getMemberRecords()", () => {
      it("should delegate to service.getMemberRecords with entity name and member name", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getMemberRecords = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getMemberRecords(MEMBER_NAME);

        expect(mockService.getMemberRecords).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getMemberRecords("")).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });
    });

    describe("entity.getMemberRecord()", () => {
      it("should delegate to service.getMemberRecord with entity name, member name, and recordId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getMemberRecord = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getMemberRecord(MEMBER_NAME, RECORD_ID);

        expect(mockService.getMemberRecord).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, RECORD_ID, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getMemberRecord("", RECORD_ID)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getMemberRecord(MEMBER_NAME, "")).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.getMemberRecordByKey()", () => {
      it("should delegate to service.getMemberRecordByKey with entity name, member name, and key", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.getMemberRecordByKey = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.getMemberRecordByKey(MEMBER_NAME, RECORD_KEY);

        expect(mockService.getMemberRecordByKey).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, RECORD_KEY, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getMemberRecordByKey("", RECORD_KEY)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if key is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.getMemberRecordByKey(MEMBER_NAME, "")).rejects.toThrow(ERROR_RECORD_KEY_UNDEFINED);
      });
    });

    describe("entity.deleteMemberRecord()", () => {
      it("should delegate to service.deleteMemberRecord with entity name, member name, and recordId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteMemberRecord = vi.fn().mockResolvedValue(SENTINEL);

        const result = await entity.deleteMemberRecord(MEMBER_NAME, RECORD_ID);

        expect(mockService.deleteMemberRecord).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, RECORD_ID, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberRecord("", RECORD_ID)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if recordId is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberRecord(MEMBER_NAME, "")).rejects.toThrow(ERROR_RECORD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteMemberRecords()", () => {
      it("should delegate to service.deleteMemberRecords with entity name, member name, and record ids", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteMemberRecords = vi.fn().mockResolvedValue(SENTINEL);

        const ids = [RECORD_ID, RECORD_ID_2];
        const result = await entity.deleteMemberRecords(MEMBER_NAME, ids);

        expect(mockService.deleteMemberRecords).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, ids, undefined);
        expect(result).toBe(SENTINEL);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberRecords("", [RECORD_ID])).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });
    });

    describe("entity.createMemberField()", () => {
      it("should delegate to service.createMemberField with entity name, member name, and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.createMemberField = vi.fn().mockResolvedValue(FIELD_ID);

        const result = await entity.createMemberField(MEMBER_NAME, FIELD_CREATE_REQUEST);

        expect(mockService.createMemberField).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, FIELD_CREATE_REQUEST, undefined);
        expect(result).toBe(FIELD_ID);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.createMemberField("", FIELD_CREATE_REQUEST)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });
    });

    describe("entity.updateMemberField()", () => {
      it("should delegate to service.updateMemberField with entity name, member name, fieldId, and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateMemberField = vi.fn().mockResolvedValue(true);

        const result = await entity.updateMemberField(MEMBER_NAME, FIELD_ID, FIELD_UPDATE_REQUEST);

        expect(mockService.updateMemberField).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, FIELD_ID, FIELD_UPDATE_REQUEST, undefined);
        expect(result).toBe(true);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.updateMemberField("", FIELD_ID, FIELD_UPDATE_REQUEST)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if field id is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.updateMemberField(MEMBER_NAME, "", FIELD_UPDATE_REQUEST)).rejects.toThrow(ERROR_FIELD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteMemberField()", () => {
      it("should delegate to service.deleteMemberField with entity name, member name, and fieldId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteMemberField = vi.fn().mockResolvedValue(true);

        const result = await entity.deleteMemberField(MEMBER_NAME, FIELD_ID);

        expect(mockService.deleteMemberField).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, FIELD_ID, undefined);
        expect(result).toBe(true);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberField("", FIELD_ID)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if field id is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberField(MEMBER_NAME, "")).rejects.toThrow(ERROR_FIELD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteMemberFieldHard()", () => {
      it("should delegate to service.deleteMemberFieldHard with entity name, member name, and fieldId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteMemberFieldHard = vi.fn().mockResolvedValue(true);

        const result = await entity.deleteMemberFieldHard(MEMBER_NAME, FIELD_ID);

        expect(mockService.deleteMemberFieldHard).toHaveBeenCalledWith(ENTITY_NAME, MEMBER_NAME, FIELD_ID, undefined);
        expect(result).toBe(true);
      });

      it("should throw if member name is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberFieldHard("", FIELD_ID)).rejects.toThrow(ERROR_MEMBER_UNDEFINED);
      });

      it("should throw if field id is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteMemberFieldHard(MEMBER_NAME, "")).rejects.toThrow(ERROR_FIELD_ID_UNDEFINED);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Schema-operation bound methods — addressed by the entity's ID
  // -------------------------------------------------------------------------
  describe("schema-operation bound methods (addressed by entity id)", () => {
    describe("entity.createField()", () => {
      it("should delegate to service.createField with entity id and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.createField = vi.fn().mockResolvedValue(FIELD_ID);

        const result = await entity.createField(FIELD_CREATE_REQUEST, SCHEMA_OPTIONS);

        expect(mockService.createField).toHaveBeenCalledWith(ENTITY_ID, FIELD_CREATE_REQUEST, SCHEMA_OPTIONS);
        expect(result).toBe(FIELD_ID);
      });
    });

    describe("entity.updateField()", () => {
      it("should delegate to service.updateField with entity id, fieldId, and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateField = vi.fn().mockResolvedValue(true);

        const result = await entity.updateField(FIELD_ID, FIELD_UPDATE_REQUEST);

        expect(mockService.updateField).toHaveBeenCalledWith(ENTITY_ID, FIELD_ID, FIELD_UPDATE_REQUEST, undefined);
        expect(result).toBe(true);
      });

      it("should throw if field id is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.updateField("", FIELD_UPDATE_REQUEST)).rejects.toThrow(ERROR_FIELD_ID_UNDEFINED);
      });
    });

    describe("entity.deleteField()", () => {
      it("should delegate to service.deleteField with entity id and fieldId", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteField = vi.fn().mockResolvedValue(true);

        const result = await entity.deleteField(FIELD_ID);

        expect(mockService.deleteField).toHaveBeenCalledWith(ENTITY_ID, FIELD_ID, undefined);
        expect(result).toBe(true);
      });

      it("should throw if field id is missing", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        await expect(entity.deleteField("")).rejects.toThrow(ERROR_FIELD_ID_UNDEFINED);
      });
    });

    describe("entity.updateMetadata()", () => {
      it("should delegate to service.updateMetadata with entity id and request", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.updateMetadata = vi.fn().mockResolvedValue(true);

        const result = await entity.updateMetadata(UPDATE_METADATA_REQUEST, SCHEMA_OPTIONS);

        expect(mockService.updateMetadata).toHaveBeenCalledWith(ENTITY_ID, UPDATE_METADATA_REQUEST, SCHEMA_OPTIONS);
        expect(result).toBe(true);
      });
    });

    describe("entity.delete()", () => {
      it("should delegate to service.deleteById using the entity's own id", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteById = vi.fn().mockResolvedValue(undefined);

        await entity.delete();

        expect(mockService.deleteById).toHaveBeenCalledWith(ENTITY_ID, undefined);
      });

      it("should forward folderKey options to service.deleteById", async () => {
        const entity = createEntityV3WithMethods(makeEntity(), mockService);
        mockService.deleteById = vi.fn().mockResolvedValue(undefined);

        await entity.delete(SCHEMA_OPTIONS);

        expect(mockService.deleteById).toHaveBeenCalledWith(ENTITY_ID, SCHEMA_OPTIONS);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Entity-level guard errors (name for data ops, id for schema ops)
  // -------------------------------------------------------------------------
  describe("entity-level guard errors", () => {
    it("data-op methods throw when entity name is undefined", async () => {
      const entity = createEntityV3WithMethods(
        makeEntity({ name: undefined as unknown as string }),
        mockService,
      );

      await expect(entity.getRecords()).rejects.toThrow(ERROR_NAME_UNDEFINED);
      await expect(entity.query()).rejects.toThrow(ERROR_NAME_UNDEFINED);
      await expect(entity.insert(RECORD_INPUT)).rejects.toThrow(ERROR_NAME_UNDEFINED);
      await expect(entity.updateWhere(CONDITIONAL_UPDATE_REQUEST)).rejects.toThrow(ERROR_NAME_UNDEFINED);
    });

    it("schema-op methods throw when entity id is undefined", async () => {
      const entity = createEntityV3WithMethods(
        makeEntity({ id: undefined as unknown as string }),
        mockService,
      );

      await expect(entity.createField(FIELD_CREATE_REQUEST)).rejects.toThrow(ERROR_ID_UNDEFINED);
      await expect(entity.updateField(FIELD_ID, FIELD_UPDATE_REQUEST)).rejects.toThrow(ERROR_ID_UNDEFINED);
      await expect(entity.deleteField(FIELD_ID)).rejects.toThrow(ERROR_ID_UNDEFINED);
      await expect(entity.updateMetadata(UPDATE_METADATA_REQUEST)).rejects.toThrow(ERROR_ID_UNDEFINED);
      await expect(entity.delete()).rejects.toThrow(ERROR_ID_UNDEFINED);
    });
  });

  // -------------------------------------------------------------------------
  // Metadata + methods combined correctly
  // -------------------------------------------------------------------------
  describe("createEntityV3WithMethods combines metadata and methods", () => {
    it("should preserve entity metadata fields", () => {
      const entity = createEntityV3WithMethods(
        makeEntity({ isComposite: true, entityClass: "CaseComposite" }),
        mockService,
      );

      expect(entity.id).toBe(ENTITY_ID);
      expect(entity.name).toBe(ENTITY_NAME);
      expect(entity.displayName).toBe(ENTITY_DISPLAY_NAME);
      expect(entity.isComposite).toBe(true);
      expect(entity.entityClass).toBe("CaseComposite");
    });

    it("should attach all bound operation methods", () => {
      const entity = createEntityV3WithMethods(makeEntity(), mockService);

      // Data ops
      expect(typeof entity.getRecords).toBe("function");
      expect(typeof entity.getRecord).toBe("function");
      expect(typeof entity.insert).toBe("function");
      expect(typeof entity.upsert).toBe("function");
      expect(typeof entity.deleteRecord).toBe("function");
      // Member ops
      expect(typeof entity.queryMember).toBe("function");
      expect(typeof entity.createMemberField).toBe("function");
      // Schema ops
      expect(typeof entity.createField).toBe("function");
      expect(typeof entity.updateMetadata).toBe("function");
      expect(typeof entity.delete).toBe("function");
    });
  });
});
