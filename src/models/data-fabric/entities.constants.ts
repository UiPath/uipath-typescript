import { EntityFieldDataType, EntityFieldType, FieldDisplayType } from "./entities.types";
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
 * Maps EntityFieldType enum values to the API field payload components
 */
export const EntitySchemaFieldTypeMap: Record<EntityFieldType, EntitySchemaFieldMapping> = {
  [EntityFieldType.Text]:     { apiType: "text",     fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.LongText]: { apiType: "text",     fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Number]:   { apiType: "int",      fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Decimal]:  { apiType: "decimal",  fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Boolean]:  { apiType: "bit",      fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.DateTime]: { apiType: "datetime", fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Date]:     { apiType: "date",     fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.File]:     { apiType: "file",     fieldDisplayType: FieldDisplayType.File  },
};

/**
 * Maps SQL field types to friendly display names
 */
export const EntityFieldTypeMap: Record<SqlFieldType, EntityFieldDataType> = {
  [SqlFieldType.UNIQUEIDENTIFIER]: EntityFieldDataType.UUID,
  [SqlFieldType.NVARCHAR]: EntityFieldDataType.STRING,
  [SqlFieldType.INT]: EntityFieldDataType.INTEGER,
  [SqlFieldType.DATETIME2]: EntityFieldDataType.DATETIME,
  [SqlFieldType.DATETIMEOFFSET]: EntityFieldDataType.DATETIME_WITH_TZ,
  [SqlFieldType.FLOAT]: EntityFieldDataType.FLOAT,
  [SqlFieldType.REAL]: EntityFieldDataType.DOUBLE,
  [SqlFieldType.BIGINT]: EntityFieldDataType.BIG_INTEGER,
  [SqlFieldType.DATE]: EntityFieldDataType.DATE,
  [SqlFieldType.BIT]: EntityFieldDataType.BOOLEAN,
  [SqlFieldType.DECIMAL]: EntityFieldDataType.DECIMAL,
  [SqlFieldType.MULTILINE]: EntityFieldDataType.MULTILINE_TEXT
};
