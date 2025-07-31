import { BucketGetAllOptions, BucketGetByIdOptions, BucketGetResponse } from './bucket.types';

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
} 