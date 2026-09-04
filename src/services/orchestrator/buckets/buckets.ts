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
  BucketRef,
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
import type { EffectiveFolder } from '../../../utils/validation/resolve-ref';

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
    const { result } = await this.getByNameLookup<BucketGetResponse, BucketGetResponse>(
      'Bucket',
      BUCKET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => pascalToCamelCaseKeys(raw) as BucketGetResponse,
    );
    return result;
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

  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
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
    bucketIdOrRef: number | BucketRef,
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
      // Deprecated positional form: getFileMetaData(bucketId, folderId, options?)
      folderId = optionsOrFolderId;
      restOptions = (legacyOptions ?? {}) as Omit<T, 'folderId' | 'folderKey' | 'folderPath'>;
    } else {
      // Preferred form: getFileMetaData(bucketRef, options?)
      const opts = optionsOrFolderId ?? ({} as T);
      ({ folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const { id: bucketId, effectiveFolder } = await this.resolveBucketRef(
      bucketIdOrRef,
      { folderId, folderKey, folderPath },
      'Buckets.getFileMetaData',
    );

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getFileMetaData' });
    }

    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? folderId,
      folderKey: effectiveFolder.folderKey ?? folderKey,
      folderPath: effectiveFolder.folderPath ?? folderPath,
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
    bucketRef: BucketRef,
    path: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse>;
  uploadFile(
    bucketId: number,
    path: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse>;
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
  @track('Buckets.UploadFile')
  async uploadFile(
    firstArg: number | BucketRef | BucketUploadFileOptions,
    path?: string,
    content?: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse> {
    // Discriminate the three overload forms.
    let bucketIdOrRef: number | BucketRef;
    let resolvedPath: string;
    let resolvedContent: Blob | Uint8Array<ArrayBuffer> | File;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;

    const isDeprecatedOptionsForm =
      firstArg !== null &&
      typeof firstArg === 'object' &&
      'bucketId' in (firstArg as Record<string, unknown>);

    if (isDeprecatedOptionsForm) {
      // Deprecated options-only form: uploadFile({ bucketId, path, content, ... })
      const opts = firstArg as BucketUploadFileOptions;
      bucketIdOrRef = opts.bucketId;
      resolvedPath = opts.path;
      resolvedContent = opts.content;
      folderId = opts.folderId;
      folderKey = opts.folderKey;
      folderPath = opts.folderPath;
    } else {
      // Positional form: uploadFile(bucketRef | bucketId, path, content, options?)
      bucketIdOrRef = firstArg as number | BucketRef;
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

    const { id: bucketId, effectiveFolder } = await this.resolveBucketRef(
      bucketIdOrRef,
      { folderId, folderKey, folderPath },
      'Buckets.uploadFile',
    );

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for uploadFile' });
    }

    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? folderId,
      folderKey: effectiveFolder.folderKey ?? folderKey,
      folderPath: effectiveFolder.folderPath ?? folderPath,
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
    bucketRef: BucketRef,
    path: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse>;
  getReadUri(
    bucketId: number,
    path: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse>;
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;
  @track('Buckets.GetReadUri')
  async getReadUri(
    firstArg: number | BucketRef | BucketGetReadUriOptions,
    path?: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse> {
    // Discriminate the three overload forms.
    let bucketIdOrRef: number | BucketRef;
    let resolvedPath: string;
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let expiryInMinutes: number | undefined;
    let restOptions: Record<string, unknown>;

    const isDeprecatedOptionsForm =
      firstArg !== null &&
      typeof firstArg === 'object' &&
      'bucketId' in (firstArg as Record<string, unknown>);

    if (isDeprecatedOptionsForm) {
      // Deprecated options-only form: getReadUri({ bucketId, path, ... })
      const opts = firstArg as BucketGetReadUriOptions;
      const { bucketId: bid, path: p, expiryInMinutes: e, folderId: fid, folderKey: fkey, folderPath: fpath, ...rest } = opts;
      bucketIdOrRef = bid;
      resolvedPath = p;
      expiryInMinutes = e;
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      restOptions = rest;
    } else {
      // Positional form: getReadUri(bucketRef | bucketId, path, options?)
      bucketIdOrRef = firstArg as number | BucketRef;
      resolvedPath = path as string;
      const opts = options ?? ({} as BucketGetReadUriRequestOptions);
      ({ expiryInMinutes, folderId, folderKey, folderPath, ...restOptions } = opts);
    }

    const { id: bucketId, effectiveFolder } = await this.resolveBucketRef(
      bucketIdOrRef,
      { folderId, folderKey, folderPath },
      'Buckets.getReadUri',
    );

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getReadUri' });
    }

    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? folderId,
      folderKey: effectiveFolder.folderKey ?? folderKey,
      folderPath: effectiveFolder.folderPath ?? folderPath,
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
    bucketIdOrRef: number | BucketRef,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketFile>
      : NonPaginatedResponse<BucketFile>
  > {
    const { folderId, folderKey, folderPath, ...restOptions } = options ?? {} as BucketGetFilesOptions;

    const { id: bucketId, effectiveFolder } = await this.resolveBucketRef(
      bucketIdOrRef,
      { folderId, folderKey, folderPath },
      'Buckets.getFiles',
    );

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for getFiles' });
    }

    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? folderId,
      folderKey: effectiveFolder.folderKey ?? folderKey,
      folderPath: effectiveFolder.folderPath ?? folderPath,
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
  async deleteFile(bucketIdOrRef: number | BucketRef, path: string, options?: BucketDeleteFileOptions): Promise<void> {
    if (!path) {
      throw new ValidationError({ message: 'path is required for deleteFile' });
    }

    const { id: bucketId, effectiveFolder } = await this.resolveBucketRef(
      bucketIdOrRef,
      { folderId: options?.folderId, folderKey: options?.folderKey, folderPath: options?.folderPath },
      'Buckets.deleteFile',
    );

    if (!bucketId) {
      throw new ValidationError({ message: 'bucketId is required for deleteFile' });
    }

    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? options?.folderId,
      folderKey: effectiveFolder.folderKey ?? options?.folderKey,
      folderPath: effectiveFolder.folderPath ?? options?.folderPath,
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
   * Resolves a `BucketRef | number` first-arg into a numeric bucket id, applying runtime
   * overrides on the `{ name }` branch via `getByNameLookup`. Callers pass their folder scope
   * so the internal name-lookup routes to the same folder as the follow-up file op.
   *
   * Numeric `bucketId` inputs pass through unchanged. Returns the effective folder from the
   * lookup so callers can propagate any override-driven redirect to the file-op header block.
   */
  private async resolveBucketRef(
    bucketIdOrRef: number | BucketRef | undefined,
    folderScope: { folderId?: number; folderKey?: string; folderPath?: string },
    callerLabel: string,
  ): Promise<{ id: number; effectiveFolder: EffectiveFolder }> {
    // Numeric (including 0 / undefined / null) — pass through so the downstream
    // `if (!bucketId)` guard in each file op emits its own tailored message.
    if (bucketIdOrRef == null || typeof bucketIdOrRef === 'number') {
      return { id: (bucketIdOrRef ?? 0) as number, effectiveFolder: {} };
    }
    if ('id' in bucketIdOrRef && bucketIdOrRef.id != null) {
      return { id: bucketIdOrRef.id, effectiveFolder: {} };
    }
    if ('name' in bucketIdOrRef && bucketIdOrRef.name) {
      const { result, effectiveFolder } = await this.getByNameLookup<BucketGetResponse, BucketGetResponse>(
        'Bucket',
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        bucketIdOrRef.name,
        folderScope,
        (raw) => pascalToCamelCaseKeys(raw) as BucketGetResponse,
        undefined,
        callerLabel,
      );
      return { id: result.id, effectiveFolder };
    }
    throw new ValidationError({
      message: `${callerLabel}: bucketRef must supply exactly one of 'id' or 'name'.`,
    });
  }
}
