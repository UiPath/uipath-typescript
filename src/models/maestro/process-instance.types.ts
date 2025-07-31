/**
 * Process Instance Types
 * Types and interfaces for Maestro process instance management
 */

import { PaginationOptions } from '../common';

/**
 * Response for getting a single process instance
 */
export interface ProcessInstanceGetResponse {
  instanceId: string;
  packageKey: string;
  packageId: string;
  packageVersion: string;
  latestRunId: string;
  latestRunStatus: string;
  processKey: string;
  folderKey: string;
  userId: number;
  instanceDisplayName: string;
  source: string;
  creatorUserKey: string | null;
  startedTimeUtc: string;
  completedTimeUtc: string | null;
  instanceRuns: InstanceRun[];
}

/**
 * Response for getting all process instances
 */
export interface ProcessInstanceGetAllResponse {
  instances: ProcessInstanceGetResponse[];
  nextPage: string | null;
  hasMoreResults: boolean;
}


/**
 * Query options for getting process instances
 */
export interface ProcessInstanceGetAllOptions extends PaginationOptions {
  [key: string]: string | number | undefined;
  packageId?: string;
  packageVersion?: string;
  processKey?: string;
  processName?: string;
  errorCode?: string;
}

/**
 * Request for process instance operations (cancel, pause, resume)
 */
export interface ProcessInstanceOperationRequest {
  comment?: string | null;
}

/**
 * Response for process instance status
 */
export interface ProcessInstanceStatusResponse {
  instanceId: string | null;
  status: string | null;
}

/**
 * Process instance source enum
 */
export enum ProcessInstanceSource {
  One = '1',
  Two = '2'
}

/**
 * Process instance span status enum
 */
export enum ProcessInstanceExecutionStatus {
  Unset = 'Unset',
  Ok = 'Ok',
  Error = 'Error',
  Unspecified = 'Unspecified'
}

/**
 * Response for process instance execution history
 */
export interface ProcessInstanceExecutionHistoryResponse {
  id: string;
  traceId: string;
  parentId: string | null;
  name: string | null;
  startTime: string;
  endTime: string | null;
  attributes: string | null;
  status: ProcessInstanceExecutionStatus;
  createdAt?: string;
  updatedAt?: string;
  organizationId: string;
  tenantId: string | null;
  expiryTimeUtc: string | null;
  folderKey: string | null;
  source: ProcessInstanceSource;
}

/**
 * Instance run (placeholder for future implementation)
 */
export interface InstanceRun {
  runId: string;
  status: string;
  startedTimeUtc: string;
  completedTimeUtc: string;
  properties: Record<string, unknown>;
}
