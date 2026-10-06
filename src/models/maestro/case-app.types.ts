/**
 * Case App Types
 * Types for the Case App (v3) routes, authorized by Case persona grants.
 */

import { EscalationTriggerType, InstanceStatus } from './case-instances.types';
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
 * Coarse state of a case, as the Case App SLA summary reports it.
 *
 * @experimental
 */
export enum CaseAppState {
  /** Pending, running, retrying, resuming or upgrading */
  Open = 'Open',
  /** Paused or pausing */
  Paused = 'Paused',
  /** Cancelled or canceling */
  Cancelled = 'Cancelled',
  Completed = 'Completed',
  Faulted = 'Faulted',
}

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
  /** Coarse case state, collapsing transitional instance statuses onto settled ones */
  state: CaseAppState;
  lastModifiedTime: string | null;
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
