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
  [EntityFieldDataType.MULTILINE_MAX_TEXT]: { sqlTypeName: SqlFieldType.MULTILINE_MAX,    fieldDisplayType: FieldDisplayType.Basic          },
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
  /** Default and maximum length limit (UTF-16 byte budget) for MULTILINE_MAX fields (128 KB) */
  MULTILINE_MAX_LENGTH_LIMIT: 131072,
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
  [EntityFieldDataType.MULTILINE_MAX_TEXT]: {
    [EntityFieldConstraint.LengthLimit]: { min: 1, max: 131072 },
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
 * Reserved system field names that cannot be used for user-defined fields.
 * Backed by SQL columns the platform manages itself. Matched case-insensitively.
 */
export const RESERVED_FIELD_NAMES: ReadonlySet<string> = new Set(
  ['Id', 'CreatedBy', 'CreateTime', 'UpdatedBy', 'UpdateTime', 'RecordOwner', 'KmsKeyId']
    .map(n => n.toLowerCase()),
);

/**
 * Maximum lengths for entity / field display name and description, enforced by the
 * backend (StorageManagementService.cs Constants.InputValidation).
 */
export const NAME_VALIDATION_LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  DISPLAY_NAME_MAX: 128,
  DESCRIPTION_MAX: 512,
} as const;

/**
 * C# and Visual Basic reserved keywords. Backend rejects entity / field names that
 * are not valid identifiers in either language; VB is case-insensitive so the set
 * is lower-cased and looked up against the lower-cased input.
 *
 * Source of truth: C# language spec (reserved keywords) and VB.NET language
 * reference. List combined and de-duplicated.
 */
export const RESERVED_LANGUAGE_KEYWORDS: ReadonlySet<string> = new Set([
  // C# reserved keywords
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
  // VB reserved keywords (lowercased; VB is case-insensitive)
  'addhandler', 'addressof', 'alias', 'and', 'andalso', 'boolean', 'byref',
  'byval', 'call', 'cbool', 'cbyte', 'cchar', 'cdate', 'cdbl', 'cdec', 'cint',
  'clng', 'cobj', 'continue', 'csbyte', 'cshort', 'csng', 'cstr', 'ctype',
  'cuint', 'culng', 'cushort', 'date', 'declare', 'dim', 'directcast', 'each',
  'elseif', 'end', 'endif', 'erase', 'error', 'exit', 'friend', 'function',
  'get', 'gettype', 'getxmlnamespace', 'global', 'gosub', 'goto', 'handles',
  'implements', 'imports', 'inherits', 'integer', 'isnot', 'let', 'lib',
  'like', 'loop', 'me', 'mod', 'module', 'mustinherit', 'mustoverride',
  'mybase', 'myclass', 'nameof', 'narrowing', 'next', 'not', 'nothing',
  'notinheritable', 'notoverridable', 'of', 'on', 'option', 'optional', 'or',
  'orelse', 'overloads', 'overridable', 'overrides', 'paramarray', 'partial',
  'property', 'raiseevent', 'redim', 'rem', 'removehandler', 'resume',
  'sbyte', 'select', 'set', 'shadows', 'shared', 'single', 'step', 'stop',
  'structure', 'sub', 'synclock', 'then', 'to', 'trycast', 'uinteger',
  'variant', 'wend', 'when', 'widening', 'with', 'withevents', 'writeonly',
  'xor',
]);

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
  [SqlFieldType.MULTILINE_MAX]:    EntityFieldDataType.MULTILINE_MAX_TEXT,
};
