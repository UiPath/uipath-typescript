import { AssetGetAllOptions, AssetGetResponse, AssetGetByIdOptions, AssetGetByNameOptions, AssetNewValue, AssetUpdateValueByIdOptions } from './assets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Assets.
 *
 * Assets are key-value pairs that can be used to store configuration data, credentials, and other settings used by automation processes. [UiPath Assets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-assets)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Assets } from '@uipath/uipath-typescript/assets';
 *
 * const assets = new Assets(sdk);
 * const allAssets = await assets.getAll();
 * ```
 */
export interface AssetServiceModel {
  /**
   * Gets all assets across folders with optional filtering
   * 
   * @param options Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of assets NonPaginatedResponse<AssetGetResponse> or a PaginatedResponse<AssetGetResponse> when pagination options are used.
   * {@link AssetGetResponse}
   * @example
   * ```typescript
   * // Standard array return
   * // With folder
   * const folderAssets = await assets.getAll({ folderId: <folderId> });
   * 
   * // First page with pagination
   * const page1 = await assets.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await assets.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await assets.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends AssetGetAllOptions = AssetGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<AssetGetResponse>
    : NonPaginatedResponse<AssetGetResponse>
  >;

  /**
   * Gets a single asset by ID
   * 
   * @param id - Asset ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to a single asset
   * {@link AssetGetResponse}
   * @example
   * ```typescript
   * // Get asset by ID
   * const asset = await assets.getById(<assetId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: AssetGetByIdOptions): Promise<AssetGetResponse>;

  /**
   * Retrieves a single asset by name.
   *
   * @param name - Asset name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single asset
   * {@link AssetGetResponse}
   * @example
   * ```typescript
   * // By folder ID
   * await assets.getByName('ApiKey', { folderId: 123 });
   *
   * // By folder key (GUID)
   * await assets.getByName('ApiKey', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await assets.getByName('ApiKey', { folderPath: 'Shared/Finance' });
   *
   * // With expand
   * await assets.getByName('ApiKey', { folderPath: 'Shared/Finance', expand: 'keyValueList' });
   * ```
   */
  getByName(name: string, options?: AssetGetByNameOptions): Promise<AssetGetResponse>;

  /**
   * Updates the value of an existing asset by ID.
   *
   * Fetches the asset internally to determine its type, then updates only the value while
   * preserving the asset's name, scope, and description.
   *
   * **Supported value types:** `Text`, `Integer`, and `Bool` only. Other types
   * (`Credential`, `Secret`) throw a `ValidationError`.
   *
   * The `newValue` runtime type must match the asset's `valueType`:
   * - `Text` → `string`
   * - `Integer` → `number` (integer)
   * - `Bool` → `boolean`
   *
   * @param id - Asset ID
   * @param newValue - New value to apply (string for `Text`, number for `Integer`, boolean for `Bool`)
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving when the asset has been updated
   *
   * @example
   * ```typescript
   * // Update a Text asset by folder ID
   * await assets.updateValueById(<assetId>, 'new-value', { folderId: <folderId> });
   *
   * // Update an Integer asset by folder key (GUID)
   * await assets.updateValueById(<assetId>, 42, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // Update a Bool asset by folder path
   * await assets.updateValueById(<assetId>, true, { folderPath: 'Shared/Finance' });
   * ```
   */
  updateValueById(id: number, newValue: AssetNewValue, options?: AssetUpdateValueByIdOptions): Promise<void>;
}
