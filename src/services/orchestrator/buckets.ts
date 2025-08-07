import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  BucketGetResponse, 
  BucketGetAllOptions, 
  BucketGetByIdOptions,
  BucketGetUriResponse,
  BucketGetReadUriOptions,
  BucketGetWriteUriOptions,
  BucketGetFileMetaDataOptions,
  BucketGetFileMetaDataResponse
} from '../../models/orchestrator/bucket.types';
import { BucketServiceModel } from '../../models/orchestrator/bucket.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, renameObjectFields, transformData, arrayDictionaryToRecord } from '../../utils/transform';
import { filterUndefined } from '../../utils/object-utils';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_ID } from '../../utils/constants/headers';
import { BUCKET_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../utils/constants/common';
import { CollectionResponse } from '../../models/common/common-types';
import { BucketMap } from '../../models/orchestrator/bucket.constants';

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
    if (!bucketId) {
      throw new Error('bucketId is required');
    }
    
    if (!folderId) {
      throw new Error('folderId is required');
    }
    
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
  async getFileMetaData(bucketId: number, folderId: number, options: BucketGetFileMetaDataOptions = {}): Promise<BucketGetFileMetaDataResponse> {
    if (!bucketId) {
      throw new Error('bucketId is required');
    }
    
    if (!folderId) {
      throw new Error('folderId is required');
    }
    
    // Create headers with required folder ID
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Filter out undefined values from options
    const queryParams = filterUndefined(options);
    
    renameObjectFields(queryParams, { limit: 'takeHint' });
    
    // Make the API call to get files
    const response = await this.get<BucketGetFileMetaDataResponse>(
      BUCKET_ENDPOINTS.GET_FILE_META_DATA(bucketId),
      {
        params: queryParams,
        headers
      }
    );
    
    return transformData(response.data, BucketMap);
  }

  /**
   * Private method to handle common URI request logic
   * @param endpoint - The API endpoint to call
   * @param bucketId - The bucket ID
   * @param folderId - The folder ID
   * @param path - The file path
   * @param queryOptions - Additional query parameters
   * @returns Promise resolving to blob file access information
   */
  private async _getUri(
    endpoint: string,
    bucketId: number,
    folderId: number,
    path: string,
    queryOptions: Record<string, any> = {}
  ): Promise<BucketGetUriResponse> {
    if (!bucketId) {
      throw new Error('bucketId is required');
    }
    
    if (!folderId) {
      throw new Error('folderId is required');
    }

    if (!path) {
      throw new Error('path is required');
    }
    
    // Create headers with required folder ID
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Filter out undefined values and build query params
    const queryParams = filterUndefined({
      path,
      ...queryOptions
    });
    
    // Make the API call to get URI
    const response = await this.get<Record<string, any>>(
      endpoint,
      {
        params: queryParams,
        headers
      }
    );
    
    const transformedData = transformData(pascalToCamelCaseKeys(response.data), BucketMap) as BucketGetUriResponse;
    
    // Convert headers from array-based to record if needed
    if (transformedData.headers && 'keys' in transformedData.headers && 'values' in transformedData.headers) {
      transformedData.headers = arrayDictionaryToRecord(
        transformedData.headers as unknown as { keys: string[], values: string[] }
      );
    }
    
    return transformedData;
  }

  /**
   * Gets a direct download URL for a file in the bucket
   * 
   * @param options - Contains bucketId, folderId, file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * 
   * @example
   * ```typescript
   * // Get download URL for a file
   * const fileAccess = await sdk.buckets.getReadUri({
   *   bucketId: 123, 
   *   folderId: 456,
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  async getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse> {
    const { bucketId, folderId, path, expiryInMinutes, ...restOptions } = options;
    
    const queryOptions = {
      expiryInMinutes,
      ...addPrefixToKeys(restOptions, ODATA_PREFIX, Object.keys(restOptions))
    };
    
    return this._getUri(
      BUCKET_ENDPOINTS.GET_READ_URI(bucketId),
      bucketId,
      folderId,
      path,
      queryOptions
    );
  }

  /**
   * Gets a direct upload URL for a file in the bucket
   * 
   * @param options - Contains bucketId, folderId, file path, optional expiry time and content type
   * @returns Promise resolving to blob file access information
   * 
   * @example
   * ```typescript
   * // Get upload URL for a file
   * const fileAccess = await sdk.buckets.getWriteUri({
   *   bucketId: 123, 
   *   folderId: 456,
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  async getWriteUri(options: BucketGetWriteUriOptions): Promise<BucketGetUriResponse> {
    const { bucketId, folderId, path, expiryInMinutes, contentType, ...restOptions } = options;
    
    const queryOptions = {
      expiryInMinutes,
      contentType,
      ...addPrefixToKeys(restOptions, ODATA_PREFIX, Object.keys(restOptions))
    };
    
    return this._getUri(
      BUCKET_ENDPOINTS.GET_WRITE_URI(bucketId),
      bucketId,
      folderId,
      path,
      queryOptions
    );
  }
}
