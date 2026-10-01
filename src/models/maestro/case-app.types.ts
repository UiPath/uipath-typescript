/**
 * Case App Types
 * Types for the Case App (v3) routes, authorized by Case persona grants.
 */

import { PaginationOptions } from '../../utils/pagination';
import {
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  EscalationTriggerType,
  InstanceStatus,
} from './case-instances.types';
import { ProcessIncidentStatus, ProcessIncidentType, ProcessIncidentSeverity, DebugMode } from './process-incidents.types';

/**
 * SLA status of a case or stage, as the Case App routes report it.
 *
 * @experimental
 */
export enum CaseAppSlaStatus {
  /** Within the SLA deadline */
  OnTrack = 'OnTrack',
  /** Approaching the SLA deadline */
  AtRisk = 'AtRisk',
  /** Past the SLA deadline */
  Overdue = 'Overdue',
  /** The case or stage has completed */
  Completed = 'Completed',
  /** No SLA is defined, or its state cannot be determined */
  Unknown = 'Unknown',
}

/**
 * Sort direction for {@link CaseAppInstanceGetAllOptions}.
 *
 * @experimental
 */
export enum CaseAppSortOrder {
  Asc = 'Asc',
  Desc = 'Desc',
}

/**
 * Field to sort case instances by.
 *
 * @experimental
 */
export enum CaseAppInstanceSortBy {
  StartedTime = 'startedTimeUtc',
  CompletedTime = 'completedTimeUtc',
  CreatedTime = 'createdTimeUtc',
  Status = 'status',
}

/**
 * Element types {@link CaseAppGetElementExecutionsOptions} can filter by.
 *
 * @experimental
 */
export enum CaseAppElementType {
  /** Human-in-the-loop (Action Center) tasks */
  Hitl = 'hitl',
  /** AI agents */
  Agent = 'agent',
  /** Robotic Process Automation (RPA) processes */
  Rpa = 'rpa',
  /** API workflows */
  ApiWorkflow = 'apiworkflow',
}

/**
 * A case instance visible to the caller through their Case persona grants.
 *
 * @experimental
 */
export interface CaseAppInstanceGetResponse {
  instanceId: string;
  instanceDisplayName: string;
  /** Human-readable case reference number */
  caseId: string | null;
  organizationId: string;
  tenantId: string;
  folderKey: string;
  processKey: string;
  packageKey: string;
  packageId: string;
  packageVersion: string;
  latestRunId: string;
  latestRunStatus: InstanceStatus;
  source: string;
  userId: number;
  startedByUser: string | null;
  creatorUserKey: string | null;
  createdTime: string | null;
  startedTime: string;
  completedTime: string | null;
  instanceRuns: CaseAppInstanceRun[] | null;
}

/**
 * One run of a case instance.
 *
 * @experimental
 */
export interface CaseAppInstanceRun {
  runId: string;
  status: string;
  startedTime: string;
  completedTime: string;
}

/**
 * Options for listing case instances.
 *
 * @experimental
 */
export interface CaseAppInstanceGetAllOptions {
  packageId?: string;
  /** Requires `packageId` */
  packageVersion?: string;
  processKey?: string;
  /** Incident error code */
  errorCode?: string;
  /** Instance statuses to include */
  statuses?: InstanceStatus[];
  /** Human-readable case reference number */
  caseId?: string;
  creatorUserKey?: string;
  /** Lower bound of the started-time range */
  startedTimeStart?: Date;
  /** Upper bound of the started-time range */
  startedTimeEnd?: Date;
  sortBy?: CaseAppInstanceSortBy;
  /** Defaults to descending */
  order?: CaseAppSortOrder;
}

/**
 * Options for listing case instances, with pagination support.
 *
 * @experimental
 */
export type CaseAppInstanceGetAllWithPaginationOptions = CaseAppInstanceGetAllOptions & PaginationOptions;

/**
 * Latest status and runtime SLA of one stage of a case instance.
 *
 * @experimental
 */
export interface CaseAppStage {
  /** Stage element id */
  elementId: string;
  name: string | null;
  /** Latest execution status of the stage (e.g. `InProgress`, `Completed`) */
  latestStatus: string;
  /** SLA deadline in UTC (ISO 8601), or `null` when no SLA is configured */
  slaDueTime: string | null;
  slaStatus: CaseAppSlaStatus | null;
  slaName: string | null;
  escalationRuleIndex: number | null;
  escalationRuleType: EscalationTriggerType | null;
  escalationRuleName: string | null;
}

/**
 * Per-stage status and SLA for a case instance.
 *
 * @experimental
 */
export interface CaseAppGetStagesResponse {
  caseInstanceId: string;
  stages: CaseAppStage[];
}

/**
 * Case-level SLA summary for a case instance.
 *
 * @experimental
 */
export interface CaseAppGetSlaSummaryResponse {
  caseInstanceId: string;
  folderKey: string | null;
  name: string | null;
  /** Human-readable case reference number */
  caseId: string | null;
  caseSummary: string | null;
  processKey: string | null;
  /** SLA deadline in UTC (ISO 8601) */
  slaDueTime: string | null;
  slaStatus: CaseAppSlaStatus | null;
  slaName: string | null;
  escalationRuleIndex: number | null;
  escalationRuleType: EscalationTriggerType | null;
  escalationRuleName: string | null;
  instanceStatus: InstanceStatus;
  /** Coarse case state (`Open`, `Paused`, `Cancelled`, `Completed`, `Faulted`) */
  state: string;
  lastModifiedTime: string | null;
}

