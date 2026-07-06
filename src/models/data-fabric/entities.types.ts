import { PaginationOptions } from "../../utils/pagination/types";
import { EntityFolderScopedOptions } from "./data-fabric.types";

// Re-export — canonical definition is in `./data-fabric.types`.
export type { EntityFolderScopedOptions };

/**
 * Entity field data type names (SQL-level types returned by the API)
 */
export enum EntityFieldDataType {
  UUID = "UUID",
  STRING = "STRING",
  INTEGER = "INTEGER",
  DATETIME = "DATETIME",
  DATETIME_WITH_TZ = "DATETIME_WITH_TZ",
  DECIMAL = "DECIMAL",
  FLOAT = "FLOAT",
  DOUBLE = "DOUBLE",
  DATE = "DATE",
  BOOLEAN = "BOOLEAN",
  BIG_INTEGER = "BIG_INTEGER",
  MULTILINE_TEXT = "MULTILINE_TEXT",
  FILE = "FILE",
  CHOICE_SET_SINGLE = "CHOICE_SET_SINGLE",
  CHOICE_SET_MULTIPLE = "CHOICE_SET_MULTIPLE",
  AUTO_NUMBER = "AUTO_NUMBER",
  RELATIONSHIP = "RELATIONSHIP",
}

/**
 * Represents a single entity record
 */
export interface EntityRecord {
  /**
   * Unique identifier for the record
   */
  Id: string;

  /**
   * Additional dynamic fields for the entity
   */
  [key: string]: any;
}

/**
 * Options for getting an entity by Id
 * @deprecated Use {@link EntityGetRecordByIdOptions} instead for better clarity on getting all records of an entity. This type will be removed in future versions.
 */
export type EntityGetRecordsByIdOptions = {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
} & PaginationOptions & EntityFolderScopedOptions;

/**
 * Options for getting all records of an entity
 */
export type EntityGetAllRecordsOptions = EntityGetRecordsByIdOptions;

/**
 * Options for getting a single entity record by entity ID and record ID
 */
export interface EntityGetRecordByIdOptions extends EntityFolderScopedOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
}

/**
 * Common options for entity operations that modify multiple records
 */
export interface EntityOperationOptions extends EntityFolderScopedOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
  /** Whether to fail on first error (default: false) */
  failOnFirst?: boolean;
}

/**
 * Options for inserting a single record into an entity
 * @deprecated Use {@link EntityInsertRecordOptions} instead for better clarity on inserting a single record into an entity. This type will be removed in future versions.
 */
export interface EntityInsertOptions extends EntityFolderScopedOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
}

/**
 * Options for inserting a single record into an entity
 */
export interface EntityInsertRecordOptions extends EntityInsertOptions {}

/**
 * Options for batch inserting data into an entity
 * @deprecated Use {@link EntityInsertRecordsOptions} instead for better clarity on inserting multiple records into an entity. This type will be removed in future versions.
 */
export interface EntityBatchInsertOptions extends EntityOperationOptions {}

/**
 * Options for inserting multiple records into an entity
 */
export interface EntityInsertRecordsOptions extends EntityOperationOptions {}

/**
 * Options for updating a single record in an entity
 */
export interface EntityUpdateRecordOptions extends EntityGetRecordByIdOptions {}

/**
 * Options for updating data in an entity
 * @deprecated Use {@link EntityUpdateRecordsOptions} instead for better clarity on updating records in an entity. This type will be removed in future versions.
 */
export interface EntityUpdateOptions extends EntityOperationOptions {}

/**
 * Options for updating data in an entity
 */
export interface EntityUpdateRecordsOptions extends EntityOperationOptions {}

/**
 * Options for deleting data from an entity
 * @deprecated Use {@link EntityDeleteRecordsOptions} instead for better clarity on deleting records from an entity. This type will be removed in future versions.
 */
export interface EntityDeleteOptions extends EntityFolderScopedOptions {
  /** Whether to fail on first error (default: false) */
  failOnFirst?: boolean;
}

/**
 * Options for deleting records in an entity
 */
export interface EntityDeleteRecordsOptions extends EntityDeleteOptions {}

export interface EntityDeleteRecordByIdOptions extends EntityFolderScopedOptions {}

export interface EntityImportRecordsByIdOptions extends EntityFolderScopedOptions {}


/**
 * Logical operator for combining query filter groups
 */
