import { EntityType, FieldDisplayType, EntityRecord, ReferenceType, SqlType } from './entities.types';

/**
 * Write-side payload shape for creating a new field in a schema upsert call.
 * Distinct from FieldMetaData (the full read-side type) because new fields
 * don't have an id, timestamps, or other server-generated fields yet.
 */
export interface FieldSchemaPayload {
  name: string;
  displayName?: string;
  description?: string;
  /**
   * Lowercase server-side type discriminator (e.g. `'text'`, `'relationship'`).
   * The web UI sends this for every field, but the DF server can infer the type
   * from `sqlType.name` + `fieldDisplayType` for basic scalar types (STRING,
   * INTEGER, DECIMAL, DATETIME, ...), CHOICE_SET_SINGLE, CHOICE_SET_MULTIPLE,
   * AUTO_NUMBER, and RELATIONSHIP, so the SDK omits it there.
   *
   * FILE is the exception: `fieldDisplayType:"File"` on its own doesn't reach the
   * attachment auto-wire branch — the server needs `type:"relationship"` to route
   * FILE into the relationship path, where `fieldDisplayType:"File"` then
   * narrows it to the attachment sub-flavor. Without it the server errors with
   * `Target entity is not provided in request`.
   */
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
  referenceEntity?: ReferenceEntityPayload;
  referenceChoiceSet?: ReferenceEntityPayload;
  referenceField?: { id: string };
}

/** Body embedded in `referenceEntity` / `referenceChoiceSet` on cross-folder field payloads. */
export interface ReferenceEntityPayload {
  id: string;
  name?: string;
  folderId?: string;
  entityType?: EntityType;
  entityTypeId?: number;
}

export interface ResolvedReferenceMeta {
  referenceEntity?: ReferenceEntityPayload;
  referenceChoiceSet?: ReferenceEntityPayload;
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
  MULTILINE_MAX = 'MULTILINE_MAX',
}
