import { FieldDisplayType, EntityRecord, SqlType } from './entities.types';

/**
 * Write-side payload shape for creating a new field in a schema upsert call.
 * Distinct from FieldMetaData (the full read-side type) because new fields
 * don't have an id, timestamps, or other server-generated fields yet.
 */
export interface FieldSchemaPayload {
  name: string;
  displayName?: string;
  description?: string;
  sqlType: SqlType;
  fieldDisplayType: FieldDisplayType;
  isRequired?: boolean;
  isUnique?: boolean;
  isRbacEnabled?: boolean;
  isEncrypted?: boolean;
  defaultValue?: string;
  choiceSetId?: string;
  referenceEntityName?: string;
  referenceFieldName?: string;
}

/**
 * Shape of each entry in EntitySchemaFieldTypeMap — internal only.
 */
export interface EntitySchemaFieldMapping {
  sqlTypeName: SqlFieldType;
  fieldDisplayType: FieldDisplayType;
}

/**
 * Internal type for the query response shape returned by the entity query API.
 */
export interface EntityQueryRawResponse {
  value?: EntityRecord[];
  totalRecordCount?: number;
}

/**
 * Entity field data types (SQL types from API)
 */
export enum SqlFieldType {
  UNIQUEIDENTIFIER = 'UNIQUEIDENTIFIER',
  NVARCHAR = 'NVARCHAR',
  INT = 'INT',
  DATETIME2 = 'DATETIME2',
  DATETIMEOFFSET = 'DATETIMEOFFSET',
  FLOAT = 'FLOAT',
  REAL = 'REAL',
  BIGINT = 'BIGINT',
  DATE = 'DATE',
  BIT = 'BIT',
  DECIMAL = 'DECIMAL',
  MULTILINE = 'MULTILINE'
}
