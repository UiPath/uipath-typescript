import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  BucketGetResponse, 
  BucketGetAllOptions, 
  BucketGetByIdOptions,
  BucketServiceModel 
} from '../../models/orchestrator/bucket';
import { pascalToCamelCaseKeys, addPrefixToKeys } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_ID } from '../../utils/constants/headers';
import { BUCKET_ENDPOINTS } from '../../utils/constants/endpoints';
import { CollectionResponse } from '../../models/common/common-types';

/**
 * Service for interacting with UiPath Orchestrator Buckets API
 */
export class BucketService extends BaseService implements BucketServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets a bucket by ID
   * @param bucketId - The ID of the bucket to retrieve
   * @param folderId - Folder ID for organization unit context
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to the bucket
   * 
   * @example
   * ```typescript
   * // Get bucket by ID
   * const bucket = await sdk.buckets.getById(123, 456);
   * ```
   */
  async getById(bucketId: number, folderId: number, options: BucketGetByIdOptions = {}): Promise<BucketGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Prefix all keys in options with $ for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<BucketGetResponse>(
      BUCKET_ENDPOINTS.GET_BY_ID(bucketId),
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    return pascalToCamelCaseKeys(response.data) as BucketGetResponse;
  }

  /**
   * Gets all buckets with optional query parameters
   * @param folderId - Folder ID for organization unit context
   * @param options - Optional query parameters
   * @returns Promise resolving to an array of buckets
   * 
   * @example
   * ```typescript
   * // Get all buckets
   * const buckets = await sdk.buckets.getAll(123);
   * 
   * // Get buckets with filtering
   * const buckets = await sdk.buckets.getAll(123, { 
   *   filter: "name eq 'MyBucket'"
   * });
   * ```
   */
  async getAll(folderId: number, options: BucketGetAllOptions = {}): Promise<BucketGetResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Prefix all keys in options with $ for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<BucketGetResponse>>(
      BUCKET_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response Bucket array from PascalCase to camelCase
    const transformedBuckets = response.data?.value.map(bucket => 
      pascalToCamelCaseKeys(bucket) as BucketGetResponse
    );
    
    return transformedBuckets;
  }
}