export enum LogicalOperator {
  /** Combine conditions with AND — all conditions must match */
  And = 0,
  /** Combine conditions with OR — any condition must match */
  Or = 1,
}

/**
 * Comparison operators for entity query filters.
 * Not all operators are valid for all field types.
 */
export enum QueryFilterOperator {
  Equals = '=',
  NotEquals = '!=',
  GreaterThan = '>',
  LessThan = '<',
  GreaterThanOrEqual = '>=',
  LessThanOrEqual = '<=',
  Contains = 'contains',
  NotContains = 'not contains',
  StartsWith = 'startswith',
  EndsWith = 'endswith',
  In = 'in',
  NotIn = 'not in',
}

/**
 * A single filter condition for querying entity records
 *
 * Values are always strings. For numeric or boolean fields, pass the string representation
 * (e.g., `"42"`, `"true"`). For `In` / `NotIn` operators, use {@link valueList} instead of `value`.
 */
export interface EntityQueryFilter {
  /** Name of the field to filter on */
  fieldName: string;
  /** Comparison operator */
  operator: QueryFilterOperator;
  /** Value to compare against (always a string; omit when using `valueList`) */
  value?: string;
  /** List of values for `in` / `not in` operators */
  valueList?: string[];
}

/**
 * A group of query filters combined with a logical operator
 */
export interface EntityQueryFilterGroup {
  /** Logical operator applied between filters in `queryFilters` (default: AND) */
  logicalOperator?: LogicalOperator;
  /** Logical operator applied between sibling filter groups (default: AND) */
  continueLogicalOperator?: LogicalOperator;
  /** Array of filter conditions */
  queryFilters?: EntityQueryFilter[];
  /** Nested filter groups for complex boolean expressions */
  filterGroups?: EntityQueryFilterGroup[];
}

/**
 * Sort option for query results
 */
export interface EntityQuerySortOption {
  /** Name of the field to sort by */
  fieldName: string;
  /** Whether to sort in descending order (default: false) */
  isDescending?: boolean;
}

/**
 * Aggregate functions supported by the Data Fabric query API.
 */
export enum EntityAggregateFunction {
  Count = 'COUNT',
  Sum = 'SUM',
  Avg = 'AVG',
  Min = 'MIN',
  Max = 'MAX',
}

/**
 * A single aggregate expression to apply during a query.
 *
 * Aggregate results are returned as fields on each item in the response,
 * keyed by `alias` when provided.
 */
export interface EntityAggregate {
  /** Aggregate function to apply */
  function: EntityAggregateFunction;
  /** Field to aggregate on. For `COUNT`, any non-null field works (typically `Id`). */
  field: string;
  /** Optional alias for the aggregate result column. */
  alias?: string;
}

/**
 * A single cross-entity JOIN clause for a structured query.
 *
 * A join pulls related records together by matching a field on the base (left)
 * entity (`joinFieldName`) to a field on a related (right) entity
 * (`relatedFieldName`). Pass one {@link EntityJoin} per related entity; supplying
 * several composes a multi-entity (multi-join) query. Up to 3 joins are
 * supported, and all of them must share the same {@link JoinType}.
 *
 * @example
 * ```typescript
 * import { JoinType } from '@uipath/uipath-typescript/entities';
 *
 * const join: EntityJoin = {
 *   entityName: "Order",
 *   joinType: JoinType.LeftJoin,
 *   joinFieldName: "customerId",
 *   relatedEntityName: "Customer",
 *   relatedFieldName: "Id",
 * };
 * ```
 */
export interface EntityJoin {
  /** Name of the base (left) entity that owns `joinFieldName`. Defaults to the queried entity; set it to anchor chained joins. */
  entityName?: string;
  /** Join type to apply (default: {@link JoinType.LeftJoin}). */
  joinType?: JoinType;
  /** Field on the base entity used as the join key. */
  joinFieldName: string;
  /** Name of the related (right) entity to join in. */
  relatedEntityName: string;
  /** Field on `relatedEntityName` matched against `joinFieldName`. */
  relatedFieldName: string;
}

/**
 * Options for querying entity records with filters, sorting, aggregates, and pagination.
 *
 * Use `pageSize`, `cursor`, or `jumpToPage` for SDK-managed pagination.
 * The SDK computes and manages offset parameters automatically.
 */
