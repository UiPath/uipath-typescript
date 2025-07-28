/**
 * Maestro Process Types
 * Types and interfaces for Maestro process management
 */

/**
 * Process information with instance statistics
 */
export interface MaestroProcessGetAllResponse {
  /** Unique key identifying the process */
  processKey: string;
  /** Package identifier */
  packageId: string;
  /** Folder key where process is located */
  folderKey: string;
  /** Folder name */
  folderName: string;
  /** Available package versions */
  packageVersions: string[];
  /** Total number of versions */
  versionCount: number;
  /** Process instance counts by status */
  instanceCounts: {
    pending: number;
    running: number;
    completed: number;
    paused: number;
    cancelled: number;
    faulted: number;
    retrying: number;
    resuming: number;
    pausing: number;
    canceling: number;
  };
}

/**
 * Raw process data from API
 */
export interface RawProcessData {
  processKey: string;
  packageId: string;
  folderKey: string;
  folderName: string;
  packageVersions: string[];
  versionCount: number;
  pendingCount: number;
  runningCount: number;
  completedCount: number;
  pausedCount: number;
  cancelledCount: number;
  faultedCount: number;
  retryingCount: number;
  resumingCount: number;
  pausingCount: number;
  cancelingCount: number;
}

/**
 * Raw API response for get all processes
 * @internal
 */
export interface RawMaestroProcessGetAllResponse {
  processes: RawProcessData[];
}

/**
 * Problem details for error responses
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

/**
 * Enum for extracted value types in BPMN
 */
export enum ExtractedValueType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Object = 'Object',
  Array = 'Array'
}

/**
 * BPMN variable tag type
 */
export interface BpmnVariableTagType {
  name: string;
  value: string;
}

/**
 * BPMN output tags
 */
export interface BpmnOutputTags {
  tags: BpmnVariableTagType[] | null;
  name: string | null;
  extractPath: string | null;
  label: string | null;
  extractedValueType: ExtractedValueType;
}

/**
 * BPMN element tags
 */
export interface BpmnElementTags {
  outputs: BpmnOutputTags[] | null;
}

/**
 * BPMN process variable tags
 */
export interface BpmnProcessVariableTags {
  elements: { [key: string]: BpmnElementTags } | null;
  sourcePackageVersion: string | null;
  lastUpdateTimeUtc: string;
}

/**
 * Process settings response
 */
export interface MaestroProcessSettingsResponse {
  variableTags: BpmnProcessVariableTags;
}