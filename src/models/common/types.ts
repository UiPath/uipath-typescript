export interface CollectionResponse<T> {
  value: T[];
}

/**
 * Standardized result interface for all operation methods (pause, cancel, complete, update, upload, etc.)
 * Success responses include data from the request context or API response
 */
export interface OperationResponse<TData> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Response data (can contain error details in case of failure)
   */
  data: TData;
}

/**
 * Common enum for job state used across services
 */
export enum JobState {
  Pending = 'Pending',
  Running = 'Running',
  Stopping = 'Stopping',
  Terminating = 'Terminating',
  Faulted = 'Faulted',
  Successful = 'Successful',
  Stopped = 'Stopped',
  Suspended = 'Suspended',
  Resumed = 'Resumed'
}

export interface BaseOptions {
  expand?: string;
  select?: string;
}

/**
 * Common request options interface used across services for querying data
 */
export interface RequestOptions extends BaseOptions {
  filter?: string;
  orderby?: string;
}

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