export type EntityQueryRecordsOptions = {
  /** Filter conditions to apply */
  filterGroup?: EntityQueryFilterGroup;
  /** List of field names to include in results (returns all fields if omitted) */
  selectedFields?: string[];
  /** Sort options for the results */
  sortOptions?: EntityQuerySortOption[];
  /** Level of entity expansion for related fields (default: 0) */
  expansionLevel?: number;
  /** Aggregate expressions (COUNT, SUM, AVG, MIN, MAX) to apply across the result set. */
  aggregates?: EntityAggregate[];
  /** Field names to group aggregate results by. */
  groupBy?: string[];
  /**
   * Cross-entity joins. Each entry joins one related entity into the query;
   * supply several for a multi-join query. A maximum of 3 joins is supported,
   * and all joins must be of the same {@link JoinType}.
   */
  joins?: EntityJoin[];
} & PaginationOptions & EntityFolderScopedOptions;

/**
 * Response from querying entity records
 */
export interface EntityQueryRecordsResponse {
  /** Array of matching entity records */
  items: EntityRecord[];
  /** Total number of records matching the filter (before pagination) */
  totalCount: number;
}

/**
 * Common field properties shared across field definition and update types
 */
export interface EntityFieldBase {
  /** Human-readable display name shown in the UI (defaults to `name` if omitted) */
  displayName?: string;
  /** Optional field description */
  description?: string;
  /** Whether the field is required (default: false) */
  isRequired?: boolean;
  /** Whether the field value must be unique across records (default: false) */
  isUnique?: boolean;
  /** Whether role-based access control is enabled for this field (default: false) */
  isRbacEnabled?: boolean;
  /** Whether the field value is encrypted at rest (default: false) */
  isEncrypted?: boolean;
  /** Whether the field is hidden from the UI (default: false) */
  isHiddenField?: boolean;
  /** Default value for the field */
  defaultValue?: string;
  /** Maximum character length for STRING fields (default: 200, range: 1–4000) and MULTILINE_TEXT fields (default: 200, range: 1–10000). */
  lengthLimit?: number;
  /** Maximum allowed value for numeric fields (INTEGER, BIG_INTEGER, FLOAT, DOUBLE, DECIMAL — default: 1,000,000,000,000; range: ±9,007,199,254,740,991) */
  maxValue?: number;
  /** Minimum allowed value for numeric fields (INTEGER, BIG_INTEGER, FLOAT, DOUBLE, DECIMAL — default: -1,000,000,000,000; range: ±9,007,199,254,740,991) */
  minValue?: number;
  /** Number of decimal places for DECIMAL, FLOAT, and DOUBLE fields (default: 2, range: 0–10) */
  decimalPrecision?: number;
}

/**
 * User-facing field definition for creating or updating entity schemas
 */
export interface EntityCreateFieldOptions extends EntityFieldBase {
  /**
   * Field name — must start with a letter and contain only
   * letters, numbers, and underscores (e.g., `"productName"`).
   */
  fieldName: string;
  /** Field data type — one of the {@link EntityFieldDataType} values (default: STRING) */
  type?: EntityFieldDataType;
  /** Choice set ID for choice-set fields */
  choiceSetId?: string;
  /** UUID of the referenced entity (required when `type` is `RELATIONSHIP`; ignored for `FILE`). */
  referenceEntityId?: string;
  /** UUID of the referenced field on the target entity (required when `type` is `RELATIONSHIP`; ignored for `FILE`). */
  referenceFieldId?: string;
  /**
   * Folder key of the reference target when it lives outside the source's folder. Pass `'00000000-0000-0000-0000-000000000000'` for tenant-level system targets.
   *
   * @experimental Folder-scoped Data Fabric is in preview — the contract may change.
   */
  referenceFolderKey?: string;
}



export interface EntityGetAllOptions extends EntityFolderScopedOptions {
  /**
   * When `true`, returns tenant-level and folder-level entities together.
   * Omit (or `false`, the default) to return only tenant-level entities.
   * Ignored when `folderKey` is provided — `folderKey` is preferred over `includeFolderEntities` when both are set.
   *
   * @experimental Folder-scoped Data Fabric is in preview — the contract may change.
   */
  includeFolderEntities?: boolean;
}

export interface EntityGetByIdOptions extends EntityFolderScopedOptions {}

export interface EntityDeleteByIdOptions extends EntityFolderScopedOptions {}

/**
 * Options for creating a new Data Fabric entity
 */
