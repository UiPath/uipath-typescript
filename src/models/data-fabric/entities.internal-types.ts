import { FieldDisplayType, EntityRecord, ReferenceType, SqlType } from './entities.types';

/**
 * Write-side payload shape for creating a new field in a schema upsert call.
 * Distinct from FieldMetaData (the full read-side type) because new fields
 * don't have an id, timestamps, or other server-generated fields yet.
 */
export interface FieldSchemaPayload {
  name: string;
  displayName?: string;
  description?: string;
  /** UI logical type (e.g. "text", "number", "dateTime"). Required for Manage Entity round-trip. */
  type?: string;
  sqlType: SqlType;
  fieldDisplayType: FieldDisplayType;
  isRequired?: boolean;
  isUnique?: boolean;
  isRbacEnabled?: boolean;
  isEncrypted?: boolean;
  isHiddenField?: boolean;
  isForeignKey?: boolean;
  defaultValue?: string;
  choiceSetId?: string;
  referenceType?: ReferenceType;
  referenceEntity?: { id: string };
  referenceField?: { id: string };
}

/**
 * Shape of each entry in EntitySchemaFieldTypeMap — internal only.
 */
export interface EntitySchemaFieldMapping {
  sqlTypeName: SqlFieldType;
  fieldDisplayType: FieldDisplayType;
  /** Value emitted as the field's `type` on the wire. */
  apiTypeName: string;
}

/**
 * Internal type for the query response shape returned by the entity query API.
 */
export interface EntityQueryRawResponse {
  value?: EntityRecord[];
  totalRecordCount?: number;
}

/**
 * Names of the per-field SQL constraint properties (i.e. the contents of `sqlType`
 * excluding its `name`). Used internally to validate user-supplied constraints
 * against the set of constraints that each `EntityFieldDataType` accepts.
 *
 * Enum values match the corresponding property names on `EntityCreateFieldOptions`.
 */
export enum EntityFieldConstraint {
  LengthLimit = 'lengthLimit',
  MaxValue = 'maxValue',
  MinValue = 'minValue',
  DecimalPrecision = 'decimalPrecision',
}

/**
 * Inclusive [min, max] range for a single user-configurable constraint value.
 */
export interface FieldConstraintRange {
  min: number;
  max: number;
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
  MULTILINE = 'MULTILINE',
}
