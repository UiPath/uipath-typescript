/**
 * Case Instance Types
 * Types and interfaces for Maestro case instance management
 */

import { PaginationOptions } from "../../utils/pagination";

/**
 * Response for getting a single case instance
 */
export interface RawCaseInstanceGetResponse {
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
  completedTime: string;
  instanceRuns: CaseInstanceRun[];
  // Properties from case JSON
  caseAppConfig?: CaseAppConfig;
  caseType?: string;
  caseTitle?: string;
}

/**
 * Case instance run information
 */
export interface CaseInstanceRun {
  runId: string;
  status: string;
  startedTime: string;
  completedTime: string;
}

/**
 * Query options for getting case instances
 */
export interface CaseInstanceGetAllOptions {
  packageId?: string;
  packageVersion?: string;
  processKey?: string;
  errorCode?: string;
}

/**
 * Query options for getting case instances with pagination support
 */
export type CaseInstanceGetAllWithPaginationOptions = CaseInstanceGetAllOptions & PaginationOptions;

/**
 * Request for case instance operations (close, pause, resume)
 */
export interface CaseInstanceOperationOptions {
  comment?: string;
}

/**
 * Response for case instance operations (close, pause, resume)
 */
export interface CaseInstanceOperationResponse {
  instanceId: string;
  status: string;
}

/**
 * Case App Configuration Overview
 */
export interface CaseAppOverview {
  title: string;
  details: string;
}

/**
 * Case App Configuration from case JSON
 */
export interface CaseAppConfig {
  caseSummary?: string;
  overview?: CaseAppOverview[];
}