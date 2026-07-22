/**
 * Model definitions for the Data Fabric Entity **v3** service — composed response
 * type, the public {@link EntityV3ServiceModel} interface (source of truth for the
 * API docs), the bound-methods interface, and the method-attachment factory.
 */

import {
  EntityV3Metadata,
  EntityV3ListResponse,
  EntityV3WriteResponse,
  EntityV3QueryExpansionResponse,
  EntityV3MemberDeleteResponse,
  EntityV3BatchResponse,
  EntityV3RecordInput,
  EntityV3ConditionalUpdateRequest,
  EntityV3CreateRequest,
  EntityV3CompositeCreateResponse,
  EntityV3UpdateMetadataRequest,
  EntityV3FieldCreateRequest,
  EntityV3FieldUpdateRequest,
  EntityV3AutopilotRequest,
  EntityV3AutopilotResponse,
  EntityV3GetAllOptions,
  EntityV3GetAllPagedOptions,
  EntityV3ReadOptions,
  EntityV3GetRecordOptions,
  EntityV3QueryOptions,
  EntityV3InsertOptions,
  EntityV3BatchOptions,
  EntityV3UpdateOptions,
  EntityV3DeleteOptions,
  EntityV3InsertBulkOptions,
  EntityV3UpdateWhereOptions,
  EntityV3DeleteBatchOptions,
  EntityV3MemberReadOptions,
  EntityV3MemberGetRecordOptions,
  EntityV3MemberQueryOptions,
  EntityV3UploadAttachmentOptions,
  EntityV3DownloadAttachmentOptions,
  EntityV3DeleteAttachmentOptions,
  EntityV3SchemaOptions,
} from './entities-v3.types';
import { EntityFileType } from './entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/** Response from creating an entity: the new entity id (single) or the composite descriptor. */
export type EntityV3CreateResponse = string | EntityV3CompositeCreateResponse;

/**
 * Service for the UiPath Data Fabric Entity **v3** API.
 *
 * v3 adds composite-entity support — a logical business entity backed by multiple
 * related "member" tables — while remaining a superset of the v1/v2 data surface.
 * Reads and queries resolve to {@link EntityV3WriteResponse} records (paginated where
 * applicable), and writes return an {@link EntityV3WriteResponse}, so callers use one
 * record model for composite and non-composite entities alike. Composite child records
 * are keyed by member instance name under `children`.
 *
 * Data operations are addressed by entity **name**; schema operations are addressed
 * by entity **id** (GUID). Composite child records are keyed by member instance name
 * under `children`.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { EntitiesV3 } from '@uipath/uipath-typescript/entities-v3';
 *
 * const entitiesV3 = new EntitiesV3(sdk);
 * const entities = await entitiesV3.getAll();
 * ```
 */
export interface EntityV3ServiceModel {
  /**
   * Lists entities in the tenant (v3). Composite entities appear with
   * `isComposite: true`; composite member tables are hidden from this listing.
   *
   * @param options - Optional {@link EntityV3GetAllOptions} (`entityClass` filter, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to an array of entity metadata {@link EntityV3Metadata}
   * @example
   * ```typescript
   * const entities = await entitiesV3.getAll();
   *
   * // Only composite entities
   * const composites = await entitiesV3.getAll({ entityClass: "CaseComposite" });
   * ```
   */
  getAll(options?: EntityV3GetAllOptions): Promise<EntityV3Metadata[]>;

  /**
   * Lists entities together with the choice sets in scope (v3 `all` endpoint),
   * using a raw start/limit window.
   *
   * @param options - Optional {@link EntityV3GetAllPagedOptions} (`start`, `limit`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to entities and choice sets {@link EntityV3ListResponse}
   * @example
   * ```typescript
   * const { entities, choicesets } = await entitiesV3.getAllWithChoiceSets({ start: 0, limit: 100 });
   * ```
   */
  getAllWithChoiceSets(options?: EntityV3GetAllPagedOptions): Promise<EntityV3ListResponse>;

