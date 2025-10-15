import { BucketGetAllOptions, BucketGetByIdOptions, BucketGetResponse, BucketGetFileMetaDataWithPaginationOptions, BucketGetReadUriOptions, BucketGetUriResponse, BucketUploadFileOptions, BucketUploadResponse, BlobItem } from './buckets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath storage Buckets.
 * 
 * Buckets are cloud storage containers that can be used to store and manage files used by automation processes. [UiPath Buckets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-storage-buckets)
 */
export interface BucketServiceModel {
  /**
   * Gets all buckets across folders with optional filtering
   * 
   * The method returns either:
   * - A NonPaginatedResponse with data and totalCount (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of buckets NonPaginatedResponse<BucketGetResponse> or a PaginatedResponse<BucketGetResponse> when pagination options are used.
   * {@link BucketGetResponse}
   * @example
   * ```typescript
   * // Get all buckets across folders
   * const buckets = await sdk.buckets.getAll();
   * 
   * // Get buckets within a specific folder
   * const buckets = await sdk.buckets.getAll({ 
   *   folderId: <folderId>
   * });
   * 
   * // Get buckets with filtering
   * const buckets = await sdk.buckets.getAll({ 
   *   filter: "name eq 'MyBucket'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.buckets.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.buckets.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.buckets.getAll({
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
   * const bucket = await sdk.buckets.getById(<bucketId>, <folderId>);
   * ```
   */
  getById(bucketId: number, folderId: number, options?: BucketGetByIdOptions): Promise<BucketGetResponse>;

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
   * @returns Promise resolving to either an array of files metadata NonPaginatedResponse<BlobItem> or a PaginatedResponse<BlobItem> when pagination options are used.
   * {@link BlobItem}
   * @example
   * ```typescript
   * // Get metadata for all files in a bucket
   * const fileMetadata = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>);
   * 
   * // Get file metadata with a specific prefix
   * const fileMetadata = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, {
   *   prefix: '/folder1'
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, { pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, { cursor: page1.nextCursor });
   * }
   * ```
   */
  getFileMetaData<T extends BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataWithPaginationOptions>(
    bucketId: number, 
    folderId: number, 
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<BlobItem>
      : NonPaginatedResponse<BlobItem>
  >;

  /**
   * Gets a direct download URL for a file in the bucket
   * 
   * @param options - Contains bucketId, folderId, file path and optional expiry time
   * @returns Promise resolving to blob file access information
   * {@link BucketGetUriResponse}
   * @example
   * ```typescript
   * // Get download URL for a file
   * const fileAccess = await sdk.buckets.getReadUri({
   *   bucketId: <bucketId>, 
   *   folderId: <folderId>,
   *   path: '/folder/file.pdf'
   * });
   * ```
   */
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;
  
  /**
   * Uploads a file to a bucket
   * 
   * @param options - Options for file upload including bucket ID, folder ID, path, content, and optional parameters
   * @returns Promise resolving bucket upload response
   * {@link BucketUploadResponse}
   * @example
   * ```typescript
   * // Upload a file from browser
   * const file = new File(['file content'], 'example.txt');
   * const result = await sdk.buckets.uploadFile({
   *   bucketId: <bucketId>,
   *   folderId: <folderId>, 
   *   path: '/folder/example.txt',
   *   content: file
   * });
   * 
   * // In Node env with Buffer
   * const buffer = Buffer.from('file content');
   * const result = await sdk.buckets.uploadFile({
   *   bucketId: <bucketId>,
   *   folderId: <folderId>,
   *   path: '/folder/example.txt',
   *   content: buffer,
   * });
   * ```
   */
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
} 