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
 * Response dictionary structure used by UiPath APIs
 */
export interface ResponseDictionary {
  /**
   * Array of dictionary keys
   */
  keys: string[];
  
  /**
   * Array of dictionary values corresponding to the keys array
   */
  values: string[];
}

/**
 * Response from the GetReadUri API
 */
export interface BlobGetUriResponse {
  /**
   * The URI for accessing the blob file
   */
  uri: string;
  
  /**
   * HTTP verb to use with the URI
   */
  verb: string;
  
  /**
   * Whether authentication is required to access the URI
   */
  requiresAuth: boolean;
  
  /**
   * Headers to be included in the request
   */
  headers: ResponseDictionary;
}

export interface GetUriOptions extends BaseOptions {
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
export type GetReadUriOptions = GetUriOptions;

/**
 * Request options for getting a write URI for a file in a bucket
 */
export interface GetWriteUriOptions extends GetUriOptions {
  /**
   * ContentType for S3 access policy
   */
  contentType?: string;
}

/**
 * Request options for getting files in a bucket
 */
export interface BucketGetFilesOptions {
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
export interface BucketGetFilesResponse {
  /**
   * Array of blob items in the bucket
   */
  items: BlobItem[];
  
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
  fullPath: string;
  
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
