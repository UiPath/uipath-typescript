import { FolderScopedService } from '../../folder-scoped';
import { ValidationError, HttpStatus } from '../../../core/errors';
import {
  BucketGetResponse,
  BucketGetAllOptions,
  BucketGetByIdOptions,
  BucketGetByNameOptions,
  BucketGetUriResponse,
  BucketGetReadUriOptions,
  BucketGetReadUriRequestOptions,
  BucketGetFileMetaDataWithPaginationOptions,
  BucketUploadFileOptions,
  BucketUploadFileRequestOptions,
  BucketUploadResponse,
  BlobItem,
  BucketGetUriOptions,
  BucketGetFilesOptions,
  BucketFile,
  BucketDeleteFileOptions
} from '../../../models/orchestrator/buckets.types';
import { BucketServiceModel } from '../../../models/orchestrator/buckets.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, rewriteODataRequestFields, transformData, arrayDictionaryToRecord } from '../../../utils/transform';
import { filterUndefined } from '../../../utils/object';
import { createHeaders } from '../../../utils/http/headers';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { BUCKET_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, BUCKET_PAGINATION, ODATA_OFFSET_PARAMS, BUCKET_TOKEN_PARAMS } from '../../../utils/constants/common';
import { BucketMap } from '../../../models/orchestrator/buckets.constants';
import { ODATA_PAGINATION } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

export class BucketService extends FolderScopedService implements BucketServiceModel {
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

