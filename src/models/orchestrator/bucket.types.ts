import { BaseOptions, RequestOptions } from "../common/common-types";

export enum BucketOptions {
  None = 'None',
  ReadOnly = 'ReadOnly',
  AuditReadAccess = 'AuditReadAccess',
  AccessDataThroughOrchestrator = 'AccessDataThroughOrchestrator'
}

export interface BucketGetResponse {
  id: number;
  name: string;
  description: string | null;
  identifier: string;
  storageProvider: string | null;
  storageParameters: string | null;
  storageContainer: string | null;
  options: BucketOptions;
  credentialStoreId: number | null;
  externalName: string | null;
  password: string | null;
  foldersCount: number;
}

export interface BucketGetAllOptions extends RequestOptions {
  folderId?: number;
}

export type BucketGetByIdOptions = BaseOptions

/**
 * Maps header names to their values
 * 
 * @example
 * ```typescript
 * {
 *   "x-ms-blob-type": "BlockBlob"
 * }
 * ```
 */
export type ResponseDictionary = Record<string, string>;

/**
 * Response from the GetReadUri API
 */
export interface BucketGetUriResponse {
  /**
   * The URI for accessing the blob file
   */
  uri: string;
  
  /**
   * HTTP method to use with the URI
   */
  method: string;
  
  /**
   * Whether authentication is required to access the URI
   */
  requiresAuth: boolean;
  
  /**
   * Headers to be included in the request
   */
  headers: ResponseDictionary;
}

export interface BucketGetUriOptions extends BaseOptions {
  /**
   * The ID of the bucket
   */
  bucketId: number;

  /**
   * The ID of the folder
   */
  folderId: number;

  /**
   * The full path to the BlobFile
   */
  path: string;

  /**
   * URL expiration time in minutes (0 for default)
   */
  expiryInMinutes?: number;
}

/**
 * Request options for getting a read URI for a file in a bucket
 */
export type BucketGetReadUriOptions = BucketGetUriOptions;

/**
 * Request options for getting a write URI for a file in a bucket
 */
export interface BucketGetWriteUriOptions extends BucketGetUriOptions {
  /**
   * ContentType for S3 access policy
   */
  contentType?: string;
}

/**
 * Request options for getting files in a bucket
 */
export interface BucketGetFileMetaDataOptions {
  /**
   * The path prefix to filter files by
   */
  prefix?: string;
  
  /**
   * The minimum number of files to return in the response.
   * Default value is 500, maximum is 1000.
   */
  limit?: number;
  
  /**
   * A token indicating where to resume listing files. Used for pagination.
   */
  continuationToken?: string;
  
  /**
   * The number of minutes before the generated access URL expires.
   * If not provided, the access url will not be returned.
   */
  expiryInMinutes?: number;
}

/**
 * Response from the GetFiles API
 */
export interface BucketGetFileMetaDataResponse {
  /**
   * Array of blob items in the bucket
   */
  blobItems: BlobItem[];
  
  /**
   * Token for retrieving the next set of results
   */
  continuationToken: string | null;
}

/**
 * Represents a file or blob in a bucket
 */
export interface BlobItem {
  /**
   * Full path to the blob
   */
  path: string;
  
  /**
   * Content type of the blob
   */
  contentType: string;
  
  /**
   * Size of the blob in bytes
   */
  size: number;
  
  /**
   * Last modified timestamp
   */
  lastModified: string | null;
}
