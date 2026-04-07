import { EntityFieldDataType } from "./entities.types";

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
 * Internal field payload used when creating or updating entity schemas
 */
export interface EntitySchemaField {
  name: string;
  displayName: string;
  type: string;
  description: string;
  isRequired: boolean;
  fieldDisplayType: string;
  sqlType: { name: string; lengthLimit?: number };
  choiceSetId: string | null;
  defaultValue: string | null;
  isRbacEnabled: boolean;
  isUnique: boolean;
  isEncrypted: boolean;
}

/**
 * Maps friendly type names to the API field payload components
 */
export const EntitySchemaFieldTypeMap: Record<string, {
  apiType: string;
  sqlType: { name: string; lengthLimit?: number };
  fieldDisplayType: string;
}> = {
  text:     { apiType: "text",     sqlType: { name: "NVARCHAR", lengthLimit: 200 },  fieldDisplayType: "Basic" },
  longtext: { apiType: "text",     sqlType: { name: "NVARCHAR", lengthLimit: 4000 }, fieldDisplayType: "Basic" },
  number:   { apiType: "int",      sqlType: { name: "INT" },                          fieldDisplayType: "Basic" },
  decimal:  { apiType: "decimal",  sqlType: { name: "DECIMAL" },                      fieldDisplayType: "Basic" },
  boolean:  { apiType: "bit",      sqlType: { name: "BIT" },                          fieldDisplayType: "Basic" },
  datetime: { apiType: "datetime", sqlType: { name: "DATETIME2" },                    fieldDisplayType: "Basic" },
  date:     { apiType: "date",     sqlType: { name: "DATE" },                         fieldDisplayType: "Basic" },
  file:     { apiType: "file",     sqlType: { name: "NVARCHAR", lengthLimit: 200 },   fieldDisplayType: "File" },
};

/**
 * List of supported friendly field type names
 */
export const ENTITY_FIELD_TYPES = Object.keys(EntitySchemaFieldTypeMap);

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