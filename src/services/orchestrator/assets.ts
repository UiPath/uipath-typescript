import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
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
import { ODATA_PREFIX, ODATA_OFFSET_PARAMS } from '../../utils/constants/common';
import { AssetMap } from '../../models/orchestrator/assets.constants';
import { ODATA_PAGINATION } from '../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/pagination-helpers';
import { PaginationType } from '../../utils/pagination/pagination.internal-types';

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
   * const assets = await sdk.assets.getAll();
   * 
   * // With folder
   * const folderAssets = await sdk.assets.getAll({ folderId: 123 });
   * 
   * // First page with pagination
   * const page1 = await sdk.assets.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.assets.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.assets.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  async getAll<T extends AssetGetAllOptions = AssetGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AssetGetResponse>
      : NonPaginatedResponse<AssetGetResponse>
  > {
    // Transformation function for assets
    const transformAssetResponse = (asset: any) => 
      transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? ASSET_ENDPOINTS.GET_BY_FOLDER : ASSET_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: ASSET_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformAssetResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,     
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,           
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM              
        }
      }
    }, options) as any;
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
   * const asset = await sdk.assets.getById(123, 456);
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
