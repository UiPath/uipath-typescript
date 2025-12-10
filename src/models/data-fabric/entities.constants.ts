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
 * Maps fields for Choice Set Values (PascalCase API → camelCase SDK)
 */
export const ChoiceSetValueMap = {
  Id: 'id',
  Name: 'name',
  DisplayName: 'displayName',
  NumberId: 'numberId',
  CreateTime: 'createdTime',
  UpdateTime: 'updatedTime',
  CreatedBy: 'createdBy',
  UpdatedBy: 'updatedBy',
  RecordOwner: 'recordOwner'
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