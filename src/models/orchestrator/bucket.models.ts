import { BucketGetAllOptions, BucketGetByIdOptions, BucketGetResponse, BucketGetFilesOptions, BucketGetFilesResponse, BlobGetUriResponse, GetReadUriOptions, GetWriteUriOptions } from './bucket.types';

/**
 * Bucket service model interface
 */
export interface BucketServiceModel {
  /**
   * Gets all buckets across folders with optional filtering
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of buckets
   */
  getAll(options?: BucketGetAllOptions): Promise<BucketGetResponse[]>;

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
   * Gets files from a bucket with optional filtering and pagination
   * 
   * @param bucketId - The ID of the bucket to get files from
   * @param folderId - Required folder ID for organization unit context
   * @param options - Optional parameters for filtering, pagination and access URL generation
   * @returns Promise resolving to the files in the bucket
   */
  getFiles(bucketId: number, folderId: number, options?: BucketGetFilesOptions): Promise<BucketGetFilesResponse>;

  /**
   * Gets a direct download URL for a file in the bucket
   * 
   * @param bucketId - The ID of the bucket containing the file
   * @param folderId - Required folder ID for organization unit context
   * @param options - Required file path and optional expiry time
   * @returns Promise resolving to blob file access information
   */
  getReadUri(bucketId: number, folderId: number, options: GetReadUriOptions): Promise<BlobGetUriResponse>;
  
  /**
   * Gets a direct upload URL for a file in the bucket
   * 
   * @param bucketId - The ID of the bucket for the file upload
   * @param folderId - Required folder ID for organization unit context
   * @param options - Required file path, optional expiry time and content type
   * @returns Promise resolving to blob file access information
   */
  getWriteUri(bucketId: number, folderId: number, options: GetWriteUriOptions): Promise<BlobGetUriResponse>;
} 