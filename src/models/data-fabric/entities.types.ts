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
  id: string;

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
 * Aggregate function types for query operations
 */
export enum QueryAggregateFunction {
  COUNT = "COUNT",
  SUM = "SUM",
  AVG = "AVG",
  MIN = "MIN",
  MAX = "MAX",
}

/**
 * Join types for cross-entity query operations
 */
export enum QueryJoinType {
  INNER = "INNER",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  FULL = "FULL",
}

/**
 * Logical operators for combining query filters
 */
export enum QueryLogicalOperator {
  AND = 0,
  OR = 1,
}

/**
 * An aggregate operation in a query
 */
export interface QueryAggregate {
  /** Aggregate function to apply */
  function: QueryAggregateFunction;
  /** Field to aggregate on */
  field: string;
  /** Alias for the aggregated result */
  alias: string;
}

/**
 * A join condition for cross-entity queries
 */
export interface QueryJoinCondition {
  /** Left side field name (from the primary entity) */
  left: string;
  /** Right side field name (from the joined entity) */
  right: string;
}

/**
 * A join clause for cross-entity queries
 */
export interface QueryJoin {
  /** Type of join */
  type: QueryJoinType;
  /** Name of the entity to join */
  entity: string;
  /** Join condition specifying left and right field mappings */
  on: QueryJoinCondition;
}

/**
 * A single query filter condition
 */
export interface QueryFilter {
  /** Field name to filter on */
  fieldName: string;
  /** Comparison operator (e.g. "=", "!=", ">", "<", ">=", "<=", "contains", "startswith", "endswith") */
  operator: string;
  /** Value to compare against */
  value: unknown;
}

/**
 * A group of query filters combined with a logical operator
 */
export interface QueryFilterGroup {
  /** Logical operator to combine filters (0 = AND, 1 = OR) */
  logicalOperator: QueryLogicalOperator;
  /** Array of filter conditions */
  queryFilters: QueryFilter[];
  /** Nested filter groups for complex conditions */
  queryFilterGroups?: QueryFilterGroup[];
}

/**
 * Sort option for query results
 */
export interface QuerySortOption {
  /** Field name to sort by */
  fieldName: string;
  /** Whether to sort in descending order (default: false) */
  isDescending?: boolean;
}

/**
 * Options for querying an entity with joins, aggregates, and filters
 */
export interface EntityQueryOptions {
  /** Fields to include in the result set */
  selectedFields?: string[];
  /** Aggregate operations to perform */
  aggregates?: QueryAggregate[];
  /** Cross-entity join clauses */
  joins?: QueryJoin[];
  /** Filter conditions */
  filterGroup?: QueryFilterGroup;
  /** Fields to group results by (used with aggregates) */
  groupBy?: string[];
  /** Sort options for result ordering */
  sortOptions?: QuerySortOption[];
  /** Starting offset for pagination (default: 0) */
  start?: number;
  /** Maximum number of records to return (default: 100) */
  limit?: number;
}

/**
 * Response from a query operation
 */
export interface EntityQueryResponse {
  /** Array of matching records */
  records: Record<string, unknown>[];
  /** Total count of matching records (before pagination) */
  totalCount?: number;
}

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
