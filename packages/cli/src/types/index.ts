export interface EnvironmentConfig {
  baseUrl: string;
  orgId: string;
  tenantId: string;
  tenantName: string;
  folderKey?: string;
  bearerToken: string;
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  systemName: string;
  appUrl: string | null;
  registeredAt: string;
}

export enum AppType {
  Web = 'Web',
  Action = 'Action',
}

export enum JsonDataType {
  string = 'string',
  integer = 'integer',
  number = 'number',
  boolean = 'boolean',
  array = 'array',
  object = 'object',
}

export enum JsonFormatType {
  uuid = 'uuid',
  date = 'date',
}

export enum VbArgumentCollectionType {
  array = 'Array',
}

export enum VbArgumentDataTypeNamespace {
  system = 'system',
}

export enum VBDataType {
  string = 'System.String',
  int64 = 'System.Int64',
  boolean = 'System.Boolean',
  decimal = 'System.Decimal',
  dateOnly = 'System.DateOnly',
  guid = 'System.Guid',
  object = 'System.Object',
}