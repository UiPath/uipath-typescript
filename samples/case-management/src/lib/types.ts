// App types for the case-management sample.
//
// Where the SDK already exports a response type, we alias it (no re-declaration)
// so the sample stays in lockstep with the SDK's real shapes. The only locally
// defined data shape is ElementExecution: the SDK's execution-history element
// type is internal (not exported) AND narrower than the runtime payload — it
// omits `elementType`/`elementExtensionType`, which the history actor
// classification needs. Everything else is either an SDK alias or an app-level
// derived/normalized type (enrichment, SLA buckets, history grouping).

import type {
  CaseInstanceGetResponse,
  CaseGetAllResponse,
  CaseGetStageResponse,
  CaseAppConfig as SdkCaseAppConfig,
  StageTask as SdkStageTask,
  CaseGetTopRunCountResponse,
  CaseGetTopFaultedCountResponse,
  CaseGetTopDurationResponse,
  InstanceStatusTimelineResponse,
} from '@uipath/uipath-typescript/cases';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';

// ---- SDK response types, aliased to the names this app uses ----
export type CaseInstance = CaseInstanceGetResponse;
export type CaseDefinition = CaseGetAllResponse;
export type CaseStage = CaseGetStageResponse;
export type StageTask = SdkStageTask;
export type CaseAppConfig = SdkCaseAppConfig;
export type ActionTask = TaskGetResponse;
export type TopRunCount = CaseGetTopRunCountResponse;
export type TopFaultedCount = CaseGetTopFaultedCountResponse;
export type TopDuration = CaseGetTopDurationResponse;
export type StatusTimelinePoint = InstanceStatusTimelineResponse;

// ---- Execution history (SDK type gap — see file header) ----
export interface ElementExecution {
  elementId: string;
  elementName: string;
  /** BPMN type: Task, ServiceTask, UserTask, *Gateway, *Event, CallActivity… */
  elementType?: string;
  /** UiPath semantics: Orchestrator.StartAgentJob, Actions.HITL, Maestro.*… */
  elementExtensionType?: string;
  parentElementId?: string | null;
  caseStageElementId?: string | null;
  startedTime: string;
  completedTime?: string | null;
  status: string;
  processKey: string;
  externalLink?: string;
  maestroLink?: string;
}

export interface ExecutionHistory {
  instanceId: string;
  instanceDisplayName: string;
  status: string;
  startedTime: string;
  completedTime?: string | null;
  elementExecutions: ElementExecution[];
}

// ---- Enrichment derived from getStages + getActionTasks for one instance ----
export interface CaseEnrichment {
  currentStage?: string;
  currentStageStatus?: string;
  slaTime?: string | null;
  slaStatus?: 'breached' | 'at-risk' | 'on-track' | null;
  priority?: string | null;
  openTasks: number;
}

export type EnrichedCase = CaseInstance & { enrichment?: CaseEnrichment };

// ---- SLA summary (normalized from getSlaSummary / getStagesSlaSummary) ----
export type SlaStatus = 'on-track' | 'at-risk' | 'breached' | 'completed' | 'unknown';

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

export interface TopElementFailed {
  elementName: string;
  elementType: string;
  processKey: string;
  failedCount: number;
}

// Per-element execution stats for a process version (Cases.getElementStats).
// The SDK's ElementStats type is internal (not exported); this mirrors it.
export interface ElementStat {
  elementId: string;
  successCount: number;
  failCount: number;
  terminatedCount: number;
  pausedCount: number;
  inProgressCount: number;
  minDurationMs: number;
  maxDurationMs: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
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

// ---- aggregated agent output surfaced as the case overview ----
export interface AgentOutput {
  elementName: string;
  text: string;
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
