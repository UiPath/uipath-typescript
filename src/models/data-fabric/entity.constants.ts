import { EntityFieldType } from "./entity.types";

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
export const EntityMap: { [key: string]: string } = {
  totalRecordCount: 'totalCount',
  value: 'data'
};

/**
 * Maps SQL field types to friendly display names
 */
export const EntityFieldTypeMap: Record<SqlFieldType, EntityFieldType> = {
  [SqlFieldType.UNIQUEIDENTIFIER]: EntityFieldType.UUID,
  [SqlFieldType.NVARCHAR]: EntityFieldType.STRING,
  [SqlFieldType.INT]: EntityFieldType.INTEGER,
  [SqlFieldType.DATETIME2]: EntityFieldType.DATETIME,
  [SqlFieldType.DATETIMEOFFSET]: EntityFieldType.DATETIME_WITH_TZ,
  [SqlFieldType.FLOAT]: EntityFieldType.FLOAT,
  [SqlFieldType.REAL]: EntityFieldType.DOUBLE,
  [SqlFieldType.BIGINT]: EntityFieldType.BIG_INTEGER,
  [SqlFieldType.DATE]: EntityFieldType.DATE,
  [SqlFieldType.BIT]: EntityFieldType.BOOLEAN,
  [SqlFieldType.DECIMAL]: EntityFieldType.DECIMAL,
  [SqlFieldType.MULTILINE]: EntityFieldType.MULTILINE_TEXT
}; 