export interface EntityCreateOptions extends EntityFolderScopedOptions {
  /** Human-readable display name shown in the UI (defaults to `name` if omitted) */
  displayName?: string;
  /** Optional entity description */
  description?: string;
  /** Whether role-based access control is enabled for this entity (default: false) */
  isRbacEnabled?: boolean;
  /** Whether Analytics integration is enabled for this entity (default: false) */
  isAnalyticsEnabled?: boolean;
  /** External field source definitions (default: empty) */
  externalFields?: ExternalField[];
}

/**
 * Identifies a field by its ID and supplies metadata updates to apply
 */
export interface EntityFieldUpdateOptions extends EntityFieldBase {
  /** ID of the field to update */
  id: string;
}

/**
 * Identifies a field to remove by its name
 */
export interface EntityRemoveFieldOptions {
  /** Name of the field to remove */
  fieldName: string;
}

/**
 * Options for updating an existing entity — schema and/or metadata in a single call.
 *
 * Schema changes (`addFields`, `removeFields`, `updateFields`) and metadata changes
 * (`displayName`, `description`, `isRbacEnabled`) can be combined; each is applied
 * only when the corresponding fields are provided.
 */
export interface EntityUpdateByIdOptions extends EntityFolderScopedOptions {
  /** New fields to add */
  addFields?: EntityCreateFieldOptions[];
  /** Fields to remove, each identified by field name */
  removeFields?: EntityRemoveFieldOptions[];
  /** Fields to update, each identified by its field ID */
  updateFields?: EntityFieldUpdateOptions[];
  /** New display name for the entity */
  displayName?: string;
  /** New description for the entity */
  description?: string;
  /** Whether role-based access control is enabled for this entity */
  isRbacEnabled?: boolean;
}

/**
 * Response from a bulk import operation
 */
export interface EntityImportRecordsResponse {
  /** Total number of records in the import file */
  totalRecords: number;
  /** Number of records successfully inserted */
  insertedRecords: number;
  /** Link to download the error file (if any records failed) */
  errorFileLink?: string | null;
}

/**
 * Supported file types for attachment upload
 */
export type EntityFileType = Blob | File | Uint8Array;

/**
 * Optional options for uploading an attachment to an entity record
 */
export interface EntityUploadAttachmentOptions extends EntityFolderScopedOptions {
  /** Optional expansion level (default: 0) */
  expansionLevel?: number;
}

/**
 * Optional options for downloading an attachment from an entity record
 */
export interface EntityDownloadAttachmentOptions extends EntityFolderScopedOptions {}

/**
 * Optional options for deleting an attachment from an entity record
 */
export interface EntityDeleteAttachmentOptions extends EntityFolderScopedOptions {}

/**
 * Response from uploading an attachment to an entity record
 */
export type EntityUploadAttachmentResponse = Record<string, unknown>;

/**
 * Response from deleting an attachment from an entity record
 */
export type EntityDeleteAttachmentResponse = Record<string, unknown>;

/**
 * Represents a failure record in an entity operation
 */
export interface FailureRecord {
  /** Error message */
  error?: string;
  /** Original record that failed */
  record?: Record<string, any>;
}

/**
 * Response from an entity operation that modifies multiple records
 */
export interface EntityOperationResponse {
  /** Records that were successfully processed */
  successRecords: Record<string, any>[];
  /** Records that failed processing */
  failureRecords: FailureRecord[];
}

/**
 * Response from inserting a single record into an entity.
 * Returns the inserted record with its generated record ID and other fields.
 */
export interface EntityInsertResponse extends EntityRecord {}

/**
 * Response from updating a single record in an entity.
 * Returns the updated record.
 */
export interface EntityUpdateRecordResponse extends EntityRecord {}

/**
 * Response from batch inserting data into an entity
 */
export interface EntityBatchInsertResponse extends EntityOperationResponse {}

/**
 * Response from updating data in an entity
 */
export interface EntityUpdateResponse extends EntityOperationResponse {}

/**
 * Response from deleting data from an entity
 */
export interface EntityDeleteResponse extends EntityOperationResponse {}

/**
 * Entity type enum
 */
export enum EntityType {
  Entity = "Entity",
  ChoiceSet = "ChoiceSet",
  InternalEntity = "InternalEntity",
  SystemEntity = "SystemEntity",
}

/**
 * Field type metadata
 */
export interface FieldDataType {
  name: EntityFieldDataType;
  lengthLimit?: number;
  maxValue?: number;
  minValue?: number;
  decimalPrecision?: number;
}

/**
 * Reference types for fields
 */
