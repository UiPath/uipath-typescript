import { BaseOptions } from "../common/common-types";

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
 * Interface for getById response
 */
export interface EntityGetByIdResponse {
  totalCount: number;
  data: Record<string, any>[];
  fields: EntityFieldMetaData[];
}

// SQL Type Interface
interface FieldType {
  name: string;
}

// Field Definition Interface
interface FieldDefinition {
  name: string;
  sqlType: FieldType;
}

// Entity Metadata Response Interface
export interface EntityMetadataResponse {
  fields: FieldDefinition[];
}

/**
 * Options for getting an entity by Id
 */
export interface EntityGetByIdOptions extends BaseOptions {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
}