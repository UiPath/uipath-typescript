export interface CollectionResponse<T> {
  value: T[];
}

/**
 * Standardized result interface for all action methods (pause, cancel, complete, update, upload, etc.)
 * Success responses include data from the request context or API response
 */
export interface OperationResponse<TData> {
  /**
   * Whether the action was successful
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