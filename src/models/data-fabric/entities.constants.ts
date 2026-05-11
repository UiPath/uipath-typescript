import { EntityFieldDataType, FieldDisplayType } from "./entities.types";
import {
  EntitySchemaFieldMapping,
  SqlFieldType,
  EntityFieldConstraint,
  FieldConstraintRange,
} from "./entities.internal-types";
export { SqlFieldType } from "./entities.internal-types";

/**
 * Maps fields for Entities
 */
export const EntityMap = {
  createTime: 'createdTime',
  updateTime: 'updatedTime',
  sqlType: 'fieldDataType',
  fieldDefinition: 'fieldMetaData'
};

/**
 * Maps EntityFieldDataType values to the API field payload components for create/update operations
 */
export const EntitySchemaFieldTypeMap: Record<EntityFieldDataType, EntitySchemaFieldMapping> = {
  [EntityFieldDataType.UUID]:           { sqlTypeName: SqlFieldType.UNIQUEIDENTIFIER, fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.STRING]:         { sqlTypeName: SqlFieldType.NVARCHAR,         fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.INTEGER]:        { sqlTypeName: SqlFieldType.INT,              fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.DATETIME]:       { sqlTypeName: SqlFieldType.DATETIME2,        fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.DATETIME_WITH_TZ]: { sqlTypeName: SqlFieldType.DATETIMEOFFSET, fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.DECIMAL]:        { sqlTypeName: SqlFieldType.DECIMAL,          fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.FLOAT]:          { sqlTypeName: SqlFieldType.FLOAT,            fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.DOUBLE]:         { sqlTypeName: SqlFieldType.REAL,             fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.DATE]:           { sqlTypeName: SqlFieldType.DATE,             fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.BOOLEAN]:        { sqlTypeName: SqlFieldType.BIT,              fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.BIG_INTEGER]:    { sqlTypeName: SqlFieldType.BIGINT,           fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldDataType.MULTILINE_TEXT]:    { sqlTypeName: SqlFieldType.MULTILINE,        fieldDisplayType: FieldDisplayType.Basic          },
  [EntityFieldDataType.FILE]:              { sqlTypeName: SqlFieldType.UNIQUEIDENTIFIER, fieldDisplayType: FieldDisplayType.File           },
  [EntityFieldDataType.CHOICE_SET_SINGLE]:   { sqlTypeName: SqlFieldType.INT,              fieldDisplayType: FieldDisplayType.ChoiceSetSingle  },
  [EntityFieldDataType.CHOICE_SET_MULTIPLE]: { sqlTypeName: SqlFieldType.NVARCHAR,         fieldDisplayType: FieldDisplayType.ChoiceSetMultiple },
  [EntityFieldDataType.AUTO_NUMBER]:        { sqlTypeName: SqlFieldType.DECIMAL,          fieldDisplayType: FieldDisplayType.AutoNumber        },
  [EntityFieldDataType.RELATIONSHIP]:      { sqlTypeName: SqlFieldType.UNIQUEIDENTIFIER, fieldDisplayType: FieldDisplayType.Relationship      },
};

/**
 * Maps FieldDisplayType values to EntityFieldDataType for types that share SQL types
 * with other field types (File, ChoiceSetSingle, ChoiceSetMultiple, AutoNumber).
 * Used during read-side transformation to produce the correct EntityFieldDataType.
 */
export const FieldDisplayTypeToDataType: Partial<Record<FieldDisplayType, EntityFieldDataType>> = {
  [FieldDisplayType.File]:              EntityFieldDataType.FILE,
  [FieldDisplayType.ChoiceSetSingle]:   EntityFieldDataType.CHOICE_SET_SINGLE,
  [FieldDisplayType.ChoiceSetMultiple]: EntityFieldDataType.CHOICE_SET_MULTIPLE,
  [FieldDisplayType.AutoNumber]:        EntityFieldDataType.AUTO_NUMBER,
  [FieldDisplayType.Relationship]:      EntityFieldDataType.RELATIONSHIP,
};

/**
 * Default and fixed sqlType constraint values applied when the user does not provide them.
 * The API requires these to be present on field creation — without them the field
 * is stored in an incomplete state, causing "Field type cannot be changed" errors
 * when the UI later tries to edit advanced options.
 */
