import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse } from '../../models/common/common-types';
import { 
  AssetGetResponse, 
  AssetGetAllOptions,
  AssetGetByIdOptions
} from '../../models/orchestrator/asset.types';
import { AssetServiceModel } from '../../models/orchestrator/asset.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { ASSET_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../utils/constants/common';
import { AssetMap } from '../../models/orchestrator/assets.constants';
import { PageResult, PaginationCursor } from '../../utils/pagination';

/**
 * Service for interacting with UiPath Orchestrator Assets API
 */
export class AssetService extends FolderScopedService implements AssetServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all assets across folders with optional filtering and folder scoping
   * 
   * The method returns either:
   * - An array of assets (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @example
   * ```typescript
   * // Standard array return
   * const assets = await sdk.asset.getAll();
   * 
   * // With folder
   * const folderAssets = await sdk.asset.getAll({ folderId: 123 });
   * 
   * // First page with pagination
   * const page1 = await sdk.asset.getAll({ pageSize: 10, includeTotal: true });
   * 
   * // Navigate using cursor
   * if (page1.hasNext) {
   *   const page2 = await sdk.asset.getAll({ cursor: page1.next });
   * }
   * ```
   */
  async getAll(options?: AssetGetAllOptions & { 
    pageSize?: undefined; 
    includeTotal?: undefined;
    cursor?: undefined;
  }): Promise<AssetGetResponse[]>;
  
  async getAll(options: AssetGetAllOptions & { 
    pageSize?: number;
  } | AssetGetAllOptions & { 
    includeTotal: true;
  } | AssetGetAllOptions & { 
    cursor: PaginationCursor;
  }): Promise<PageResult<AssetGetResponse>>;
  
  async getAll(options: AssetGetAllOptions = {}): Promise<AssetGetResponse[] | PageResult<AssetGetResponse>> {
    const { folderId, cursor, pageSize, includeTotal, ...restOptions } = options;
    
    // Detect pagination intent from any pagination parameter
    const isPaginationRequested = cursor !== undefined || pageSize !== undefined || includeTotal === true;
    
    // If pagination is requested, use the pagination flow
    if (isPaginationRequested) {
      const endpoint = folderId ? ASSET_ENDPOINTS.GET_BY_FOLDER : ASSET_ENDPOINTS.GET_ALL;
      const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};
      
      const pageResult = await this.requestWithPagination<AssetGetResponse>(
        'GET',
        endpoint,
        { cursor, pageSize, includeTotal },
        {
          headers,
          params: restOptions,
          pagination: {
            paginationType: 'odata',
            itemsField: 'value',
            totalCountField: 'totalRecordCount'
          }
        }
      );
      
      // Transform the data to camelCase and apply type mapping
      const transformedItems = pageResult.items.map(asset =>
        transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap)
      );
      
      return {
        ...pageResult,
        items: transformedItems
      };
    }
    
    // Standard array return (default)
    // If folderId is provided, use the folder-specific endpoint
    if (folderId) {
      return this._getByFolder<object, AssetGetResponse>(
        ASSET_ENDPOINTS.GET_BY_FOLDER, 
        folderId, 
        restOptions, 
        (asset) => transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap)
      );
    }
    
    // Otherwise get assets across all folders
    const keysToPrefix = Object.keys(restOptions);
    const apiOptions = addPrefixToKeys(restOptions, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions
      }
    );

    const assetArray = response.data?.value;
    const transformedAssets = assetArray?.map(asset => 
      transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap)
    );
    
    return transformedAssets;
  }

  /**
   * Gets a single asset by ID
   * 
   * @param id - Asset ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to a single asset
   * 
   * @example
   * ```typescript
   * // Get asset by ID
   * const asset = await sdk.asset.getById(123, 456);
   * ```
   */
  async getById(id: number, folderId: number, options: AssetGetByIdOptions = {}): Promise<AssetGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<AssetGetResponse>(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      { 
        headers,
        params: apiOptions
      }
    );

    const transformedAsset = transformData(pascalToCamelCaseKeys(response.data) as AssetGetResponse, AssetMap);
    
    return transformedAsset;
  }
}
