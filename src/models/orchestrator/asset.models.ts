import { AssetGetAllOptions, AssetGetResponse, AssetGetByIdOptions } from './asset.types';
import { PaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { NonPaginatedResponse } from '../common/common-types';

/**
 * Asset service model interface
 */
export interface AssetServiceModel {
  /**
   * Gets all assets across folders with optional filtering
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to NonPaginatedResponse or a paginated result
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
   */
  getById(id: number, folderId: number, options?: AssetGetByIdOptions): Promise<AssetGetResponse>;
} 