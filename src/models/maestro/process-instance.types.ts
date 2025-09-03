/**
 * Process Instance Types
 * Types and interfaces for Maestro process instance management
 */

import { PaginationOptions } from "../../utils/pagination";

/**
 * Response for getting a single process instance
 */
export interface RawProcessInstanceGetResponse {
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
  startedByUser: string;
  source: string;
  creatorUserKey: string;
  startedTime: string;
  completedTime: string | null;
  instanceRuns: ProcessInstanceRun[];
}


/**
 * Query options for getting process instances
 */
export interface ProcessInstanceGetAllOptions {
  packageId?: string;
  packageVersion?: string;
  processKey?: string;
  errorCode?: string;
}

/**
 * Query options for getting process instances with pagination support
 */
export type ProcessInstanceGetAllWithPaginationOptions = ProcessInstanceGetAllOptions & PaginationOptions;

/**
 * Request for process instance operations (cancel, pause, resume)
 */
export interface ProcessInstanceOperationOptions {
  comment?: string;
}

/**
 * Response for process instance execution history
 */
export interface ProcessInstanceExecutionHistoryResponse {
  id: string;
  traceId: string;
  parentId: string | null;
  name: string;
  startedTime: string;
  endTime: string | null;
  attributes: string | null;
  createdTime: string;
  updatedTime?: string;
  expiredTime: string | null;
  // TO Do: Add status and attributes interface
}

/**
 * Process Instance run
 */
export interface ProcessInstanceRun {
  runId: string;
  status: string;
  startedTime: string;
  completedTime: string;
}

export type BpmnXmlString = string;