  /**
   * Lists tenant-level and folder-level entities together (v3).
   *
   * @param options - Optional {@link EntityV3GetAllOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to an array of entity metadata {@link EntityV3Metadata}
   * @example
   * ```typescript
   * const entities = await entitiesV3.getFolderEntities();
   * ```
   */
  getFolderEntities(options?: EntityV3GetAllOptions): Promise<EntityV3Metadata[]>;

  /**
   * Gets entity metadata by entity ID, with operation methods attached.
   *
   * @param entityId - UUID of the entity
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to entity metadata with operation methods {@link EntityV3GetResponse}
   * @example
   * ```typescript
   * const entity = await entitiesV3.getById("<entityId>");
   * const records = await entity.getRecords();
   * ```
   */
  getById(entityId: string, options?: EntityV3SchemaOptions): Promise<EntityV3GetResponse>;

  /**
   * Gets entity metadata by entity **name**, enriched with composite info when
   * applicable, with operation methods attached. Use this to discover a composite's
   * member tree via `compositeInfo`.
   *
   * @param entityName - Name of the entity
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to entity metadata with operation methods {@link EntityV3GetResponse}
   * @example
   * ```typescript
   * const entity = await entitiesV3.getMetadata("LoanCaseForBank");
   * if (entity.isComposite) {
   *   console.log(entity.compositeInfo?.members?.map(m => m.entityName));
   * }
   * ```
   */
  getMetadata(entityName: string, options?: EntityV3SchemaOptions): Promise<EntityV3GetResponse>;

  /**
   * Creates a single or composite entity. Omit `members` for a single entity;
   * include a non-empty `members` array to create a composite.
   *
   * @param request - The entity creation payload {@link EntityV3CreateRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the new entity id (single) or composite descriptor {@link EntityV3CreateResponse}
   * @example
   * ```typescript
   * import { EntityFieldDataType } from '@uipath/uipath-typescript/entities';
   *
   * // Single entity
   * const id = await entitiesV3.create({
   *   displayName: "Users",
   *   entityDefinition: {
   *     name: "Users",
   *     fields: [{ name: "Email", isRequired: true, fieldDataType: { name: EntityFieldDataType.STRING } }],
   *   },
   * });
   * ```
   */
  create(request: EntityV3CreateRequest, options?: EntityV3SchemaOptions): Promise<EntityV3CreateResponse>;

  /**
   * Deletes an entity by id. Deleting a composite always cascades to all member tables.
   *
   * @param entityId - UUID of the entity
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving when the entity is deleted
   * @example
   * ```typescript
   * await entitiesV3.deleteById("<entityId>");
   * ```
   */
  deleteById(entityId: string, options?: EntityV3SchemaOptions): Promise<void>;

