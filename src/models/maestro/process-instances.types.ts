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
 * Response from PIMS operations (cancel, pause, resume)
 */
export interface ProcessInstanceOperationResponse {
  instanceId: string;
  status: string;
}

/**
 * Response for process instance execution history
 */
export interface ProcessInstanceExecutionHistoryResponse {
  instanceId: string;
  processKey: string;
  packageKey: string;
  packageId: string;
  packageVersion: string;
  folderKey: string;
  instanceDisplayName: string;
  source: string;
  /** Instance status (e.g., "Completed", "Faulted", "Running", "Pausing", "Canceling") */
  status: string;
  creationUserKey: string | null;
  startedTime: string;
  completedTime: string | null;
  elementExecutions: ProcessElementExecutionMetadata[];
}

/**
 * Element execution metadata for process instances
 */
export interface ProcessElementExecutionMetadata {
  elementId: string;
  elementName: string;
  parentElementId: string | null;
  /** Element status (e.g., "Completed", "Faulted", "Running") */
  status: string;
  startedTime: string;
  completedTime: string | null;
  processKey: string;
  /** External reference link, eg link to the HITL task in Action Center */
  externalLink: string;
  elementRuns: ProcessElementRunMetadata[];
}

/**
 * Element run metadata for process instances
 */
export interface ProcessElementRunMetadata {
  status: string;
  startedTime: string;
  completedTime: string | null;
  elementRunId: string;
  parentElementRunId: string | null;
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

/**
 * Process Instance element metadata
 */
export interface ElementMetaData {
  elementId: string;
  elementRunId: string;
  isMarker: boolean;
  inputs: Record<string, any>;
  inputDefinitions: Record<string, any>;
  outputs: Record<string, any>;
}

/**
 * Process Instance global variable metadata
 */
export interface GlobalVariableMetaData {
  id: string;
  name: string;
  /** 
   * Common values: "integer", "string", "boolean"
   * May also contain custom types or "any" when type cannot be determined
   */
  type: string;
  elementId: string;
  /** Name of the BPMN node/element */
  source: string;
  value: any;
}

/**
 * Response for getting global variables for process instance
 */
export interface ProcessInstanceGetVariablesResponse {
  elements: ElementMetaData[];
  globalVariables: GlobalVariableMetaData[];
  instanceId: string;
  parentElementId: string | null;
}

/**
 * Options for getting global variables
 */
export interface ProcessInstanceGetVariablesOptions {
  parentElementId?: string;
}