import { EntityFieldDataType, FieldDisplayType } from "./entities.types";
import { EntitySchemaFieldMapping } from "./entities.internal-types";

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
  [EntityFieldDataType.File]:              { sqlTypeName: SqlFieldType.UNIQUEIDENTIFIER, fieldDisplayType: FieldDisplayType.File           },
  [EntityFieldDataType.ChoiceSetSingle]:   { sqlTypeName: SqlFieldType.INT,              fieldDisplayType: FieldDisplayType.ChoiceSetSingle  },
  [EntityFieldDataType.ChoiceSetMultiple]: { sqlTypeName: SqlFieldType.NVARCHAR,         fieldDisplayType: FieldDisplayType.ChoiceSetMultiple },
  [EntityFieldDataType.AutoNumber]:        { sqlTypeName: SqlFieldType.DECIMAL,          fieldDisplayType: FieldDisplayType.AutoNumber        },
  [EntityFieldDataType.Relationship]:      { sqlTypeName: SqlFieldType.UNIQUEIDENTIFIER, fieldDisplayType: FieldDisplayType.Relationship      },
};

/**
 * Maps FieldDisplayType values to EntityFieldDataType for types that share SQL types
 * with other field types (File, ChoiceSetSingle, ChoiceSetMultiple, AutoNumber).
 * Used during read-side transformation to produce the correct EntityFieldDataType.
 */
export const FieldDisplayTypeToDataType: Partial<Record<FieldDisplayType, EntityFieldDataType>> = {
  [FieldDisplayType.File]:              EntityFieldDataType.File,
  [FieldDisplayType.ChoiceSetSingle]:   EntityFieldDataType.ChoiceSetSingle,
  [FieldDisplayType.ChoiceSetMultiple]: EntityFieldDataType.ChoiceSetMultiple,
  [FieldDisplayType.AutoNumber]:        EntityFieldDataType.AutoNumber,
  [FieldDisplayType.Relationship]:      EntityFieldDataType.Relationship,
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
