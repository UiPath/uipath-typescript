import { EntityType, FieldDisplayType, EntityRecord, EntityMultiEntityWriteResponse, ReferenceType, SqlType } from './entities.types';

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
 * Wire shape for one join clause on the multi-entity (name-based) query route.
 * The entity service translates the public EntityJoin into this payload.
 */
export interface EntityJoinPayload {
  type: 'LEFT' | 'INNER';
  entity: string;
  on: { left: string; right: string };
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

/**
 * Wire shape of the multi-entity transactional upsert response.
 *
 * The transaction subtree already arrives camelCase, so no case conversion is applied to it;
 * the root `Id` is the one PascalCase key. `children`, `cascadeDeletedChildren` and
 * `deletedCount` are composite-entity concerns the envelope always sends and this route always
 * leaves empty — the service drops them rather than surfacing three dead fields.
 */
export interface RawEntityUpsertMultiEntityTransactionResponse {
  Id: string;
  transaction: EntityMultiEntityWriteResponse;
  children: Record<string, unknown>;
  cascadeDeletedChildren: Record<string, number>;
  deletedCount: number;
}