    // Rewrite renamed SDK field names → API names inside OData strings, then
    // prefix all keys in options with $ for OData.
    const rewrittenOptions = rewriteODataRequestFields(options, BucketMap);
    const keysToPrefix = Object.keys(rewrittenOptions);
    const apiOptions = addPrefixToKeys(rewrittenOptions, ODATA_PREFIX, keysToPrefix);
    
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
   * Retrieves a single orchestrator storage bucket by name.
   *
   * @param name - Bucket name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single bucket
   * {@link BucketGetResponse}
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // By folder ID
   * await buckets.getByName('MyBucket', { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.getByName('MyBucket', { folderKey: '<folderKey>' });
   *
   * // By folder path
   * await buckets.getByName('MyBucket', { folderPath: '<folderPath>' });
   * ```
   */
  @track('Buckets.GetByName')
  async getByName(name: string, options: BucketGetByNameOptions = {}): Promise<BucketGetResponse> {
    return this.getByNameLookup<BucketGetResponse, BucketGetResponse>(
      'Bucket',
      BUCKET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => pascalToCamelCaseKeys(raw) as BucketGetResponse,
      BucketMap,
    );
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
      fieldMap: BucketMap,
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
   * Gets metadata for files in a bucket with optional filtering and pagination.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * inside the options.
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param bucketId - The ID of the bucket to get file metadata from
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for filtering and pagination
   * @returns Promise resolving to the list of file metadata in the bucket or paginated result
   * {@link BlobItem}
   *
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // By folder ID
   * const fileMetadata = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.getFileMetaData(<bucketId>, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await buckets.getFileMetaData(<bucketId>, { folderPath: 'Shared/Finance' });
   *
   * // Filter by prefix
   * await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, prefix: '/folder1' });
   *
   * // First page with pagination
   * const page1 = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, cursor: page1.nextCursor });
   * }
   * ```
   */
  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
  /**
   * Gets metadata for files in a bucket — positional `folderId` form.
   *
   * @deprecated Use the options-object form: `getFileMetaData(bucketId, { folderId })`. See {@link BucketGetFileMetaDataWithPaginationOptions} for the supported options.
   *
   * @param bucketId - The ID of the bucket to get file metadata from
   * @param folderId - Required folder ID (numeric)
   * @param options - Optional parameters for filtering and pagination
   * @returns Promise resolving to the list of file metadata in the bucket or paginated result
   * {@link BlobItem}
   */
  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number,
    folderId: number,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
  @track('Buckets.GetFileMetaData')
  async getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number,
    optionsOrFolderId?: T | number,
    legacyOptions?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  > {
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getFileMetaData' });
    }

    // Normalize the two overload forms into a single internal shape.
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let restOptions: Omit<T, 'folderId' | 'folderKey' | 'folderPath'>;

    if (typeof optionsOrFolderId === 'number') {
      // Deprecated positional form: getFileMetaData(bucketId, folderId, options?)
      folderId = optionsOrFolderId;
      restOptions = (legacyOptions ?? {}) as Omit<T, 'folderId' | 'folderKey' | 'folderPath'>;
    } else {
      // Preferred form: getFileMetaData(bucketId, options?)
      const opts = optionsOrFolderId ?? ({} as T);
      ({ folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.getFileMetaData',
      fallbackFolderKey: this.config.folderKey,
    });

    // Transformation function for blob items
    const transformBlobItem = (item: any) =>
      transformData(item, BucketMap) as BlobItem;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => BUCKET_ENDPOINTS.GET_FILE_META_DATA(bucketId),
      transformFn: transformBlobItem,
      fieldMap: BucketMap,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: BUCKET_PAGINATION.ITEMS_FIELD,
        continuationTokenField: BUCKET_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: BUCKET_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: BUCKET_TOKEN_PARAMS.TOKEN_PARAM
        }
      },
      excludeFromPrefix: ['prefix'], // Bucket-specific param, not OData
      headers,
    }, restOptions) as any;
  }

  /**
   * Uploads a file to a bucket.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * in the options.
   *
   * @param bucketId - The ID of the bucket to upload to
   * @param path - Path where the file should be stored in the bucket
   * @param content - File content to upload
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to a response with success status and HTTP status code
   * {@link BucketUploadResponse}
   *
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // By folder ID
   * const file = new File(['file content'], 'example.txt');
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderPath: 'Shared/Finance' });
   *
   * // In Node env with Buffer
   * const buffer = Buffer.from('file content');
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', buffer, { folderId: <folderId> });
   * ```
   */
  uploadFile(
    bucketId: number,
    path: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse>;
  /**
   * Uploads a file to a bucket — options-only form.
   *
   * @deprecated Use the positional form: `uploadFile(bucketId, path, content, options?)`. See {@link BucketUploadFileRequestOptions} for the supported options.
   *
   * @param options - Options for file upload including bucket ID, folder scoping (`folderId` / `folderKey` / `folderPath`), path, and content
   * @returns Promise resolving to a response with success status and HTTP status code
   * {@link BucketUploadResponse}
   */
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
  @track('Buckets.UploadFile')
  async uploadFile(
    bucketIdOrOptions: number | BucketUploadFileOptions,
    path?: string,
    content?: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse> {
    // Normalize the two overload forms into a single internal shape.
    let bucketId: number;
    let resolvedPath: string;
    let resolvedContent: Blob | Uint8Array<ArrayBuffer> | File;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;

    if (bucketIdOrOptions !== null && typeof bucketIdOrOptions === 'object') {
      // Deprecated options-only form: uploadFile({ bucketId, path, content, ... })
      ({ bucketId, path: resolvedPath, content: resolvedContent, folderId, folderKey, folderPath } = bucketIdOrOptions);
    } else {
      // Preferred positional form: uploadFile(bucketId, path, content, options?)
      bucketId = bucketIdOrOptions;
      resolvedPath = path as string;
      resolvedContent = content as Blob | Uint8Array<ArrayBuffer> | File;
      const opts = options ?? ({} as BucketUploadFileRequestOptions);
      ({ folderId, folderKey, folderPath } = opts);
    }

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for uploadFile' });
    }

    if (!resolvedPath) {
      throw new ValidationError({ message: 'path is required for uploadFile' });
    }

    if (!resolvedContent) {
      throw new ValidationError({ message: 'content is required for uploadFile' });
    }

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.uploadFile',
      fallbackFolderKey: this.config.folderKey,
    });

    const uriResponse = await this._getWriteUri({
      bucketId,
      path: resolvedPath,
      headers,
    });

    // Upload file to the provided URI
    const response = await this._uploadToUri(uriResponse, resolvedContent);

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status
    };
  }

  /**
   * Gets a direct download URL for a file in the bucket.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * inside the options.
   *
   * @param bucketId - The ID of the bucket
   * @param path - The full path to the file
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional `expiryInMinutes`
   * @returns Promise resolving to blob file access information
   * {@link BucketGetUriResponse}
   *
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // By folder ID
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderPath: 'Shared/Finance' });
   * ```
   */
  getReadUri(
    bucketId: number,
    path: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse>;
  /**
   * Gets a direct download URL for a file in the bucket — options-only form.
   *
   * @deprecated Use the positional form: `getReadUri(bucketId, path, options?)`. See {@link BucketGetReadUriRequestOptions} for the supported options.
   *
   * @param options - Contains bucketId, folder scoping (`folderId` / `folderKey` / `folderPath`), file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * {@link BucketGetUriResponse}
   */
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;
  @track('Buckets.GetReadUri')
  async getReadUri(
    bucketIdOrOptions: number | BucketGetReadUriOptions,
    path?: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse> {
    // Normalize the two overload forms into a single internal shape.
    let bucketId: number;
    let resolvedPath: string;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let expiryInMinutes: number | undefined;
    let restOptions: Record<string, unknown>;

    if (bucketIdOrOptions !== null && typeof bucketIdOrOptions === 'object') {
      // Deprecated options-only form: getReadUri({ bucketId, path, ... })
      const { bucketId: bid, path: p, expiryInMinutes: e, folderId: fid, folderKey: fkey, folderPath: fpath, ...rest } = bucketIdOrOptions;
      bucketId = bid;
      resolvedPath = p;
      expiryInMinutes = e;
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      restOptions = rest;
    } else {
      // Preferred positional form: getReadUri(bucketId, path, options?)
      bucketId = bucketIdOrOptions;
      resolvedPath = path as string;
      const opts = options ?? ({} as BucketGetReadUriRequestOptions);
      ({ expiryInMinutes, folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.getReadUri',
      fallbackFolderKey: this.config.folderKey,
    });

    const rewrittenReadUriOptions = rewriteODataRequestFields(restOptions, BucketMap);
    const queryOptions = {
      expiryInMinutes,
      ...addPrefixToKeys(rewrittenReadUriOptions, ODATA_PREFIX, Object.keys(rewrittenReadUriOptions))
    };

    return this._getUri(
      BUCKET_ENDPOINTS.GET_READ_URI(bucketId),
      bucketId,
      resolvedPath,
      headers,
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
    content: Blob | Uint8Array<ArrayBuffer> | File, 
  ): Promise<Response> {
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
   
    return fetch(uri, {
      method: 'PUT',
      body: content,
      headers: createHeaders(requestHeaders),
    });
  }

  /**
   * Private method to handle common URI request logic
   * @param endpoint - The API endpoint to call
   * @param bucketId - The bucket ID
   * @param path - The file path
   * @param headers - Pre-built folder-context headers (built via `resolveFolderHeaders`)
   * @param queryOptions - Additional query parameters
   * @returns Promise resolving to blob file access information
   */
  private async _getUri(
    endpoint: string,
    bucketId: number,
    path: string,
    headers: Record<string, string>,
    queryOptions: Record<string, string | number | undefined> = {}
  ): Promise<BucketGetUriResponse> {
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getUri' });
    }

    if (!path) {
      throw new ValidationError({ message: 'path is required for getUri' });
    }

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
   * Lists all files in a bucket.
   *
   * Returns a flat, recursive listing of all files in the bucket. Supports regex filtering
   * and filter / orderby / select / expand. {@link BucketFile} entries include
   * `isDirectory` so callers can distinguish folders from files.
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param bucketId - The ID of the bucket
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for regex filtering, query options, and pagination
   * @returns Promise resolving to either an array of files NonPaginatedResponse<BucketFile> or a PaginatedResponse<BucketFile> when pagination options are used.
   *
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // List all files in the bucket
   * const files = await buckets.getFiles(<bucketId>, { folderId: <folderId> });
   *
   * // Filter by regex pattern
   * const pdfs = await buckets.getFiles(<bucketId>, {
   *   folderId: <folderId>,
   *   fileNameRegex: '.*\\.pdf$'
   * });
   *
   * // First page with pagination
   * const page1 = await buckets.getFiles(<bucketId>, { folderId: <folderId>, pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await buckets.getFiles(<bucketId>, { folderId: <folderId>, cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await buckets.getFiles(<bucketId>, {
   *   folderId: <folderId>,
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Buckets.GetFiles')
  async getFiles<T extends BucketGetFilesOptions = BucketGetFilesOptions>(
    bucketId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketFile>
      : NonPaginatedResponse<BucketFile>
  > {
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getFiles' });
    }

    const { folderId, folderKey, folderPath, ...restOptions } = options ?? {} as BucketGetFilesOptions;

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.getFiles',
      fallbackFolderKey: this.config.folderKey,
    });

    const transformBucketFile = (file: Record<string, unknown>) =>
      transformData(pascalToCamelCaseKeys(file), BucketMap) as BucketFile;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => BUCKET_ENDPOINTS.GET_FILES(bucketId),
      transformFn: transformBucketFile,
      fieldMap: BucketMap,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
      excludeFromPrefix: ['directory', 'recursive', 'fileNameRegex'],
      headers,
    }, { ...restOptions, directory: '/', recursive: true }) as any;
  }

  /**
   * Deletes a file from a bucket
   *
   * @param bucketId - The ID of the bucket
   * @param path - The full path to the file to delete
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving when the file is deleted
   *
   * @example
   * ```typescript
   * import { Buckets } from '@uipath/uipath-typescript/buckets';
   *
   * const buckets = new Buckets(sdk);
   *
   * // Delete a file from a bucket
   * await buckets.deleteFile(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });
   * ```
   */
  @track('Buckets.DeleteFile')
  async deleteFile(bucketId: number, path: string, options?: BucketDeleteFileOptions): Promise<void> {
    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for deleteFile' });
    }

    if (!path) {
      throw new ValidationError({ message: 'path is required for deleteFile' });
    }

    const headers = resolveFolderHeaders({
      folderId: options?.folderId,
      folderKey: options?.folderKey,
      folderPath: options?.folderPath,
      resourceType: 'Buckets.deleteFile',
      fallbackFolderKey: this.config.folderKey,
    });

    await this.delete(
      BUCKET_ENDPOINTS.DELETE_FILE(bucketId),
      {
        params: { path },
        headers,
      }
    );
  }

  /**
   * Gets a direct upload URL for a file in the bucket
   *
   * @param options - Contains bucketId, file path, optional expiry time, and pre-built folder-context headers
   * @returns Promise resolving to blob file access information
   */
  private async _getWriteUri(
    options: BucketGetUriOptions & { headers: Record<string, string> },
  ): Promise<BucketGetUriResponse> {
    const { bucketId, path, expiryInMinutes, headers, ...restOptions } = options;

    const rewrittenWriteUriOptions = rewriteODataRequestFields(restOptions, BucketMap);
    const queryOptions = {
      expiryInMinutes,
      ...addPrefixToKeys(rewrittenWriteUriOptions, ODATA_PREFIX, Object.keys(rewrittenWriteUriOptions))
    };

    return this._getUri(
      BUCKET_ENDPOINTS.GET_WRITE_URI(bucketId),
      bucketId,
      path,
      headers,
      queryOptions
    );
  }
}
