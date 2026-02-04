import { FolderScopedService } from '../../folder-scoped';
import type { IUiPath } from '../../../core/types';
import { ValidationError, HttpStatus } from '../../../core/errors';
import {
  BucketGetResponse,
  BucketGetAllOptions,
  BucketGetByIdOptions,
  BucketGetUriResponse,
  BucketGetReadUriOptions,
  BucketGetFileMetaDataWithPaginationOptions,
  BucketUploadFileOptions,
  BucketUploadResponse,
  BlobItem,
  BucketGetUriOptions
} from '../../../models/orchestrator/buckets.types';
import { BucketServiceModel } from '../../../models/orchestrator/buckets.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, transformData, arrayDictionaryToRecord } from '../../../utils/transform';
import { filterUndefined } from '../../../utils/object';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { BUCKET_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, BUCKET_PAGINATION, ODATA_OFFSET_PARAMS, BUCKET_TOKEN_PARAMS } from '../../../utils/constants/common';
import { BucketMap } from '../../../models/orchestrator/buckets.constants';
import { ODATA_PAGINATION } from '../../../utils/constants/common';
import axios, { AxiosResponse } from 'axios';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

export class BucketService extends FolderScopedService implements BucketServiceModel {
  /**
   * Creates an instance of the Buckets service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
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
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Get bucket by ID
   * const bucket = await buckets.getById(123, 456);
   * ```
   */
  @track('Buckets.GetById')
  async getById(id: number, folderId: number, options: BucketGetByIdOptions = {}): Promise<BucketGetResponse> {
    if (!id) {
      throw new ValidationError({ message: 'bucketId is required for getById' });
    }
    
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for getById' });
    }
    
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Prefix all keys in options with $ for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<BucketGetResponse>(
      BUCKET_ENDPOINTS.GET_BY_ID(id),
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
   * The method returns either:
   * - An array of buckets (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of buckets or paginated result
   * 
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Get all buckets across folders
   * const allBuckets = await buckets.getAll();
   *
   * // Get buckets within a specific folder
   * const folderBuckets = await buckets.getAll({
   *   folderId: 123
   * });
   *
   * // Get buckets with filtering
   * const filteredBuckets = await buckets.getAll({
   *   filter: "name eq 'MyBucket'"
   * });
   *
   * // First page with pagination
   * const page1 = await buckets.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await buckets.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await buckets.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Buckets.GetAll')
  async getAll<T extends BucketGetAllOptions = BucketGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketGetResponse>
      : NonPaginatedResponse<BucketGetResponse>
  > {
    // Transformation function for buckets
    const transformBucketResponse = (bucket: any) => 
      pascalToCamelCaseKeys(bucket) as BucketGetResponse;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? BUCKET_ENDPOINTS.GET_BY_FOLDER : BUCKET_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: BUCKET_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformBucketResponse,
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
   * Gets metadata for files in a bucket with optional filtering and pagination
   * 
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   * 
   * @param bucketId - The ID of the bucket to get file metadata from
   * @param folderId - Required folder ID for organization unit context
   * @param options - Optional parameters for filtering, pagination and access URL generation
   * @returns Promise resolving to the list of file metadata in the bucket or paginated result
   * 
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Get metadata for all files in a bucket
   * const fileMetadata = await buckets.getFileMetaData(123, 456);
   *
   * // Get file metadata with a specific prefix
   * const fileMetadata = await buckets.getFileMetaData(123, 456, {
   *   prefix: '/folder1'
   * });
   *
   * // First page with pagination
   * const page1 = await buckets.getFileMetaData(123, 456, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await buckets.getFileMetaData(123, 456, { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Buckets.GetFileMetaData')
  async getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number, 
    folderId: number, 
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  > {
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getFileMetaData' });
    }
    
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for getFileMetaData' });
    }

    // Transformation function for blob items
    const transformBlobItem = (item: any) => 
      transformData(item, BucketMap) as BlobItem;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => BUCKET_ENDPOINTS.GET_FILE_META_DATA(bucketId),
      transformFn: transformBlobItem,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: BUCKET_PAGINATION.ITEMS_FIELD,
        continuationTokenField: BUCKET_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: BUCKET_TOKEN_PARAMS.PAGE_SIZE_PARAM,       
          tokenParam: BUCKET_TOKEN_PARAMS.TOKEN_PARAM               
        }
      },
      excludeFromPrefix: ['prefix'] // Bucket-specific param, not OData
    }, { ...options, folderId }) as any;
  }

  /**
   * Uploads a file to a bucket
   * 
   * @param options - Options for file upload including bucket ID, folder ID, path, content, and optional parameters
   * @returns Promise resolving to a response with success status and HTTP status code
   * 
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Upload a file from browser
   * const file = new File(['file content'], 'example.txt');
   * const result = await buckets.uploadFile({
   *   bucketId: 123,
   *   folderId: 456,
   *   path: '/folder/example.txt',
   *   content: file
   * });
   *
   * // In Node env with Buffer
   * const buffer = Buffer.from('file content');
   * const result = await buckets.uploadFile({
   *   bucketId: 123,
   *   folderId: 456,
   *   path: '/folder/example.txt',
   *   content: buffer
   * });
   * ```
   */
  @track('Buckets.UploadFile')
  async uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse> {
    const { bucketId, folderId, path, content } = options;
    
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for uploadFile' });
    }
    
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for uploadFile' });
    }

    if (!path) {
      throw new ValidationError({ message: 'path is required for uploadFile' });
    }

    if (!content) {
      throw new ValidationError({ message: 'content is required for uploadFile' });
    }

    try {
      
      const uriResponse = await this._getWriteUri({
        bucketId,
        folderId,
        path,
      });

      // Upload file to the provided URI
      const response = await this._uploadToUri(uriResponse, content);
      
      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gets a direct download URL for a file in the bucket
   * 
   * @param options - Contains bucketId, folderId, file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * 
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Get download URL for a file
   * const fileAccess = await buckets.getReadUri({
   *   bucketId: 123,
   *   folderId: 456,
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  @track('Buckets.GetReadUri')
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
   * Uploads content to the provided URI
   * @param uriResponse - Response from getWriteUri containing URL and headers
   * @param content - The content to upload
   * @returns The response from the upload request with status info
   */
  private async _uploadToUri(
    uriResponse: BucketGetUriResponse, 
    content: Blob | Buffer | File, 
  ): Promise<AxiosResponse> {
    const { uri, headers = {}, requiresAuth } = uriResponse;
    
    if (!uri) {
      throw new ValidationError({ message: 'Upload URI not available', statusCode: HttpStatus.BAD_REQUEST });
    }

    // Create headers for the request
    let requestHeaders = { ...headers };

    // Add auth header if required
    if (requiresAuth) {
      const token = await this.getValidAuthToken();
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
   
    return axios.put(uri, content, {
      headers: createHeaders(requestHeaders)
    });
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
      throw new ValidationError({ message: 'bucketId is required for getUri' });
    }
    
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for getUri' });
    }

    if (!path) {
      throw new ValidationError({ message: 'path is required for getUri' });
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
   * Gets a direct upload URL for a file in the bucket
   * 
   * @param options - Contains bucketId, folderId, file path, optional expiry time
   * @returns Promise resolving to blob file access information
   */
  private async _getWriteUri(options: BucketGetUriOptions): Promise<BucketGetUriResponse> {
    const { bucketId, folderId, path, expiryInMinutes, ...restOptions } = options;
    
    const queryOptions = {
      expiryInMinutes,
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
