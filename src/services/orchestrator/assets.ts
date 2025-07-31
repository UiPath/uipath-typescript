import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse } from '../../models/common/common-types';
import { 
  AssetGetResponse, 
  AssetGetAllOptions
} from '../../models/orchestrator/asset.types';
import { AssetServiceModel } from '../../models/orchestrator/asset.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { TokenManager } from '../../core/auth/token-manager';
import { ASSET_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../utils/constants/common';
import { AssetMap } from '../../models/orchestrator/assets.constants';

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
}
