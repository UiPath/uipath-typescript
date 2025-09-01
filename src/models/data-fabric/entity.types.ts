/**
 * Entity field type names 
 */
export enum EntityFieldType {
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
 * Field information with name and type
 */
export interface EntityFieldMetaData {
  name: string;
  type: EntityFieldType;
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
 * Interface for getById response
 */
export interface RawEntityGetByIdResponse {
  id: string,
  data: EntityRecord[];
  fields: EntityFieldMetaData[];
}

/**
 * Options for getting an entity by Id
 */
export interface EntityGetByIdOptions {
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