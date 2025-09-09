import { BucketGetAllOptions, BucketGetByIdOptions, BucketGetResponse, BucketGetFileMetaDataWithPaginationOptions, BucketGetFileMetaDataResponse, BucketGetReadUriOptions, BucketGetUriResponse, BucketUploadFileOptions, BucketUploadResponse, BlobItem } from './bucket.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Bucket service model interface
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
   * @returns Promise resolving to NonPaginatedResponse or a paginated result
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
   * @returns Promise resolving to the file metadata in the bucket or paginated result
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
   */
  getReadUri(options: BucketGetReadUriOptions): Promise<BucketGetUriResponse>;
  
  /**
   * Uploads a file to a bucket
   * 
   * @param options - Options for file upload including bucket ID, folder ID, path, content, and optional parameters
   * @returns Promise resolving to a response with success status and HTTP status code
   */
  uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
} 