/**
 * Options for retrieving a case instance's element executions.
 *
 * @experimental
 */
export interface CaseAppGetElementExecutionsOptions {
  /** Only return elements of these types */
  elementTypes?: CaseAppElementType[];
}

/**
 * A details card configured on the case app.
 *
 * @experimental
 */
export interface CaseAppSection {
  id: string | null;
  title: string | null;
  /** Fields configured by the case app author, returned as the API sends them */
  details: Record<string, unknown> | null;
}

/**
 * One run of a case element.
 *
 * @experimental
 */
export interface CaseAppElementRun {
  elementRunId: string;
  status: string;
  startedTime: string | null;
  completedTime: string | null;
  incomingFlowId: string | null;
  incomingFlowIds: string[];
  markerItemIndex: number | null;
  workflowId: string | null;
  version: number | null;
  parentElementRunId: string | null;
  jobKey: string | null;
  /** External reference, e.g. the Action Center task */
  externalLink: string | null;
  maestroLink: string | null;
}

/**
 * Execution record of one case element.
 *
 * @experimental
 */
export interface CaseAppElementExecution {
  elementId: string;
  /** BPMN element type */
  elementType: string;
  elementName: string | null;
  /** What the element does — an action, an agent, an automation */
  elementExtensionType: string | null;
  status: string;
  startedTime: string | null;
  completedTime: string | null;
  runId: string;
  parentRunId: string | null;
  parentElementId: string | null;
  parentElementRunId: string | null;
  processKey: string | null;
  caseInstanceId: string | null;
  /** The stage the element belongs to */
  caseStageElementId: string | null;
  jobKey: string | null;
  externalLink: string | null;
  maestroLink: string | null;
  elementRuns: CaseAppElementRun[];
}

/**
 * Element-execution timeline of a case instance.
 *
 * @experimental
 */
export interface CaseAppGetElementExecutionsResponse {
  instanceId: string;
  instanceDisplayName: string;
  /** Human-readable case reference number */
  caseId: string | null;
  organizationId: string;
  tenantId: string;
  folderKey: string;
  processKey: string;
  packageId: string;
  packageKey: string;
  packageVersion: string;
  source: string;
  creationUserKey: string | null;
  status: InstanceStatus;
  startedTime: string;
  completedTime: string | null;
  traceId: string | null;
  caseSummary: string | null;
  caseSummaryExpression: string | null;
  sections: CaseAppSection[] | null;
  sectionsExpressions: CaseAppSection[] | null;
  elementExecutions: CaseAppElementExecution[];
}

/**
 * An incident raised on a case instance.
 *
 * @experimental
 */
export interface CaseAppIncidentGetResponse {
  id: string;
  incidentId: string;
  instanceId: string;
  runId: string;
  organizationId: string;
  tenantId: string;
  folderKey: string;
  processKey: string | null;
  packageVersion: string | null;
  elementId: string | null;
  elementRunId: string | null;
  sourceElementId: string | null;
  incidentStatus: ProcessIncidentStatus;
  incidentType: ProcessIncidentType | null;
  incidentSeverity: ProcessIncidentSeverity | null;
  errorCode: string | null;
  errorMessage: string;
  errorDetails: string | null;
  errorTime: string;
  dependentFaultCode: string | null;
  comment: string | null;
  userUpdated: string | null;
  debugMode: DebugMode | null;
  incidentUpdateTime: string | null;
  traceId: string | null;
  aiSummary: string | null;
  aiRecommendations: string[] | null;
  processType: string | null;
}

/**
 * An ad-hoc task the caller can trigger.
 *
 * @experimental
 */
export interface CaseAppAdhocTask {
  /** Case plan name — the name `triggerAdhocTaskForCaseApp` takes */
  taskName: string;
  taskId: string | null;
}

/**
 * A stage and the ad-hoc tasks the caller can trigger in it.
 *
 * @experimental
 */
export interface CaseAppAdhocTaskStage {
  stageId: string | null;
  stageLabel: string;
  tasks: CaseAppAdhocTask[];
}

/**
 * Options for triggering an ad-hoc task.
 *
 * @experimental
 */
export interface CaseAppTriggerAdhocTaskOptions {
  /** Forwarded to the task verbatim; not validated against the task's declared inputs */
  taskInput?: Record<string, unknown>;
}

/**
 * Options for selecting the next stage.
 *
 * @experimental
 */
export interface CaseAppSelectStageOptions {
  /** Which waiting stage receives the selection; required when several stages are waiting at once */
  waitingStageId?: string;
}

/**
 * Options for closing a case instance.
 *
 * @experimental
 */
export interface CaseAppCloseOptions extends CaseInstanceOperationOptions {
  /** Idempotency key for the close operation */
  operationId?: string;
}

/**
 * Result of closing a case instance.
 *
 * @experimental
 */
export interface CaseAppCloseResponse extends CaseInstanceOperationResponse {
  isCompleted: boolean;
}

/**
 * Result of sending a message to a case instance.
 *
 * @experimental
 */
export interface CaseAppSendMessageResponse {
  id: string;
  jobId: string;
}
