import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  BucketGetResponse, 
  BucketGetAllOptions, 
  BucketGetByIdOptions
} from '../../models/orchestrator/bucket.types';
import { BucketServiceModel } from '../../models/orchestrator/bucket.models';
import { pascalToCamelCaseKeys, addPrefixToKeys } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_ID } from '../../utils/constants/headers';
import { BUCKET_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../utils/constants/common';
import { CollectionResponse } from '../../models/common/common-types';

/**
 * Service for interacting with UiPath Orchestrator Buckets API
 */
export class BucketService extends FolderScopedService implements BucketServiceModel {
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
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
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
   * Gets all buckets across folders with optional filtering and folder scoping
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of buckets
   * 
   * @example
   * ```typescript
   * // Get all buckets across folders
   * const buckets = await sdk.buckets.getAll();
   * 
   * // Get buckets within a specific folder
   * const buckets = await sdk.buckets.getAll({ 
   *   folderId: 123
   * });
   * 
   * // Get buckets with filtering
   * const buckets = await sdk.buckets.getAll({ 
   *   filter: "name eq 'MyBucket'"
   * });
   * ```
   */
  async getAll(options: BucketGetAllOptions = {}): Promise<BucketGetResponse[]> {
    const { folderId, ...restOptions } = options;
    
    // If folderId is provided, use the folder-specific endpoint
    if (folderId !== undefined && folderId !== null) {
      return this._getByFolder<object, BucketGetResponse>(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        folderId, 
        restOptions,
        (bucket) => pascalToCamelCaseKeys(bucket) as BucketGetResponse
      );
    }
    
    // Otherwise get buckets across all folders
    const keysToPrefix = Object.keys(restOptions);
    const apiOptions = addPrefixToKeys(restOptions, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<CollectionResponse<BucketGetResponse>>(
      BUCKET_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions
      }
    );

    const bucketArray = response.data?.value; 
    const transformedBuckets = bucketArray?.map(bucket => 
      pascalToCamelCaseKeys(bucket) as BucketGetResponse
    );
    
    return transformedBuckets;
  }
}
