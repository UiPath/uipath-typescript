import { PaginationOptions } from "../../utils/pagination/types";

/**
 * Entity field type names
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
} & PaginationOptions;

/**
 * Options for getting all records of an entity
 */
export type EntityGetAllRecordsOptions = EntityGetRecordsByIdOptions;

/**
 * Options for getting a single entity record by entity ID and record ID
 */
export interface EntityGetRecordByIdOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
}

/**
 * Common options for entity operations that modify multiple records
 */
export interface EntityOperationOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
  /** Whether to fail on first error (default: false) */
  failOnFirst?: boolean;
}

/**
 * Options for inserting a single record into an entity
 * @deprecated Use {@link EntityInsertRecordOptions} instead for better clarity on inserting a single record into an entity. This type will be removed in future versions.
 */
export interface EntityInsertOptions {
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
export interface EntityDeleteOptions {
  /** Whether to fail on first error (default: false) */
  failOnFirst?: boolean;
}

/**
 * Options for deleting records in an entity
 */
export interface EntityDeleteRecordsOptions extends EntityDeleteOptions {}


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
 * A single filter condition for querying entity records
 *
 * Supported operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `not contains`,
 * `startswith`, `endswith`, `in`, `not in`.
 * Not all operators are valid for all field types.
 *
 * Values are always strings. For numeric or boolean fields, pass the string representation
 * (e.g., `"42"`, `"true"`). For `in` / `not in` operators, use {@link valueList} instead of `value`.
 */
export interface EntityQueryFilter {
  /** Name of the field to filter on */
  fieldName: string;
  /** Comparison operator — see supported operators in the interface description */
  operator: string;
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
  fieldName?: string;
  /** Whether to sort in descending order (default: false) */
  isDescending?: boolean;
}

/**
 * Options for querying entity records with filters, sorting, and pagination
 */
export interface EntityQueryRecordsOptions {
  /** Filter conditions to apply */
  filterGroup?: EntityQueryFilterGroup;
  /** List of field names to include in results (returns all fields if omitted) */
  selectedFields?: string[];
  /** Sort options for the results */
  sortOptions?: EntityQuerySortOption[];
  /** Number of records to skip (for pagination) */
  start?: number;
  /** Maximum number of records to return */
  limit?: number;
  /** Level of entity expansion for related fields (default: 0) */
  expansionLevel?: number;
}

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
 * Friendly field type names for creating entity schemas
 */
export enum EntityFieldType {
  Text = "text",
  LongText = "longtext",
  Number = "number",
  Decimal = "decimal",
  Boolean = "boolean",
  DateTime = "datetime",
  Date = "date",
  File = "file",
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
  /** Default value for the field */
  defaultValue?: string;
}

/**
 * User-facing field definition for creating or updating entity schemas
 */
export interface EntityCreateFieldRequest extends EntityFieldBase {
  /**
   * Technical field name — must be lowercase, start with a letter, and contain only
   * letters, numbers, and underscores (e.g., `"product_name"`).
   */
  name: string;
  /** Field type — one of the {@link EntityFieldType} values (default: Text) */
  type?: EntityFieldType;
  /** Choice set ID for choice-set fields */
  choiceSetId?: string;
  /** Name of the referenced entity for relationship fields */
  referenceEntityName?: string;
  /** Name of the field in the referenced entity */
  referenceFieldName?: string;
}


/**
 * Options for creating a new Data Fabric entity
 */
export interface EntityCreateOptions {
  /** Human-readable display name shown in the UI (defaults to `name` if omitted) */
  displayName?: string;
  /** Folder ID for the entity (defaults to the tenant-level folder) */
  folderId?: string;
  /** Whether role-based access control is enabled for this entity (default: false) */
  isRbacEnabled?: boolean;
  /** Whether Insights integration is enabled for this entity (default: false) */
  isInsightsEnabled?: boolean;
  /** External field source definitions (default: empty) */
  externalFields?: unknown[];
}

/**
 * Identifies a field by its ID and supplies metadata updates to apply
 */
export interface EntityFieldUpdateRequest extends EntityFieldBase {
  /** ID of the field to update */
  id: string;
}

/**
 * Options for updating an existing entity's field schema.
 * Supports adding, removing, and updating fields in a single call.
 */
export interface EntitySchemaUpdateOptions {
  /** New fields to add */
  addFields?: EntityCreateFieldRequest[];
  /** Names of fields to remove (case-insensitive) */
  removeFields?: string[];
  /** Fields to update, each identified by its field ID */
  updateFields?: EntityFieldUpdateRequest[];
}

/**
 * Options for updating an entity's metadata (displayName, description)
 */
export interface EntityMetadataUpdateOptions {
  /** New display name for the entity */
  displayName?: string;
  /** New description for the entity */
  description?: string;
  /** Whether role-based access control is enabled for this entity */
  isRbacEnabled?: boolean;
}

/**
 * Options for bulk importing records from a CSV file
 */
export interface EntityBulkImportOptions {}

/**
 * Response from a bulk import operation
 */
export interface EntityBulkImportResponse {
  /** Total number of records in the import file */
  totalRecords?: number;
  /** Number of records successfully inserted */
  insertedRecords?: number;
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
export interface EntityUploadAttachmentOptions {
  /** Optional expansion level (default: 0) */
  expansionLevel?: number;
}

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
 * Join type for source join criteria
 */
export enum JoinType {
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
  referenceName?: string;
  referenceEntity?: RawEntityGetResponse;
  referenceChoiceSet?: RawEntityGetResponse;
  referenceField?: Field;
  referenceType: ReferenceType;
  fieldDataType: FieldDataType;
  isRequired: boolean;
  displayName: string;
  description: string;
  createdTime: string;
  createdBy: string;
  updatedTime: string;
  updatedBy?: string;
  isSystemField: boolean;
  fieldDisplayType?: FieldDisplayType;
  choiceSetId?: string;
  defaultValue?: string;
  isAttachment: boolean;
  isRbacEnabled: boolean;
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
  description: string;
  fields: FieldMetaData[];
  externalFields?: ExternalSourceFields[];
  sourceJoinCriterias?: SourceJoinCriteria[];
  recordCount?: number;
  storageSizeInMB?: number;
  usedStorageSizeInMB?: number;
  attachmentSizeInByte?: number;
  isRbacEnabled: boolean;
  id: string;
  createdBy: string;
  createdTime: string;
  updatedTime?: string;
  updatedBy?: string;
}
