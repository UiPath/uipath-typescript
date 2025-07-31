import { AssetGetAllOptions, AssetGetResponse, AssetGetByIdOptions } from './asset.types';

/**
 * Asset service model interface
 */
export interface AssetServiceModel {
  /**
   * Gets all assets across folders with optional filtering
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of assets
   */
  getAll(options?: AssetGetAllOptions): Promise<AssetGetResponse[]>;

  /**
   * Gets a single asset by ID
   * 
   * @param id - Asset ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to a single asset
   */
  getById(id: number, folderId: number, options?: AssetGetByIdOptions): Promise<AssetGetResponse>;
} 