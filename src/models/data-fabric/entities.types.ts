import { PaginationOptions } from '../../utils/pagination/types';

/**
 * Entity field type names 
 */
export enum EntityFieldDataType {
  UUID = 'UUID',
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DATETIME = 'DATETIME',
  DATETIME_WITH_TZ = 'DATETIME_WITH_TZ',
  DECIMAL = 'DECIMAL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  BIG_INTEGER = 'BIG_INTEGER',
  MULTILINE_TEXT = 'MULTILINE_TEXT'
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
 * Filter operators for query filters
 */
export type FilterOperator =
  | 'contains'
  | 'not contains'
  | 'startswith'
  | 'endswith'
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'in'
  | 'not in';

/**
 * Logical operators for combining filter groups
 */
export enum FilterLogicalOperator {
  AND = 0,
  OR = 1,
}

/**
 * Represents a single query filter condition
 */
export interface QueryFilter {
  /** Name of the field to filter on */
  fieldName: string;
  /** Operator to use for the filter */
  operator: FilterOperator;
  /** Value to compare against */
  value: any;
}

/**
 * Represents a group of filters that can be combined with logical operators
 */
export interface FilterGroup {
  /** Logical operator to combine filters (AND/OR) */
  logicalOperator?: FilterLogicalOperator;
  /** Array of query filters */
  queryFilters: QueryFilter[];
  /** Nested filter groups for complex filtering */
  filterGroups?: FilterGroup[];
}

/**
 * Sort option for query results
 */
export interface SortOption {
  /** Name of the field to sort by */
  fieldName: string;
  /** Whether to sort in descending order */
  isDescending: boolean;
}

/**
 * Expansion configuration for related entities
 */
export interface Expansion {
  /** Name of the field to expand */
  expandedField: string;
  /** Optional list of fields to select from the expanded entity */
  selectedFields?: string[];
}

/**
 * Entity query configuration for advanced querying
 */
export interface EntityQuery {
  /** Optional list of field names to select */
  selectedFields?: string[];
  /** Starting index for pagination (0-based) */
  start?: number;
  /** Maximum number of records to return */
  limit?: number;
  /** Sort options for ordering results */
  sortOptions?: SortOption[];
  /** Filter group for complex filtering */
  filterGroup?: FilterGroup;
  /** Expansion configurations for related entities */
  expansions?: Expansion[];
}

/**
 * Options for querying entity records with advanced filtering and sorting
 */
export type EntityQueryOptions = EntityQuery & PaginationOptions;

/**
 * Options for getting an entity by Id
 */
export type EntityGetRecordsByIdOptions = {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
} & PaginationOptions;

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
 * Options for inserting data into an entity
 */
export type EntityInsertOptions = EntityOperationOptions;

/**
 * Options for updating data in an entity
 */
export type EntityUpdateOptions = EntityOperationOptions;

/**
 * Options for deleting data from an entity
 */
export interface EntityDeleteOptions {
  /** Whether to fail on first error (default: false) */
  failOnFirst?: boolean;
}

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
 * Response from inserting data into an entity
 */
export type EntityInsertResponse = EntityOperationResponse;

/**
 * Response from updating data in an entity
 */
export type EntityUpdateResponse = EntityOperationResponse;

/**
 * Response from deleting data from an entity
 */
export type EntityDeleteResponse = EntityOperationResponse;

/**
 * Entity type enum
 */
export enum EntityType {
  Entity = 'Entity',
  ChoiceSet = 'ChoiceSet',
  InternalEntity = 'InternalEntity',
  SystemEntity = 'SystemEntity'
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
  ManyToOne = 'ManyToOne'
}

/**
 * Field display types
 */
export enum FieldDisplayType {
  Basic = 'Basic',
  Relationship = 'Relationship',
  File = 'File',
  ChoiceSetSingle = 'ChoiceSetSingle',
  ChoiceSetMultiple = 'ChoiceSetMultiple',
  AutoNumber = 'AutoNumber'
}

/**
 * Data direction type for external fields
 */
export enum DataDirectionType {
  ReadOnly = 'ReadOnly',
  ReadAndWrite = 'ReadAndWrite'
}

/**
 * Join type for source join criteria
 */
export enum JoinType {
  LeftJoin = 'LeftJoin'
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

/**
 * Response from entity query API
 */
export interface EntityQueryResponse {
  /** Total number of records matching the query */
  totalRecordCount: number;
  /** Array of entity records */
  value: EntityRecord[];
  /** Optional JSON string representation of the data */
  jsonValue?: string;
}