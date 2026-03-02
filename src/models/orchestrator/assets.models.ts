import { AssetGetAllOptions, AssetGetResponse, AssetGetByIdOptions } from './assets.types';
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
} 