export enum ReferenceType {
  ManyToOne = "ManyToOne",
}

/**
 * Field display types
 */
export enum FieldDisplayType {
  Basic = "Basic",
  Relationship = "Relationship",
  File = "File",
  ChoiceSetSingle = "ChoiceSetSingle",
  ChoiceSetMultiple = "ChoiceSetMultiple",
  AutoNumber = "AutoNumber",
}

/**
 * Data direction type for external fields
 */
export enum DataDirectionType {
  ReadOnly = "ReadOnly",
  ReadAndWrite = "ReadAndWrite",
}

/**
 * Join type applied when matching records across entities.
 *
 * Used by {@link EntityJoin} for cross-entity query joins and by
 * {@link SourceJoinCriteria} in entity metadata.
 */
export enum JoinType {
  /** LEFT JOIN — all base-entity records, with related fields empty when unmatched. */
  LeftJoin = "LeftJoin",
}

/**
 * Field reference with ID
 */
export interface Field {
  id: string;
  definition?: FieldMetaData;
}

/**
 * SQL type metadata
 */
export interface SqlType {
  /** Raw SQL type name (e.g., `"NVARCHAR"`, `"INT"`, `"UNIQUEIDENTIFIER"`) */
  name: string;
  lengthLimit?: number;
  maxValue?: number;
  minValue?: number;
  decimalPrecision?: number;
}

/**
 * Detailed field definition
 */
export interface FieldMetaData {
  id: string;
  name: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isExternalField: boolean;
  isHiddenField: boolean;
  isUnique: boolean;
  isRequired: boolean;
  isSystemField: boolean;
  isAttachment: boolean;
  isEncrypted: boolean;
  isRbacEnabled: boolean;
  fieldDisplayType: FieldDisplayType;
  /** Transformed field data type — present after SDK transformation */
  fieldDataType: FieldDataType;
  createdTime: string;
  createdBy: string;
  /** Raw SQL type from API — present on raw GET responses, used on write payloads */
  sqlType?: SqlType;
  updatedTime?: string;
  updatedBy?: string;
  displayName?: string;
  description?: string;
  referenceName?: string;
  referenceEntity?: RawEntityGetResponse;
  referenceChoiceSet?: RawEntityGetResponse;
  referenceField?: Field;
  referenceType?: ReferenceType;
  choiceSetId?: string;
  defaultValue?: string;
}

/**
 * External object details
 */
export interface ExternalObject {
  id: string;
  externalObjectName?: string;
  externalObjectDisplayName?: string;
  primaryKey?: string;
  externalConnectionId: string;
  entityId?: string;
  isPrimarySource: boolean;
}

/**
 * External connection details
 */
export interface ExternalConnection {
  id: string;
  connectionId: string;
  elementInstanceId: number;
  folderKey: string;
  connectorKey?: string;
  connectorName?: string;
  connectionName?: string;
}

/**
 * External field mapping
 */
export interface ExternalFieldMapping {
  id: string;
  externalFieldName?: string;
  externalFieldDisplayName?: string;
  externalObjectId: string;
  externalFieldType?: string;
  internalFieldId: string;
  directionType: DataDirectionType;
}

/**
 * External field
 */
export interface ExternalField {
  fieldMetaData: FieldMetaData;
  externalFieldMappingDetail: ExternalFieldMapping;
}

/**
 * External source fields
 */
export interface ExternalSourceFields {
  fields?: ExternalField[];
  externalObjectDetail?: ExternalObject;
  externalConnectionDetail?: ExternalConnection;
}

/**
 * Source join criteria
 */
export interface SourceJoinCriteria {
  id: string;
  entityId: string;
  joinFieldName?: string;
  joinType: JoinType;
  relatedSourceObjectId?: string;
  relatedSourceFieldName?: string;
}

/**
 * Entity metadata returned by getById
 */
export interface RawEntityGetResponse {
  name: string;
  displayName: string;
  entityType: EntityType;
  description?: string;
  fields: FieldMetaData[];
  folderId?: string;
  externalFields?: ExternalSourceFields[];
  sourceJoinCriterias?: SourceJoinCriteria[];
  recordCount?: number;
  storageSizeInMB?: number;
  usedStorageSizeInMB?: number;
  attachmentSizeInByte?: number;
  isRbacEnabled: boolean;
  isInsightsEnabled?: boolean;
  id: string;
  createdBy: string;
  createdTime: string;
  updatedTime?: string;
  updatedBy?: string;
}
