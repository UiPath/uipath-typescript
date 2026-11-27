// App types for the case-app sample.
//
// Where the SDK already exports a response type, we alias it (no re-declaration)
// so the sample stays in lockstep with the SDK's real shapes. Everything else
// is an app-level derived/normalized type (SLA buckets, history grouping).

import type {
  CaseInstanceGetResponse,
  CaseGetAllResponse,
  CaseGetStageResponse,
  StageTask as SdkStageTask,
  CaseGetTopRunCountResponse,
  CaseGetTopFaultedCountResponse,
  CaseGetTopDurationResponse,
  InstanceStatusTimelineResponse,
  CaseInstanceExecutionHistoryResponse,
  CaseInstanceGetVariablesResponse,
  ElementExecutionMetadata,
  ElementGetTopFailedCountResponse,
  ElementStats,
  GlobalVariableMetaData,
} from '@uipath/uipath-typescript/cases';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';

// ---- SDK response types, aliased to the names this app uses ----
export type CaseInstance = CaseInstanceGetResponse;
export type CaseDefinition = CaseGetAllResponse;
export type CaseStage = CaseGetStageResponse;
export type StageTask = SdkStageTask;
export type ActionTask = TaskGetResponse;
export type TopRunCount = CaseGetTopRunCountResponse;
export type TopFaultedCount = CaseGetTopFaultedCountResponse;
export type TopDuration = CaseGetTopDurationResponse;
export type StatusTimelinePoint = InstanceStatusTimelineResponse;
export type TopElementFailed = ElementGetTopFailedCountResponse;
export type ElementStat = ElementStats;
export type CaseVariables = CaseInstanceGetVariablesResponse;
export type GlobalVariable = GlobalVariableMetaData;

// ---- Execution history ----
// `elementType` is the BPMN type (Task, ServiceTask, UserTask, *Gateway, *Event,
// CallActivity…); `elementExtensionType` is what the element does
// (Orchestrator.StartAgentJob, Actions.HITL, Maestro.*…).
export type ElementExecution = ElementExecutionMetadata;
export type ExecutionHistory = CaseInstanceExecutionHistoryResponse;

// ---- SLA summary (normalized from getSlaSummary / getStagesSlaSummary) ----
export type SlaStatus = 'on-track' | 'at-risk' | 'breached' | 'completed' | 'unknown';
/** SLA state of a single task, worked out from its due time. */
export type TaskSlaStatus = 'on-track' | 'at-risk' | 'breached';

export interface CaseSla {
  caseInstanceId: string;
  folderKey?: string;
  name?: string;
  processKey?: string;
  slaDueTime?: string | null;
  slaStatus: SlaStatus;
  instanceStatus?: string;
}

export interface StageSla {
  elementId: string;
  name: string;
  latestStatus: string;
  slaDueTime?: string | null;
  slaStatus: SlaStatus;
}

// ---- actor classification for execution history ----
export type ActorType = 'agent' | 'automation' | 'human' | 'api' | 'system';

export interface HistoryEvent extends ElementExecution {
  actor: ActorType;
  label: string; // sanitized, human-readable
  stageName: string; // parent group this element belongs to
}

export interface HistoryStageGroup {
  stage: string;
  status?: string;
  events: HistoryEvent[];
}

// ---- incidents (normalized from ProcessInstances.getIncidents) ----
export interface CaseIncident {
  incidentId: string;
  incidentStatus?: string | null; // Open | Closed
  incidentType?: string | null; // System | User | Deployment
  incidentSeverity?: string | null; // Error | Warning
  errorCode?: string | null;
  errorMessage?: string | null;
  errorTime?: string | null;
  errorDetails?: string | null;
  elementId?: string | null;
  elementActivityName?: string | null;
}