  /**
   * Updates entity metadata (display name, description, folder, RBAC/Insights flags).
   *
   * @param entityId - UUID of the entity
   * @param request - Metadata changes to apply {@link EntityV3UpdateMetadataRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.updateMetadata("<entityId>", { displayName: "Renamed" });
   * ```
   */
  updateMetadata(entityId: string, request: EntityV3UpdateMetadataRequest, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Adds a field to an entity.
   *
   * @param entityId - UUID of the entity
   * @param request - Field definition {@link EntityV3FieldCreateRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the new field's UUID
   * @example
   * ```typescript
   * import { EntityFieldDataType } from '@uipath/uipath-typescript/entities';
   *
   * const fieldId = await entitiesV3.createField("<entityId>", {
   *   fieldDefinition: { name: "Notes", fieldDataType: { name: EntityFieldDataType.STRING } },
   * });
   * ```
   */
  createField(entityId: string, request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string>;

  /**
   * Updates a field's metadata (display name, required, etc.). The SQL type name is immutable.
   *
   * @param entityId - UUID of the entity
   * @param fieldId - UUID of the field
   * @param request - Field metadata changes {@link EntityV3FieldUpdateRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.updateField("<entityId>", "<fieldId>", { displayName: "Internal Notes" });
   * ```
   */
  updateField(entityId: string, fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Soft-deletes a field (preserves the underlying column for recovery).
   *
   * @param entityId - UUID of the entity
   * @param fieldId - UUID of the field
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.deleteField("<entityId>", "<fieldId>");
   * ```
   */
  deleteField(entityId: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Reads a page of records for an entity by name. For composite entities the
   * response includes nested `children` per record (capped by expansion level).
   *
   * @param entityName - Name of the entity
   * @param options - Optional {@link EntityV3ReadOptions} (`expansionLevel`, pagination, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to an array of records or a paginated response of {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * const records = await entitiesV3.getRecords("Customer");
   *
   * // Composite: include one level of children, first page
   * const page = await entitiesV3.getRecords("LoanCaseForBank", { expansionLevel: 1, pageSize: 50 });
   * ```
   */
  getRecords<T extends EntityV3ReadOptions = EntityV3ReadOptions>(
    entityName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>>;

  /**
   * Reads a single record by its system Id (GUID).
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record
   * @param options - Optional {@link EntityV3GetRecordOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the record's fields
   * @example
   * ```typescript
   * const record = await entitiesV3.getRecord("Customer", "<recordId>");
   * ```
   */
  getRecord(entityName: string, recordId: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>>;

  /**
   * Reads a single record by its business key.
   *
   * @param entityName - Name of the entity
   * @param key - Business key value of the record
   * @param options - Optional {@link EntityV3GetRecordOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the record's fields
   * @example
   * ```typescript
   * const record = await entitiesV3.getRecordByKey("Customer", "CUST-001");
   * ```
   */
  getRecordByKey(entityName: string, key: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>>;

  /**
   * Queries records with filters, sorting, aggregates, joins, and pagination. For
   * composites, prefix member fields as `Member.Field` and cap children with `childLimit`.
   *
   * @param entityName - Name of the entity
   * @param options - Optional {@link EntityV3QueryOptions}. `folderKey` is **experimental**.
   * @returns Promise resolving to an array of records or a paginated response of {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * import { LogicalOperator, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
   *
   * const result = await entitiesV3.query("LoanCaseForBank", {
   *   selectedFields: ["CaseId", "CaseStatus", "Comments.Comment"],
   *   filterGroup: {
   *     logicalOperator: LogicalOperator.And,
   *     queryFilters: [{ fieldName: "CaseStatus", operator: QueryFilterOperator.Equals, value: "Open" }],
   *   },
   *   childLimit: 100,
   * });
   * ```
   */
  query<T extends EntityV3QueryOptions = EntityV3QueryOptions>(
    entityName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>>;

  /**
   * Queries records and returns the result set both as an array and as a
   * pre-serialised JSON string.
   *
   * @param entityName - Name of the entity
   * @param options - Optional {@link EntityV3QueryOptions}. `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3QueryExpansionResponse}
   * @example
   * ```typescript
   * const { value, jsonValue } = await entitiesV3.queryWithExpansion("Customer", { expansionLevel: 1 });
   * ```
   */
  queryWithExpansion(entityName: string, options?: EntityV3QueryOptions): Promise<EntityV3QueryExpansionResponse>;

  /**
   * Inserts a single record. For composite entities, include child arrays keyed by
   * member instance name; foreign keys are inferred from nesting position.
   *
   * @param entityName - Name of the entity
   * @param data - The record to insert {@link EntityV3RecordInput}
   * @param options - Optional {@link EntityV3InsertOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the inserted record {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * // Non-composite
   * const rec = await entitiesV3.insert("Customer", { Name: "Alice" });
   *
   * // Composite with nested children
   * const caseRec = await entitiesV3.insert("LoanCaseForBank", {
   *   CaseId: "CASE-001",
   *   CaseStatus: "Open",
   *   Comments: [{ CommentId: "CMT-001", Comment: "Initial triage" }],
   * });
   * ```
   */
  insert(entityName: string, data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse>;

  /**
   * Inserts multiple records in a batch (non-composite entities only).
   *
   * @param entityName - Name of the entity
   * @param data - Records to insert
   * @param options - Optional {@link EntityV3BatchOptions} (`expansionLevel`, `failOnFirst`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3BatchResponse}
   * @example
   * ```typescript
   * const result = await entitiesV3.insertRecords("Customer", [{ Name: "Alice" }, { Name: "Bob" }]);
   * ```
   */
  insertRecords(entityName: string, data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse>;

  /**
   * Bulk-inserts records (fire-and-forget; non-composite entities only).
   *
   * @param entityName - Name of the entity
   * @param data - Records to insert
   * @param options - Optional {@link EntityV3InsertBulkOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.insertBulk("Customer", [{ Name: "Alice" }, { Name: "Bob" }]);
   * ```
   */
  insertBulk(entityName: string, data: EntityV3RecordInput[], options?: EntityV3InsertBulkOptions): Promise<boolean>;

  /**
   * Inserts or updates a record by business key. For composites, each member record
   * is upserted by its business key.
   *
   * @param entityName - Name of the entity
   * @param data - The record to upsert {@link EntityV3RecordInput}
   * @param options - Optional {@link EntityV3InsertOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the upserted record {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * await entitiesV3.upsert("Customer", { CustomerId: "CUST-001", Name: "Alice" });
   * ```
   */
  upsert(entityName: string, data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse>;

  /**
   * Updates a record by system Id. For composites, root fields are partially updated
   * and child arrays are upserted by business key.
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record to update
   * @param data - Fields to set (and, for composites, child arrays) {@link EntityV3RecordInput}
   * @param options - Optional {@link EntityV3UpdateOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the post-update snapshot {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * await entitiesV3.update("Customer", "<recordId>", { Name: "Alice B." });
   * ```
   */
  update(entityName: string, recordId: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse>;

  /**
   * Updates a record by business key (see {@link update} for composite semantics).
   *
   * @param entityName - Name of the entity
   * @param key - Business key value of the record to update
   * @param data - Fields to set {@link EntityV3RecordInput}
   * @param options - Optional {@link EntityV3UpdateOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the post-update snapshot {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * await entitiesV3.updateByKey("Customer", "CUST-001", { Name: "Alice B." });
   * ```
   */
  updateByKey(entityName: string, key: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse>;

  /**
   * Updates multiple records in a batch (non-composite entities only).
   *
   * @param entityName - Name of the entity
   * @param data - Records to update (each must include its `Id`)
   * @param options - Optional {@link EntityV3BatchOptions} (`expansionLevel`, `failOnFirst`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3BatchResponse}
   * @example
   * ```typescript
   * await entitiesV3.updateRecords("Customer", [{ Id: "<recordId>", Name: "Alice B." }]);
   * ```
   */
  updateRecords(entityName: string, data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse>;

  /**
   * Updates every record matching a filter with the same field values. For composites,
   * the filter and field values must target a single member.
   *
   * @param entityName - Name of the entity
   * @param request - Filter and field values to apply {@link EntityV3ConditionalUpdateRequest}
   * @param options - Optional {@link EntityV3UpdateWhereOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the write result {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * import { QueryFilterOperator } from '@uipath/uipath-typescript/entities';
   *
   * await entitiesV3.updateWhere("Customer", {
   *   filterGroup: { queryFilters: [{ fieldName: "Status", operator: QueryFilterOperator.Equals, value: "Trial" }] },
   *   fieldValues: { Status: "Active" },
   * });
   * ```
   */
  updateWhere(entityName: string, request: EntityV3ConditionalUpdateRequest, options?: EntityV3UpdateWhereOptions): Promise<EntityV3WriteResponse>;

  /**
   * Deletes a single record by system Id. For composites, this cascades to all children.
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record to delete
   * @param options - Optional {@link EntityV3DeleteOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the delete result {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * await entitiesV3.deleteRecord("Customer", "<recordId>");
   * ```
   */
  deleteRecord(entityName: string, recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse>;

  /**
   * Deletes multiple records by system Id in a single transaction. For composites,
   * this cascades to all children.
   *
   * @param entityName - Name of the entity
   * @param recordIds - System Ids (GUIDs) of the records to delete
   * @param options - Optional {@link EntityV3DeleteOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the delete result {@link EntityV3WriteResponse}
   * @example
   * ```typescript
   * await entitiesV3.deleteRecords("Customer", ["<recordId1>", "<recordId2>"]);
   * ```
   */
  deleteRecords(entityName: string, recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse>;

  /**
   * Deletes multiple records in a batch, returning per-record success/failure
   * (non-composite entities only).
   *
   * @param entityName - Name of the entity
   * @param recordIds - System Ids (GUIDs) of the records to delete
   * @param options - Optional {@link EntityV3DeleteBatchOptions} (`failOnFirst`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3BatchResponse}
   * @example
   * ```typescript
   * await entitiesV3.deleteRecordsBatch("Customer", ["<recordId1>", "<recordId2>"]);
   * ```
   */
  deleteRecordsBatch(entityName: string, recordIds: string[], options?: EntityV3DeleteBatchOptions): Promise<EntityV3BatchResponse>;

  /**
   * Queries a composite entity's member table directly. Member fields are local —
   * no `Member.` prefix needed.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param options - Optional {@link EntityV3MemberQueryOptions}. `folderKey` is **experimental**.
   * @returns Promise resolving to a paginated response or array of member records
   * @example
   * ```typescript
   * const comments = await entitiesV3.queryMember("LoanCaseForBank", "Comments", { pageSize: 50 });
   * ```
   */
  queryMember<T extends EntityV3MemberQueryOptions = EntityV3MemberQueryOptions>(
    entityName: string,
    memberName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>>;

  /**
   * Reads a page of a composite entity's member records.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param options - Optional {@link EntityV3MemberReadOptions} (pagination, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to a paginated response or array of member records
   * @example
   * ```typescript
   * const comments = await entitiesV3.getMemberRecords("LoanCaseForBank", "Comments");
   * ```
   */
  getMemberRecords<T extends EntityV3MemberReadOptions = EntityV3MemberReadOptions>(
    entityName: string,
    memberName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>>;

  /**
   * Reads a single member record by system Id.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param recordId - UUID of the member record
   * @param options - Optional {@link EntityV3MemberGetRecordOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the member record's fields
   * @example
   * ```typescript
   * const comment = await entitiesV3.getMemberRecord("LoanCaseForBank", "Comments", "<recordId>");
   * ```
   */
  getMemberRecord(entityName: string, memberName: string, recordId: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>>;

  /**
   * Reads a single member record by business key.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param key - Business key value of the member record
   * @param options - Optional {@link EntityV3MemberGetRecordOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the member record's fields
   * @example
   * ```typescript
   * const comment = await entitiesV3.getMemberRecordByKey("LoanCaseForBank", "Comments", "CMT-001");
   * ```
   */
  getMemberRecordByKey(entityName: string, memberName: string, key: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>>;

  /**
   * Deletes a single member record by system Id. Cascades to that member's children.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param recordId - UUID of the member record to delete
   * @param options - Optional {@link EntityV3DeleteOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3MemberDeleteResponse}
   * @example
   * ```typescript
   * await entitiesV3.deleteMemberRecord("LoanCaseForBank", "Comments", "<recordId>");
   * ```
   */
  deleteMemberRecord(entityName: string, memberName: string, recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse>;

  /**
   * Deletes multiple member records by system Id. Cascades to their children.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param recordIds - System Ids (GUIDs) of the member records to delete
   * @param options - Optional {@link EntityV3DeleteOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to {@link EntityV3MemberDeleteResponse}
   * @example
   * ```typescript
   * await entitiesV3.deleteMemberRecords("LoanCaseForBank", "Comments", ["<id1>", "<id2>"]);
   * ```
   */
  deleteMemberRecords(entityName: string, memberName: string, recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse>;

  /**
   * Adds a field to a composite member table.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param request - Field definition {@link EntityV3FieldCreateRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the new field's UUID
   * @example
   * ```typescript
   * import { EntityFieldDataType } from '@uipath/uipath-typescript/entities';
   *
   * await entitiesV3.createMemberField("LoanCaseForBank", "Comments", {
   *   fieldDefinition: { name: "Priority", fieldDataType: { name: EntityFieldDataType.STRING } },
   * });
   * ```
   */
  createMemberField(entityName: string, memberName: string, request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string>;

  /**
   * Updates the metadata of a field on a composite member table.
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param fieldId - UUID of the field
   * @param request - Field metadata changes {@link EntityV3FieldUpdateRequest}
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.updateMemberField("LoanCaseForBank", "Comments", "<fieldId>", { displayName: "Priority Level" });
   * ```
   */
  updateMemberField(entityName: string, memberName: string, fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Soft-deletes a field on a composite member table (preserves the column for recovery).
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param fieldId - UUID of the field
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.deleteMemberField("LoanCaseForBank", "Comments", "<fieldId>");
   * ```
   */
  deleteMemberField(entityName: string, memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Hard-deletes a field on a composite member table (drops the underlying column).
   *
   * @param entityName - Name of the composite entity
   * @param memberName - Instance name of the member
   * @param fieldId - UUID of the field
   * @param options - Optional {@link EntityV3SchemaOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to `true` on success
   * @example
   * ```typescript
   * await entitiesV3.deleteMemberFieldHard("LoanCaseForBank", "Comments", "<fieldId>");
   * ```
   */
  deleteMemberFieldHard(entityName: string, memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;

  /**
   * Downloads an attachment from a File-type field of a record.
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record
   * @param fieldName - Name of the File-type field
   * @param options - Optional {@link EntityV3DownloadAttachmentOptions} (`folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to a Blob with the file content
   * @example
   * ```typescript
   * const blob = await entitiesV3.downloadAttachment("Customer", "<recordId>", "Avatar");
   * ```
   */
  downloadAttachment(entityName: string, recordId: string, fieldName: string, options?: EntityV3DownloadAttachmentOptions): Promise<Blob>;

  /**
   * Uploads an attachment to a File-type field of a record.
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record
   * @param fieldName - Name of the File-type field
   * @param file - File to upload (Blob, File, or Uint8Array)
   * @param options - Optional {@link EntityV3UploadAttachmentOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the updated record fields
   * @example
   * ```typescript
   * await entitiesV3.uploadAttachment("Customer", "<recordId>", "Avatar", file);
   * ```
   */
  uploadAttachment(entityName: string, recordId: string, fieldName: string, file: EntityFileType, options?: EntityV3UploadAttachmentOptions): Promise<Record<string, unknown>>;

  /**
   * Removes an attachment from a File-type field of a record.
   *
   * @param entityName - Name of the entity
   * @param recordId - UUID of the record
   * @param fieldName - Name of the File-type field
   * @param options - Optional {@link EntityV3DeleteAttachmentOptions} (`expansionLevel`, `folderKey`). `folderKey` is **experimental**.
   * @returns Promise resolving to the updated record fields
   * @example
   * ```typescript
   * await entitiesV3.deleteAttachment("Customer", "<recordId>", "Avatar");
   * ```
   */
  deleteAttachment(entityName: string, recordId: string, fieldName: string, options?: EntityV3DeleteAttachmentOptions): Promise<Record<string, unknown>>;

  /**
   * AI-assisted entity management (autopilot). Sends a natural-language instruction
   * and returns the assistant's action.
   *
   * @param request - Autopilot request {@link EntityV3AutopilotRequest}
   * @returns Promise resolving to {@link EntityV3AutopilotResponse}
   * @example
   * ```typescript
   * const result = await entitiesV3.manageWithAutopilot({ query: "Create a Customers entity with a name field" });
   * ```
   */
  manageWithAutopilot(request: EntityV3AutopilotRequest): Promise<EntityV3AutopilotResponse>;

  /**
   * Streaming variant of {@link manageWithAutopilot}. Returns the raw response body
   * as a stream of server-sent-event chunks for the caller to consume incrementally.
   *
   * @param request - Autopilot request {@link EntityV3AutopilotRequest}
   * @returns Promise resolving to a `ReadableStream` of the response body
   * @example
   * ```typescript
   * const stream = await entitiesV3.manageWithAutopilotStream({ query: "Add a status field" });
   * const reader = stream.getReader();
   * const decoder = new TextDecoder();
   * for (let { done, value } = await reader.read(); !done; { done, value } = await reader.read()) {
   *   console.log(decoder.decode(value));
   * }
   * ```
   */
  manageWithAutopilotStream(request: EntityV3AutopilotRequest): Promise<ReadableStream<Uint8Array>>;
}

/**
 * Operation methods bound to an entity retrieved via {@link EntityV3ServiceModel.getById}
 * or {@link EntityV3ServiceModel.getMetadata}. The entity's name and id are captured, so
 * callers never re-supply them.
 *
 * Note: documentation for these operations lives on {@link EntityV3ServiceModel}; only that
 * interface is rendered in the API docs.
 */
export interface EntityV3Methods {
  getRecords<T extends EntityV3ReadOptions = EntityV3ReadOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>>;
  getRecord(recordId: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>>;
  getRecordByKey(key: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>>;
  query<T extends EntityV3QueryOptions = EntityV3QueryOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>>;
  queryWithExpansion(options?: EntityV3QueryOptions): Promise<EntityV3QueryExpansionResponse>;
  insert(data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse>;
  insertRecords(data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse>;
  insertBulk(data: EntityV3RecordInput[], options?: EntityV3InsertBulkOptions): Promise<boolean>;
  upsert(data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse>;
  update(recordId: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse>;
  updateByKey(key: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse>;
  updateRecords(data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse>;
  updateWhere(request: EntityV3ConditionalUpdateRequest, options?: EntityV3UpdateWhereOptions): Promise<EntityV3WriteResponse>;
  deleteRecord(recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse>;
  deleteRecords(recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse>;
  deleteRecordsBatch(recordIds: string[], options?: EntityV3DeleteBatchOptions): Promise<EntityV3BatchResponse>;
  queryMember<T extends EntityV3MemberQueryOptions = EntityV3MemberQueryOptions>(memberName: string, options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>>;
  getMemberRecords<T extends EntityV3MemberReadOptions = EntityV3MemberReadOptions>(memberName: string, options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>>;
  getMemberRecord(memberName: string, recordId: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>>;
  getMemberRecordByKey(memberName: string, key: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>>;
  deleteMemberRecord(memberName: string, recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse>;
  deleteMemberRecords(memberName: string, recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse>;
  createMemberField(memberName: string, request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string>;
  updateMemberField(memberName: string, fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean>;
  deleteMemberField(memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;
  deleteMemberFieldHard(memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;
  downloadAttachment(recordId: string, fieldName: string, options?: EntityV3DownloadAttachmentOptions): Promise<Blob>;
  uploadAttachment(recordId: string, fieldName: string, file: EntityFileType, options?: EntityV3UploadAttachmentOptions): Promise<Record<string, unknown>>;
  deleteAttachment(recordId: string, fieldName: string, options?: EntityV3DeleteAttachmentOptions): Promise<Record<string, unknown>>;
  createField(request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string>;
  updateField(fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean>;
  deleteField(fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean>;
  updateMetadata(request: EntityV3UpdateMetadataRequest, options?: EntityV3SchemaOptions): Promise<boolean>;
  delete(options?: EntityV3SchemaOptions): Promise<void>;
}

/**
 * Entity metadata combined with bound operation methods.
 */
export type EntityV3GetResponse = EntityV3Metadata & EntityV3Methods;

/**
 * Builds the bound operation methods for an entity, delegating to the service and
 * supplying the entity's captured `name` (data ops) and `id` (schema ops).
 */
function createEntityV3Methods(entityData: EntityV3Metadata, service: EntityV3ServiceModel): EntityV3Methods {
  const requireName = (): string => {
    if (!entityData.name) throw new Error('Entity name is undefined');
    return entityData.name;
  };
  const requireId = (): string => {
    if (!entityData.id) throw new Error('Entity ID is undefined');
    return entityData.id;
  };

  return {
    async getRecords(options) {
      return service.getRecords(requireName(), options);
    },
    async getRecord(recordId, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.getRecord(requireName(), recordId, options);
    },
    async getRecordByKey(key, options) {
      if (!key) throw new Error('Record key is undefined');
      return service.getRecordByKey(requireName(), key, options);
    },
    async query(options) {
      return service.query(requireName(), options);
    },
    async queryWithExpansion(options) {
      return service.queryWithExpansion(requireName(), options);
    },
    async insert(data, options) {
      return service.insert(requireName(), data, options);
    },
    async insertRecords(data, options) {
      return service.insertRecords(requireName(), data, options);
    },
    async insertBulk(data, options) {
      return service.insertBulk(requireName(), data, options);
    },
    async upsert(data, options) {
      return service.upsert(requireName(), data, options);
    },
    async update(recordId, data, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.update(requireName(), recordId, data, options);
    },
    async updateByKey(key, data, options) {
      if (!key) throw new Error('Record key is undefined');
      return service.updateByKey(requireName(), key, data, options);
    },
    async updateRecords(data, options) {
      return service.updateRecords(requireName(), data, options);
    },
    async updateWhere(request, options) {
      return service.updateWhere(requireName(), request, options);
    },
    async deleteRecord(recordId, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.deleteRecord(requireName(), recordId, options);
    },
    async deleteRecords(recordIds, options) {
      return service.deleteRecords(requireName(), recordIds, options);
    },
    async deleteRecordsBatch(recordIds, options) {
      return service.deleteRecordsBatch(requireName(), recordIds, options);
    },
    async queryMember(memberName, options) {
      if (!memberName) throw new Error('Member name is undefined');
      return service.queryMember(requireName(), memberName, options);
    },
    async getMemberRecords(memberName, options) {
      if (!memberName) throw new Error('Member name is undefined');
      return service.getMemberRecords(requireName(), memberName, options);
    },
    async getMemberRecord(memberName, recordId, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!recordId) throw new Error('Record ID is undefined');
      return service.getMemberRecord(requireName(), memberName, recordId, options);
    },
    async getMemberRecordByKey(memberName, key, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!key) throw new Error('Record key is undefined');
      return service.getMemberRecordByKey(requireName(), memberName, key, options);
    },
    async deleteMemberRecord(memberName, recordId, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!recordId) throw new Error('Record ID is undefined');
      return service.deleteMemberRecord(requireName(), memberName, recordId, options);
    },
    async deleteMemberRecords(memberName, recordIds, options) {
      if (!memberName) throw new Error('Member name is undefined');
      return service.deleteMemberRecords(requireName(), memberName, recordIds, options);
    },
    async createMemberField(memberName, request, options) {
      if (!memberName) throw new Error('Member name is undefined');
      return service.createMemberField(requireName(), memberName, request, options);
    },
    async updateMemberField(memberName, fieldId, request, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!fieldId) throw new Error('Field ID is undefined');
      return service.updateMemberField(requireName(), memberName, fieldId, request, options);
    },
    async deleteMemberField(memberName, fieldId, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!fieldId) throw new Error('Field ID is undefined');
      return service.deleteMemberField(requireName(), memberName, fieldId, options);
    },
    async deleteMemberFieldHard(memberName, fieldId, options) {
      if (!memberName) throw new Error('Member name is undefined');
      if (!fieldId) throw new Error('Field ID is undefined');
      return service.deleteMemberFieldHard(requireName(), memberName, fieldId, options);
    },
    async downloadAttachment(recordId, fieldName, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.downloadAttachment(requireName(), recordId, fieldName, options);
    },
    async uploadAttachment(recordId, fieldName, file, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.uploadAttachment(requireName(), recordId, fieldName, file, options);
    },
    async deleteAttachment(recordId, fieldName, options) {
      if (!recordId) throw new Error('Record ID is undefined');
      return service.deleteAttachment(requireName(), recordId, fieldName, options);
    },
    async createField(request, options) {
      return service.createField(requireId(), request, options);
    },
    async updateField(fieldId, request, options) {
      if (!fieldId) throw new Error('Field ID is undefined');
      return service.updateField(requireId(), fieldId, request, options);
    },
    async deleteField(fieldId, options) {
      if (!fieldId) throw new Error('Field ID is undefined');
      return service.deleteField(requireId(), fieldId, options);
    },
    async updateMetadata(request, options) {
      return service.updateMetadata(requireId(), request, options);
    },
    async delete(options) {
      return service.deleteById(requireId(), options);
    },
  };
}

/**
 * Combines entity metadata with bound operation methods.
 *
 * @param entityData - Entity metadata
 * @param service - The v3 entity service instance
 * @returns Entity metadata with bound methods attached
 */
export function createEntityV3WithMethods(
  entityData: EntityV3Metadata,
  service: EntityV3ServiceModel
): EntityV3GetResponse {
  const methods = createEntityV3Methods(entityData, service);
  return Object.assign({}, entityData, methods) as EntityV3GetResponse;
}
