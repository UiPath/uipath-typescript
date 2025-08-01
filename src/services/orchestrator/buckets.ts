import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  BucketGetResponse, 
  BucketGetAllOptions, 
  BucketGetByIdOptions,
  BucketGetFilesOptions,
  BucketGetFilesResponse,
  BlobGetUriResponse,
  GetReadUriOptions,
  GetWriteUriOptions
} from '../../models/orchestrator/bucket.types';
import { BucketServiceModel } from '../../models/orchestrator/bucket.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, filterUndefined } from '../../utils/transform';
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
    if (folderId) {
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

  /**
   * Gets files from a bucket with optional filtering and pagination
   * 
   * @param bucketId - The ID of the bucket to get files from
   * @param folderId - Required folder ID for organization unit context
   * @param options - Optional parameters for filtering, pagination and access URL generation
   * @returns Promise resolving to the list of files in the bucket
   * 
   * @example
   * ```typescript
   * // Get all files in a bucket
   * const files = await sdk.buckets.getFiles(123, 456);
   * 
   * // Get files with a specific prefix
   * const files = await sdk.buckets.getFiles(123, 456, {
   *   prefix: '/folder1'
   * });
   * ```
   */
  async getFiles(bucketId: number, folderId: number, options: BucketGetFilesOptions = {}): Promise<BucketGetFilesResponse> {
    // Create headers with required folder ID
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Filter out undefined values from options
    const queryParams = filterUndefined(options);
    
    // Transform 'limit' to 'takeHint' for API compatibility
    if ('limit' in queryParams) {
      (queryParams as any).takeHint = queryParams.limit;
      delete queryParams.limit;
    }
    
    // Make the API call to get files
    const response = await this.get<BucketGetFilesResponse>(
      BUCKET_ENDPOINTS.GET_FILES(bucketId),
      {
        params: queryParams,
        headers
      }
    );
    
    return response.data;
  }

  /**
   * Gets a direct download URL for a file in the bucket
   * 
   * @param bucketId - The ID of the bucket containing the file
   * @param folderId - Required folder ID for organization unit context
   * @param options - Required file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * 
   * @example
   * ```typescript
   * // Get download URL for a file
   * const fileAccess = await sdk.buckets.getReadUri(123, 456, {
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  async getReadUri(bucketId: number, folderId: number, options: GetReadUriOptions): Promise<BlobGetUriResponse> {
    // Create headers with required folder ID
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Extract OData parameters ($select, $expand) to prefix them
    const { path, expiryInMinutes, ...restOptions } = options;
    
    // Filter out undefined values and build query params
    const queryParams = filterUndefined({
      path,
      expiryInMinutes,
      ...addPrefixToKeys(restOptions, ODATA_PREFIX, Object.keys(restOptions))
    });
    
    // Make the API call to get read URI
    const response = await this.get<Record<string, any>>(
      BUCKET_ENDPOINTS.GET_READ_URI(bucketId),
      {
        params: queryParams,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    return pascalToCamelCaseKeys(response.data) as BlobGetUriResponse;
  }

  /**
   * Gets a direct upload URL for a file in the bucket
   * 
   * @param bucketId - The ID of the bucket for the file upload
   * @param folderId - Required folder ID for organization unit context
   * @param options - Required file path, optional expiry time and content type
   * @returns Promise resolving to blob file access information
   * 
   * @example
   * ```typescript
   * // Get upload URL for a file
   * const fileAccess = await sdk.buckets.getWriteUri(123, 456, {
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  async getWriteUri(bucketId: number, folderId: number, options: GetWriteUriOptions): Promise<BlobGetUriResponse> {
    // Create headers with required folder ID
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Extract OData parameters ($select, $expand) to prefix them
    const { path, expiryInMinutes, contentType, ...restOptions } = options;
    
    // Filter out undefined values and build query params
    const queryParams = filterUndefined({
      path,
      expiryInMinutes,
      contentType,
      ...addPrefixToKeys(restOptions, ODATA_PREFIX, Object.keys(restOptions))
    });
    
    // Make the API call to get write URI
    const response = await this.get<Record<string, any>>(
      BUCKET_ENDPOINTS.GET_WRITE_URI(bucketId),
      {
        params: queryParams,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    return pascalToCamelCaseKeys(response.data) as BlobGetUriResponse;
  }
}
