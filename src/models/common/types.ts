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
 * Options that scope a name-based lookup (e.g. `getByName`) to a folder.
 * Provide `folderPath` or `folderKey`. When both are supplied, `folderPath`
 * wins.
 */
export interface FolderScopedOptions extends BaseOptions {
  /**
   * Slash-delimited folder path that scopes the lookup, e.g. `'Shared/Finance'`.
   * When both `folderPath` and `folderKey` are supplied, `folderPath` wins.
   */
  folderPath?: string;
  /**
   * Folder key (GUID) that scopes the lookup. When both `folderPath` and
   * `folderKey` are supplied, `folderPath` wins.
   */
  folderKey?: string;
}
