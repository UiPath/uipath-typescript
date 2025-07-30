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
   * Gets assets with optional query parameters
   * 
   * @param folderId - required folder ID
   * @param options - Query options
   * @returns Promise resolving to an array of assets
   * 
   * @example
   * ```typescript
   * // Get all assets
   * const assets = await sdk.asset.getAll(folderId);
   * 
   * // Get assets with filtering
   * const assets = await sdk.asset.getAll(folderId, { 
   *   filter: "name eq 'MyAsset'"
   * });
   * ```
   */
  async getAll(folderId: number, options: AssetGetAllOptions = {}): Promise<AssetGetResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_ALL,
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
