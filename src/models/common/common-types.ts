export interface CollectionResponse<T> {
  value: T[];
  totalRecordCount?: number;
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
  count?: boolean;
}

/**
 * Standard pagination options for OData-style pagination
 */
export interface ODataPaginationOptions extends RequestOptions {
  /**
   * Maximum number of items to return (max 1000)
   */
  top?: number;
  
  /**
   * Number of items to skip
   */
  skip?: number;
  
  /**
   * Whether to include total count in the response
   */
  includeCount?: boolean;
}

/**
 * Standard pagination options for Entity-style pagination
 */
export interface EntityPaginationOptions extends RequestOptions {
  /**
   * Maximum number of items to return
   */
  limit?: number;
  
  /**
   * Starting index for pagination
   */
  start?: number;
}

/**
 * Standard pagination options for token-based pagination
 */
export interface TokenPaginationOptions extends RequestOptions {
  /**
   * Minimum number of items to return (hint)
   */
  takeHint?: number;
  
  /**
   * Token for continuing pagination
   */
  continuationToken?: string;
}
