import { EntityFieldDataType, EntityFieldType, FieldDisplayType } from "./entities.types";

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
 * Shape of each entry in EntitySchemaFieldTypeMap
 */
export interface EntitySchemaFieldMapping {
  apiType: string;
  sqlType: { name: SqlFieldType; lengthLimit?: number };
  fieldDisplayType: FieldDisplayType;
}

/**
 * Maps EntityFieldType enum values to the API field payload components
 */
export const EntitySchemaFieldTypeMap: Record<EntityFieldType, EntitySchemaFieldMapping> = {
  [EntityFieldType.Text]:     { apiType: "text",     sqlType: { name: SqlFieldType.NVARCHAR, lengthLimit: 200 },  fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.LongText]: { apiType: "text",     sqlType: { name: SqlFieldType.NVARCHAR, lengthLimit: 4000 }, fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Number]:   { apiType: "int",      sqlType: { name: SqlFieldType.INT },                          fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Decimal]:  { apiType: "decimal",  sqlType: { name: SqlFieldType.DECIMAL },                      fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Boolean]:  { apiType: "bit",      sqlType: { name: SqlFieldType.BIT },                          fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.DateTime]: { apiType: "datetime", sqlType: { name: SqlFieldType.DATETIME2 },                    fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.Date]:     { apiType: "date",     sqlType: { name: SqlFieldType.DATE },                         fieldDisplayType: FieldDisplayType.Basic },
  [EntityFieldType.File]:     { apiType: "file",     sqlType: { name: SqlFieldType.NVARCHAR, lengthLimit: 200 },   fieldDisplayType: FieldDisplayType.File },
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
