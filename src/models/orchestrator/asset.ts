import { RequestOptions } from '../common/common-types';

/**
 * Enum for Asset Value Scope
 */
export enum AssetValueScope {
  Global = 'Global',
  PerRobot = 'PerRobot'
}

/**
 * Enum for Asset Value Type
 */
export enum AssetValueType {
  DBConnectionString = 'DBConnectionString',
  HttpConnectionString = 'HttpConnectionString',
  Text = 'Text',
  Bool = 'Bool',
  Integer = 'Integer',
  Credential = 'Credential',
  WindowsCredential = 'WindowsCredential',
  KeyValueList = 'KeyValueList',
  Secret = 'Secret'
}

/**
 * Interface for key-value pair used in assets
 */
export interface CustomKeyValuePair {
  key?: string;
  value?: string;
}

/**
 * Interface for asset response
 */
export interface AssetGetResponse {
  key: string;
  name: string;
  id: number;
  canBeDeleted: boolean;
  valueScope: AssetValueScope;
  valueType: AssetValueType;
  value: string | null;
  credentialStoreId: number | null;
  keyValueList: CustomKeyValuePair[];
  hasDefaultValue: boolean;
  description: string | null;
  foldersCount: number;
  lastModifiedTime: string | null;
  lastModifierUserId: number | null;
  createdTime: string;
  creatorUserId: number;
}

export type AssetGetAllOptions = RequestOptions;

/**
 * Asset service model interface
 */
export interface AssetServiceModel {
  /**
   * Gets all assets with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Required folder ID
   * @returns Promise resolving to an array of assets
   */
  getAll(folderId: number, options?: AssetGetAllOptions): Promise<AssetGetResponse[]>;
}
