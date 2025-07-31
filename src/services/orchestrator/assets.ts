import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse } from '../../models/common/common-types';
import { 
  AssetGetResponse, 
  AssetGetAllOptions,
  AssetServiceModel 
} from '../../models/orchestrator/asset';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { ASSET_ENDPOINTS } from '../../utils/constants/endpoints';
import { AssetMap } from '../../models/orchestrator/assets.constants';

/**
 * Service for interacting with UiPath Orchestrator Assets API
 */
export class AssetService extends BaseService implements AssetServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all assets across folders with optional filtering and folder scoping
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of assets
   * 
   * @example
   * ```typescript
   * // Get all assets across folders
   * const assets = await sdk.asset.getAll();
   * 
   * // Get assets within a specific folder
   * const assets = await sdk.asset.getAll({ 
   *   folderId: 123
   * });
   * 
   * // Get assets with filtering
   * const assets = await sdk.asset.getAll({ 
   *   filter: "name eq 'MyAsset'"
   * });
   * ```
   */
  async getAll(options: AssetGetAllOptions = {}): Promise<AssetGetResponse[]> {
    const { folderId, ...restOptions } = options;
    
    // If folderId is provided, use the folder-specific endpoint
    if (folderId !== undefined) {
      return this.getByFolder(folderId, restOptions);
    }
    
    // Otherwise get assets across all folders
    const keysToPrefix = Object.keys(restOptions);
    const apiOptions = addPrefixToKeys(restOptions, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions
      }
    );

    const transformedAssets = response.data?.value.map(asset => 
      transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap)
    );
    
    return transformedAssets;
  }

  /**
   * Gets assets in a folder with optional query parameters
   * 
   * @param folderId - required folder ID
   * @param options - Query options
   * @returns Promise resolving to an array of assets
   */
  private async getByFolder(folderId: number, options: AssetGetAllOptions = {}): Promise<AssetGetResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      { 
        params: apiOptions,
        headers
      }
    );

    const transformedAssets = response.data?.value.map(asset => 
      transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap)
    );
    
    return transformedAssets;
  }
}
