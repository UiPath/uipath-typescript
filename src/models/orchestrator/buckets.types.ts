import { BaseOptions, FolderScopedOptions, RequestOptions } from "../common/types";
import { PaginationOptions } from "../../utils/pagination";

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

export type BucketGetAllOptions = RequestOptions & PaginationOptions & {
  folderId?: number;
}

export interface BucketGetByIdOptions extends BaseOptions {}

/**
 * Options for getting a single bucket by name
 */
export interface BucketGetByNameOptions extends FolderScopedOptions {}

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
  httpMethod: string;
  
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
   * The full path to the BlobFile
   */
  path: string;

  /**
   * URL expiration time in minutes (0 for default)
   */
  expiryInMinutes?: number;
}

/**
 * Optional parameters for the preferred `getReadUri(bucketId, path, options?)` form.
 * Contains folder scoping (`folderId` / `folderKey` / `folderPath`),
 * `expiryInMinutes`, and standard query options (`expand`, `select`).
 */
export interface BucketGetReadUriRequestOptions extends BaseOptions, FolderScopedOptions {
  /**
   * URL expiration time in minutes (0 for default)
   */
  expiryInMinutes?: number;
}

/**
 * @deprecated Use the positional form: `getReadUri(bucketId, path, options?)`.
 * See {@link BucketGetReadUriRequestOptions} for the supported options.
 *
 * Request options for getting a read URI for a file in a bucket.
 */
export interface BucketGetReadUriOptions extends BucketGetUriOptions, FolderScopedOptions {}

/**
 * Request options for getting files in a bucket
 */
export interface BucketGetFileMetaDataOptions {
  /**
   * The path prefix to filter files by
   */
  prefix?: string;
}

/**
 * Request options for getting files in a bucket with pagination support
 */
export type BucketGetFileMetaDataWithPaginationOptions = BucketGetFileMetaDataOptions & PaginationOptions & FolderScopedOptions;

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

/**
 * Represents a file or directory entry in a bucket
 */
export interface BucketFile {
  /**
   * Full path to the file or directory
   */
  path: string;

  /**
   * Content type of the file (empty for directories)
   */
  contentType: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * Whether the entry is a directory
   */
  isDirectory: boolean;

  /**
   * Identifier of the file, when available
   */
  id: string | null;
}

/**
 * Options for listing files in a bucket directory
 */
export type BucketGetFilesOptions = RequestOptions & PaginationOptions & FolderScopedOptions & {
  /**
   * Regex pattern to filter file names (e.g., '.*\\.pdf$')
   */
  fileNameRegex?: string;
};

/**
 * Options for deleting a file from a bucket
 */
export interface BucketDeleteFileOptions extends FolderScopedOptions {}

/**
 * Optional parameters for the preferred
 * `uploadFile(bucketId, path, content, options?)` form. Contains folder
 * scoping (`folderId` / `folderKey` / `folderPath`).
 */
export interface BucketUploadFileRequestOptions extends FolderScopedOptions {}

/**
 * @deprecated Use the positional form: `uploadFile(bucketId, path, content, options?)`.
 * See {@link BucketUploadFileRequestOptions} for the supported options.
 *
 * Options for uploading files to a bucket.
 */
export interface BucketUploadFileOptions extends FolderScopedOptions {
  /**
   * The ID of the bucket to upload to
   */
  bucketId: number;

  /**
   * Path where the file should be stored in the bucket
   */
  path: string;

  /**
   * File content to upload
   */
  content: Blob | Uint8Array<ArrayBuffer> | File;
}

/**
 * Response from file upload operations
 */
export interface BucketUploadResponse {
  /**
   * Whether the upload was successful
   */
  success: boolean;
  
  /**
   * HTTP status code from the upload operation
   */
  statusCode: number;
}
