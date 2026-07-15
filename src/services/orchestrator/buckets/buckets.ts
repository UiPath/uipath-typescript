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
import { pascalToCamelCaseKeys, addPrefixToKeys, transformData, transformOptions, arrayDictionaryToRecord } from '../../../utils/transform';
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

  @track('Buckets.GetByName')
  async getByName(name: string, options: BucketGetByNameOptions = {}): Promise<BucketGetResponse> {
    return this.getByNameLookup<BucketGetResponse, BucketGetResponse>(
      'Bucket',
      BUCKET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => pascalToCamelCaseKeys(raw) as BucketGetResponse,
    );
  }

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

    // Pull folderKey/folderPath out of options — the pagination helper only
    // recognizes folderId, so we resolve string-based folder scoping here and
    // pass pre-built headers through. Passing them through as query options
    // would leak them into the URL as OData params.
    const { folderKey, folderPath, ...restOptions } = (options ?? {}) as
      T & { folderKey?: string; folderPath?: string };
    const folderId = (restOptions as { folderId?: number }).folderId;

    const wantsFolder = folderId !== undefined || folderKey !== undefined || folderPath !== undefined;

    // No meta-tag folderKey fallback: `getAll()` with no folder options
    // deliberately remains a cross-folder query, matching the pre-existing
    // public contract.
    const headers = wantsFolder
      ? resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'Buckets.getAll' })
      : undefined;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      // Endpoint choice is driven by `wantsFolder`, not the folderId the helper
      // hands us — folderKey/folderPath don't surface as a numeric folderId,
      // so we can't rely on the helper's default (folderId ? by-folder : all).
      getEndpoint: () => wantsFolder ? BUCKET_ENDPOINTS.GET_BY_FOLDER : BUCKET_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: BUCKET_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformBucketResponse,
      headers,
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
    }, restOptions as T) as any;
  }

  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucket: number | string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucket: number | string,
    folderId: number,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
  @track('Buckets.GetFileMetaData')
  async getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucket: number | string,
    optionsOrFolderId?: T | number,
    legacyOptions?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  > {
    // Normalize the two overload forms into a single internal shape.
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let restOptions: Omit<T, 'folderId' | 'folderKey' | 'folderPath'>;

    if (typeof optionsOrFolderId === 'number') {
      // Deprecated positional form: getFileMetaData(bucket, folderId, options?)
      folderId = optionsOrFolderId;
      restOptions = (legacyOptions ?? {}) as Omit<T, 'folderId' | 'folderKey' | 'folderPath'>;
    } else {
      // Preferred form: getFileMetaData(bucket, options?)
      const opts = optionsOrFolderId ?? ({} as T);
      ({ folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const bucketId = await this.coerceBucketId(
      bucket,
      { folderId, folderKey, folderPath },
      'Buckets.getFileMetaData',
    );

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

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating.
    const apiRestOptions = transformOptions(restOptions, BucketMap);

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
      excludeFromPrefix: ['prefix'], // Bucket-specific param, not OData
      headers,
    }, apiRestOptions) as any;
  }

  uploadFile(
    bucket: number | string,
    path: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse>;
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
  @track('Buckets.UploadFile')
  async uploadFile(
    bucketOrOptions: number | string | BucketUploadFileOptions,
    path?: string,
    content?: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse> {
    // Normalize the two overload forms into a single internal shape.
    let bucket: number | string;
    let resolvedPath: string;
    let resolvedContent: Blob | Uint8Array<ArrayBuffer> | File;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;

    if (bucketOrOptions !== null && typeof bucketOrOptions === 'object') {
      // Deprecated options-only form: uploadFile({ bucketId, path, content, ... })
      // Deprecated form remains numeric-only for bucketId.
      ({ bucketId: bucket, path: resolvedPath, content: resolvedContent, folderId, folderKey, folderPath } = bucketOrOptions);
    } else {
      // Preferred positional form: uploadFile(bucket, path, content, options?)
      bucket = bucketOrOptions;
      resolvedPath = path as string;
      resolvedContent = content as Blob | Uint8Array<ArrayBuffer> | File;
      const opts = options ?? ({} as BucketUploadFileRequestOptions);
      ({ folderId, folderKey, folderPath } = opts);
    }

    if (!resolvedPath) {
      throw new ValidationError({ message: 'path is required for uploadFile' });
    }

    if (!resolvedContent) {
      throw new ValidationError({ message: 'content is required for uploadFile' });
    }

    const bucketId = await this.coerceBucketId(
      bucket,
      { folderId, folderKey, folderPath },
      'Buckets.uploadFile',
    );

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

  getReadUri(
    bucket: number | string,
    path: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse>;
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;
  @track('Buckets.GetReadUri')
  async getReadUri(
    bucketOrOptions: number | string | BucketGetReadUriOptions,
    path?: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse> {
    // Normalize the two overload forms into a single internal shape.
    let bucket: number | string;
    let resolvedPath: string;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let expiryInMinutes: number | undefined;
    let restOptions: Record<string, unknown>;

    if (bucketOrOptions !== null && typeof bucketOrOptions === 'object') {
      // Deprecated options-only form: getReadUri({ bucketId, path, ... })
      // Deprecated form remains numeric-only for bucketId.
      const { bucketId: bid, path: p, expiryInMinutes: e, folderId: fid, folderKey: fkey, folderPath: fpath, ...rest } = bucketOrOptions;
      bucket = bid;
      resolvedPath = p;
      expiryInMinutes = e;
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      restOptions = rest;
    } else {
      // Preferred positional form: getReadUri(bucket, path, options?)
      bucket = bucketOrOptions;
      resolvedPath = path as string;
      const opts = options ?? ({} as BucketGetReadUriRequestOptions);
      ({ expiryInMinutes, folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const bucketId = await this.coerceBucketId(
      bucket,
      { folderId, folderKey, folderPath },
      'Buckets.getReadUri',
    );

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.getReadUri',
      fallbackFolderKey: this.config.folderKey,
    });

    const apiRestOptions = transformOptions(restOptions, BucketMap);
    const queryOptions = {
      expiryInMinutes,
      ...addPrefixToKeys(apiRestOptions, ODATA_PREFIX, Object.keys(apiRestOptions))
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

  @track('Buckets.GetFiles')
  async getFiles<T extends BucketGetFilesOptions = BucketGetFilesOptions>(
    bucket: number | string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketFile>
      : NonPaginatedResponse<BucketFile>
  > {
    const { folderId, folderKey, folderPath, ...restOptions } = options ?? {} as BucketGetFilesOptions;

    const bucketId = await this.coerceBucketId(
      bucket,
      { folderId, folderKey, folderPath },
      'Buckets.getFiles',
    );

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Buckets.getFiles',
      fallbackFolderKey: this.config.folderKey,
    });

    const transformBucketFile = (file: Record<string, unknown>) =>
      transformData(pascalToCamelCaseKeys(file), BucketMap) as BucketFile;

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating.
    const apiRestOptions = transformOptions(restOptions, BucketMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => BUCKET_ENDPOINTS.GET_FILES(bucketId),
      transformFn: transformBucketFile,
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
    }, { ...apiRestOptions, directory: '/', recursive: true }) as any;
  }

  @track('Buckets.DeleteFile')
  async deleteFile(bucket: number | string, path: string, options?: BucketDeleteFileOptions): Promise<void> {
    if (!path) {
      throw new ValidationError({ message: 'path is required for deleteFile' });
    }

    const { folderId, folderKey, folderPath } = options ?? {};

    const bucketId = await this.coerceBucketId(
      bucket,
      { folderId, folderKey, folderPath },
      'Buckets.deleteFile',
    );

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
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

    const apiRestOptions = transformOptions(restOptions, BucketMap);
    const queryOptions = {
      expiryInMinutes,
      ...addPrefixToKeys(apiRestOptions, ODATA_PREFIX, Object.keys(apiRestOptions))
    };

    return this._getUri(
      BUCKET_ENDPOINTS.GET_WRITE_URI(bucketId),
      bucketId,
      path,
      headers,
      queryOptions
    );
  }

  /**
   * Coerces a numeric bucket ID or a bucket name into a numeric ID. When a
   * name is supplied, resolves it via an OData lookup on the folder-scoped
   * Buckets collection. Callers pass the folder scope so name lookups run in
   * the same folder used for the subsequent file operation.
   */
  private async coerceBucketId(
    bucket: number | string,
    folder: { folderId?: number; folderKey?: string; folderPath?: string },
    callerLabel: string,
  ): Promise<number> {
    if (bucket === null || bucket === undefined) {
      throw new ValidationError({ message: `bucket is required for ${callerLabel}` });
    }
    if (typeof bucket === 'number') {
      if (!Number.isFinite(bucket) || bucket <= 0) {
        throw new ValidationError({
          message: `bucket must be a positive numeric Id for ${callerLabel} (got ${bucket})`,
        });
      }
      return bucket;
    }
    return this.resolveIdByName(
      'Bucket',
      BUCKET_ENDPOINTS.GET_BY_FOLDER,
      bucket,
      folder,
      callerLabel,
    );
  }
}
