/**
 * Internal types for process instances service
 * These types are used internally and not exposed in the public API
 */

/**
 * Interface for BPMN variable metadata extracted from BPMN XML
 * @internal
 */
export interface BpmnVariableMetadata {
  id: string;
  name: string;
  type: string;
  elementId: string;
  source: string;
}

/**
 * Element run from the element-executions API response
 * @internal
 */
export interface ElementExecutionRun {
  status: string;
  startedTimeUtc: string;
  completedTimeUtc: string | null;
  incomingFlowId: string | null;
  incomingFlowIds: string[];
  elementRunId: string;
  markerItemIndex: number | null;
  workflowId: string | null;
  temporalExecutionId: string | null;
  version: number;
  parentElementRunId: string | null;
}

/**
 * Element execution from the element-executions API response
 * @internal
 */
export interface ElementExecution {
  completedTimeUtc: string | null;
  elementId: string;
  elementType: string;
  elementExtensionType: string | null;
  parentRunId: string | null;
  parentElementId: string | null;
  parentElementRunId: string | null;
  runId: string;
  startedTimeUtc: string;
  status: string;
  elementRuns: ElementExecutionRun[];
}

/**
 * Top-level response from the element-executions API
 * @internal
 */
export interface ElementExecutionsApiResponse {
  instanceId: string;
  elementExecutions: ElementExecution[];
}

/**
 * Trace span from the LLMOps Traces/spans API
 * @internal
 */
export interface TraceSpan {
  Id: string;
  TraceId: string;
  ParentId: string | null;
  Name: string;
  StartTime: string;
  EndTime: string | null;
  Attributes: string | null;
  ExpiryTimeUtc: string | null;
  UpdatedAt: string;
}