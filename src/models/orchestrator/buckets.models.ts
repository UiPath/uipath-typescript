import { BucketGetAllOptions, BucketGetByIdOptions, BucketGetByNameOptions, BucketGetResponse, BucketGetFileMetaDataWithPaginationOptions, BucketGetReadUriOptions, BucketGetReadUriRequestOptions, BucketGetUriResponse, BucketUploadFileOptions, BucketUploadFileRequestOptions, BucketUploadResponse, BlobItem, BucketGetFilesOptions, BucketFile, BucketDeleteFileOptions } from './buckets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath storage Buckets.
 *
 * Buckets are cloud storage containers that can be used to store and manage files used by automation processes. [UiPath Buckets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-storage-buckets)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Buckets } from '@uipath/uipath-typescript/buckets';
 *
 * const buckets = new Buckets(sdk);
 * const allBuckets = await buckets.getAll();
 * ```
 */
export interface BucketServiceModel {
  /**
   * Gets all buckets across folders, or scoped to a specific folder when
   * folder context is provided.
   *
   * Folder scoping is optional and can be supplied as `folderId`, `folderKey`,
   * or `folderPath` in the options. When none of them is provided the request
   * is a cross-folder query. Unlike file-operation methods, `getAll()` does
   * **not** fall back to the SDK's init-time folder key — no folder in options
   * always means cross-folder.
   *
   * The method returns either:
   * - A NonPaginatedResponse with data and totalCount (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   *
   * @param options - Optional folder scoping (`folderId` / `folderKey` / `folderPath`), OData query options, and pagination options
   * @returns Promise resolving to either an array of buckets NonPaginatedResponse<BucketGetResponse> or a PaginatedResponse<BucketGetResponse> when pagination options are used.
   * {@link BucketGetResponse}
   * @example
   * ```typescript
   * // Cross-folder — every bucket the caller can see
   * const allBuckets = await buckets.getAll();
   *
   * // Scoped by folder ID
   * const folderBuckets = await buckets.getAll({ folderId: <folderId> });
   *
   * // Scoped by folder key (GUID)
   * await buckets.getAll({ folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // Scoped by folder path
   * await buckets.getAll({ folderPath: 'Shared/Finance' });
   *
   * // Filtering
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
  getAll<T extends BucketGetAllOptions = BucketGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketGetResponse>
      : NonPaginatedResponse<BucketGetResponse>
  >;

  /**
   * Gets a single bucket by ID
   * 
   * @param bucketId - Bucket ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters
   * @returns Promise resolving to a bucket definition
   * {@link BucketGetResponse}
   * @example
   * ```typescript
   * // Get bucket by ID
   * const bucket = await buckets.getById(<bucketId>, <folderId>);
   * ```
   */
  getById(bucketId: number, folderId: number, options?: BucketGetByIdOptions): Promise<BucketGetResponse>;

  /**
   * Retrieves a single orchestrator storage bucket by name.
   *
   * @param name - Bucket name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single bucket
   * {@link BucketGetResponse}
   * @example
   * ```typescript
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
  getByName(name: string, options?: BucketGetByNameOptions): Promise<BucketGetResponse>;

  /**
   * Gets metadata for files in a bucket with optional filtering and pagination.
   *
   * Accepts either a numeric bucket `Id` or a bucket `Name`. When a name is
   * supplied, the bucket is resolved within the folder scope provided in
   * `options` — the name lookup runs in the same folder used for the
   * subsequent file listing.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * inside the options.
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for filtering and pagination
   * @returns Promise resolving to either an array of files metadata NonPaginatedResponse<BlobItem> or a PaginatedResponse<BlobItem> when pagination options are used.
   * {@link BlobItem}
   * @example
   * ```typescript
   * // By bucket ID
   * const fileMetadata = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId> });
   *
   * // By bucket name
   * await buckets.getFileMetaData('MyBucket', { folderId: <folderId> });
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
    bucket: number | string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;
  /**
   * Gets metadata for files in a bucket — positional `folderId` form.
   *
   * @deprecated Use the options-object form: `getFileMetaData(bucket, { folderId })`. See {@link BucketGetFileMetaDataWithPaginationOptions} for the supported options.
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param folderId - Required folder ID (numeric)
   * @param options - Optional parameters for filtering and pagination
   * @returns Promise resolving to either an array of files metadata NonPaginatedResponse<BlobItem> or a PaginatedResponse<BlobItem> when pagination options are used.
   * {@link BlobItem}
   */
  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucket: number | string,
    folderId: number,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;

  /**
   * Gets a direct download URL for a file in the bucket.
   *
   * Accepts either a numeric bucket `Id` or a bucket `Name`. When a name is
   * supplied, the bucket is resolved within the folder scope provided in
   * `options`.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * in the options.
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param path - The full path to the file
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional `expiryInMinutes`
   * @returns Promise resolving to blob file access information
   * {@link BucketGetUriResponse}
   * @example
   * ```typescript
   * // By bucket ID
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });
   *
   * // By bucket name
   * await buckets.getReadUri('MyBucket', '/folder/file.pdf', { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderPath: 'Shared/Finance' });
   * ```
   */
  getReadUri(
    bucket: number | string,
    path: string,
    options?: BucketGetReadUriRequestOptions,
  ): Promise<BucketGetUriResponse>;
  /**
   * Gets a direct download URL for a file in the bucket — options-only form.
   *
   * @deprecated Use the positional form: `getReadUri(bucket, path, options?)`. See {@link BucketGetReadUriRequestOptions} for the supported options.
   *
   * @param options - Contains bucketId, folder scoping (`folderId` / `folderKey` / `folderPath`), file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * {@link BucketGetUriResponse}
   */
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;

  /**
   * Uploads a file to a bucket.
   *
   * Accepts either a numeric bucket `Id` or a bucket `Name`. When a name is
   * supplied, the bucket is resolved within the folder scope provided in
   * `options`.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * in the options.
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param path - Path where the file should be stored in the bucket
   * @param content - File content to upload
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving bucket upload response
   * {@link BucketUploadResponse}
   * @example
   * ```typescript
   * // By bucket ID
   * const file = new File(['file content'], 'example.txt');
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderId: <folderId> });
   *
   * // By bucket name
   * await buckets.uploadFile('MyBucket', '/folder/example.txt', file, { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderPath: 'Shared/Finance' });
   *
   * // In Node env with Uint8Array or Buffer
   * const content = new TextEncoder().encode('file content');
   * await buckets.uploadFile(<bucketId>, '/folder/example.txt', content, { folderId: <folderId> });
   * ```
   */
  uploadFile(
    bucket: number | string,
    path: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: BucketUploadFileRequestOptions,
  ): Promise<BucketUploadResponse>;
  /**
   * Uploads a file to a bucket — options-only form.
   *
   * @deprecated Use the positional form: `uploadFile(bucket, path, content, options?)`. See {@link BucketUploadFileRequestOptions} for the supported options.
   *
   * @param options - Options for file upload including bucket ID, folder scoping (`folderId` / `folderKey` / `folderPath`), path, and content
   * @returns Promise resolving bucket upload response
   * {@link BucketUploadResponse}
   */
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;

  /**
   * Deletes a file from a bucket
   *
   * Accepts either a numeric bucket `Id` or a bucket `Name`. When a name is
   * supplied, the bucket is resolved within the folder scope provided in
   * `options`.
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param path - The full path to the file to delete
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving when the file is deleted
   * @example
   * ```typescript
   * // By bucket ID
   * await buckets.deleteFile(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });
   *
   * // By bucket name
   * await buckets.deleteFile('MyBucket', '/folder/file.pdf', { folderId: <folderId> });
   * ```
   */
  deleteFile(bucket: number | string, path: string, options?: BucketDeleteFileOptions): Promise<void>;

  /**
   * Lists all files in a bucket.
   *
   * Accepts either a numeric bucket `Id` or a bucket `Name`. When a name is
   * supplied, the bucket is resolved within the folder scope provided in
   * `options`.
   *
   * Returns a flat, recursive listing of all files in the bucket. Supports regex filtering
   * and filter / orderby / select / expand. {@link BucketFile} entries include
   * `isDirectory` so callers can distinguish folders from files.
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param bucket - The bucket's numeric ID or its name
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for regex filtering, query options, and pagination
   * {@link BucketGetFilesOptions}
   * @returns Promise resolving to either an array of files NonPaginatedResponse<BucketFile> or a PaginatedResponse<BucketFile> when pagination options are used.
   * {@link BucketFile}
   * @example
   * ```typescript
   * // By bucket ID
   * const files = await buckets.getFiles(<bucketId>, { folderId: <folderId> });
   *
   * // By bucket name
   * const filesByName = await buckets.getFiles('MyBucket', { folderId: <folderId> });
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
  getFiles<T extends BucketGetFilesOptions = BucketGetFilesOptions>(
    bucket: number | string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BucketFile>
      : NonPaginatedResponse<BucketFile>
  >;
}

