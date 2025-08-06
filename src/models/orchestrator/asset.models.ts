import { AssetGetAllOptions, AssetGetResponse, AssetGetByIdOptions } from './asset.types';
import { PageResult, PaginationCursor } from '../../utils/pagination';

/**
 * Asset service model interface
 */
export interface AssetServiceModel {
  /**
   * Gets all assets across folders with optional filtering
   * Returns an array of assets when no pagination parameters are provided,
   * or a PageResult when any pagination parameter is provided
   * 
   * @param options - Query options including optional folderId and pagination
   * @returns Promise resolving to array of assets or a paginated result
   */
  getAll(options?: AssetGetAllOptions & { 
    pageSize?: undefined; 
    includeTotal?: undefined;
    cursor?: undefined;
  }): Promise<AssetGetResponse[]>;
  
  getAll(options: AssetGetAllOptions & { 
    pageSize?: number;
  } | AssetGetAllOptions & { 
    includeTotal: true;
  } | AssetGetAllOptions & { 
    cursor: PaginationCursor;
  }): Promise<PageResult<AssetGetResponse>>;

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