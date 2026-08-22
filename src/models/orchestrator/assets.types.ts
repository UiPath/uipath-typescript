import { BaseOptions, FolderScopedOptions, RequestOptions, ResourceRef } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

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
  Text = 'Text',
  Bool = 'Bool',
  Integer = 'Integer',
  Credential = 'Credential',
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

/**
 * Options for getting assets across folders
 */
export type AssetGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Optional folder ID to filter assets by folder
   */
  folderId?: number;
}

/**
 * Options for getting a single asset by ID
 */
export interface AssetGetByIdOptions extends BaseOptions {}

/**
 * Options for getting a single asset by name
 */
export interface AssetGetByNameOptions extends FolderScopedOptions {}

/**
 * Options for getting a single asset by key (GUID)
 */
export interface AssetGetByKeyOptions extends FolderScopedOptions {}

/**
 * New value accepted by {@link AssetServiceModel.updateValueById}.
 *
 * The runtime type must match the asset's `valueType`:
 * - `Text` → `string`
 * - `Integer` → `number`
 * - `Bool` → `boolean`
 */
export type AssetNewValue = string | number | boolean;

/**
 * Options for updating an asset value by ID
 * @deprecated Use {@link AssetUpdateValueOptions} with the ref-based `updateValue` method instead.
 */
export interface AssetUpdateValueByIdOptions extends FolderScopedOptions {}

/**
 * Options for {@link AssetServiceModel.updateValue}. Folder scoping applies to the caller-supplied
 * ref's name lookup; when a name lookup runs, the update itself targets the folder the resolved
 * asset actually lives in (from the lookup response) rather than the caller-supplied folder,
 * so runtime overrides that redirect across folders remain consistent.
 */
export interface AssetUpdateValueOptions extends FolderScopedOptions {}

/**
 * Selects an asset by exactly one identifier — `{ id }`, `{ name }`, or `{ key }` (GUID).
 * See {@link ResourceRef}.
 */
export type AssetRef = ResourceRef<number>;
