import type { QueryParams } from './requestSpec';

export interface CollectionResponse<T> {
  value: T[];
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

/**
 * Common request options interface used across services for querying data
 */
export interface RequestOptions extends QueryParams {
  expand?: string;
  filter?: string;
  select?: string;
  orderby?: string;
  count?: boolean;
}