export const ENTITY_FIELD_CONSTRAINT_DEFAULTS = {
  STRING_LENGTH_LIMIT: 200,
  MULTILINE_TEXT_LENGTH_LIMIT: 200,
  /** Fixed (non-overridable) length limit on DECIMAL payloads*/
  DECIMAL_LENGTH_LIMIT: 1000,
  DECIMAL_PRECISION: 2,
  /** Fixed (non-overridable) length limit for BIT (BOOLEAN) fields */
  BOOLEAN_LENGTH_LIMIT: 100,
  /** Fixed (non-overridable) length limit for DATE / DATETIMEOFFSET fields */
  DATE_LENGTH_LIMIT: 1000,
  /** Fixed (non-overridable) length limit for UNIQUEIDENTIFIER-backed FILE and RELATIONSHIP fields */
  UNIQUEIDENTIFIER_LENGTH_LIMIT: 300,
  /** Fixed (non-overridable) length limit for CHOICE_SET_MULTIPLE fields */
  CHOICE_SET_MULTIPLE_LENGTH_LIMIT: 4000,
  NUMERIC_MAX_VALUE: 1_000_000_000_000,
  NUMERIC_MIN_VALUE: -1_000_000_000_000,
} as const;

/**
 * Per-field-type spec describing which {@link EntityFieldConstraint}s the user
 * may supply on create / update, and the inclusive value range for each.
 *
 * Source of truth: the platform's `Constants.cs` constraint table. Keys absent
 * from a type's spec are not user-configurable for that type; passing one
 * throws a `ValidationError`. Field types absent from this map (BOOLEAN, DATE,
 * DATETIME, DATETIME_WITH_TZ, FILE, RELATIONSHIP, UUID, CHOICE_SET_SINGLE,
 * CHOICE_SET_MULTIPLE, AUTO_NUMBER) accept no user-supplied constraints.
 */
export const ENTITY_FIELD_CONSTRAINT_SPEC: Partial<Record<EntityFieldDataType, Partial<Record<EntityFieldConstraint, FieldConstraintRange>>>> = {
  [EntityFieldDataType.STRING]: {
    [EntityFieldConstraint.LengthLimit]: { min: 1, max: 4000 },
  },
  [EntityFieldDataType.MULTILINE_TEXT]: {
    [EntityFieldConstraint.LengthLimit]: { min: 1, max: 10000 },
  },
  [EntityFieldDataType.INTEGER]: {
    [EntityFieldConstraint.MaxValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.MinValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  },
  [EntityFieldDataType.BIG_INTEGER]: {
    [EntityFieldConstraint.MaxValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.MinValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  },
  [EntityFieldDataType.DECIMAL]: {
    [EntityFieldConstraint.MaxValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.MinValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.DecimalPrecision]: { min: 0, max: 10 },
  },
  [EntityFieldDataType.FLOAT]: {
    [EntityFieldConstraint.MaxValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.MinValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.DecimalPrecision]: { min: 0, max: 10 },
  },
  [EntityFieldDataType.DOUBLE]: {
    [EntityFieldConstraint.MaxValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.MinValue]: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
    [EntityFieldConstraint.DecimalPrecision]: { min: 0, max: 10 },
  },
};

/**
 * Maps SQL field types to friendly display names
 */
export const EntityFieldTypeMap: Record<SqlFieldType, EntityFieldDataType> = {
  [SqlFieldType.UNIQUEIDENTIFIER]: EntityFieldDataType.UUID,
  [SqlFieldType.NVARCHAR]:         EntityFieldDataType.STRING,
  [SqlFieldType.INT]:              EntityFieldDataType.INTEGER,
  [SqlFieldType.DATETIME2]:        EntityFieldDataType.DATETIME,
  [SqlFieldType.DATETIMEOFFSET]:   EntityFieldDataType.DATETIME_WITH_TZ,
  [SqlFieldType.FLOAT]:            EntityFieldDataType.FLOAT,
  [SqlFieldType.REAL]:             EntityFieldDataType.DOUBLE,
  [SqlFieldType.BIGINT]:           EntityFieldDataType.BIG_INTEGER,
  [SqlFieldType.DATE]:             EntityFieldDataType.DATE,
  [SqlFieldType.BIT]:              EntityFieldDataType.BOOLEAN,
  [SqlFieldType.DECIMAL]:          EntityFieldDataType.DECIMAL,
  [SqlFieldType.MULTILINE]:        EntityFieldDataType.MULTILINE_TEXT,
};
