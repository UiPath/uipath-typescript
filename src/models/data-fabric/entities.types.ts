import { PaginationOptions } from '../../utils/pagination/types';
import { AxiosRequestConfig } from 'axios';

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
 * Options for getting attachments from an entity
 */
export interface EntityGetAttachmentsOptions {
  /** Entity name */
  entityName: string;
  /** Record ID */
  recordId: string;
  /** Field name */
  fieldName: string;
}

/**
 * Attachment metadata
 */
export interface AttachmentMetadata {
  /** File name */
  fileName?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Content type */
  contentType?: string;
  /** Download URL */
  downloadUrl?: string;
  [key: string]: any;
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