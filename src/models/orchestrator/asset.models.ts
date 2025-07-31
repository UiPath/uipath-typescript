import { AssetGetAllOptions, AssetGetResponse } from './asset.types';

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
} 