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
 * Options for reopening a case instance.
 */
export interface CaseInstanceReopenOptions extends CaseInstanceOperationOptions {
  /**
   * The stage ID from which the case instance should be reopened.
   */
  stageId: string;
}

/**
 * Well-known message names understood by running case instances.
 */
export enum CaseInstanceMessageName {
  /** Selects the next stage when the case instance is waiting for a user to choose one */
  UserSelectStage = 'UserSelectStage',
  /** Starts a manually-triggered (ad-hoc) case task */
  UserAdhocTrigger = 'UserAdhocTrigger'
}

/**
 * Options for sending a message to a case instance.
 */
export interface CaseInstanceSendMessageOptions {
  /**
   * Data payload delivered with the message — e.g. `{ stageName: 'Review' }` for
   * `UserSelectStage`, or `{ taskNames: ['Approve Invoice'] }` for `UserAdhocTrigger`.
   */
  itemData?: Record<string, string | string[]>;
  /**
   * Message reference identifying the target wait point. Defaults to the case
   * instance itself, which is correct for most messages.
   */
  reference?: string;
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

/**
 * SLA status for a case instance
 */
export enum SlaSummaryStatus {
  /** Case is within SLA deadline */
  ON_TRACK = 'On Track',
  /** Case is approaching SLA deadline based on at-risk percentage threshold */
  AT_RISK = 'At Risk',
  /** Case has exceeded SLA deadline */
  OVERDUE = 'Overdue',
  /** Case instance has completed */
  COMPLETED = 'Completed',
  /** SLA status cannot be determined (no SLA deadline defined) */
  UNKNOWN = 'Unknown'
}

/**
 * Instance status values for case instances and process instances
 */
export enum InstanceStatus {
  /** Instance status not yet populated by the backend */
  UNKNOWN = '',
  CANCELLED = 'Cancelled',
  CANCELING = 'Canceling',
  COMPLETED = 'Completed',
  FAULTED = 'Faulted',
  PAUSED = 'Paused',
  PAUSING = 'Pausing',
  PENDING = 'Pending',
  RESUMING = 'Resuming',
  RETRYING = 'Retrying',
  RUNNING = 'Running',
  UPGRADING = 'Upgrading'
}

/**
 * SLA summary response for a single case instance
 */
export interface SlaSummaryResponse {
  /** Unique identifier of the case instance */
  caseInstanceId: string;
  /** Folder key that the case instance belongs to */
  folderKey: string;
  /** Display name of the SLA rule */
  name: string;
  /** Human-readable reference number for a case instance */
  externalId: string;
  /** Summary text for the case instance — may be empty */
  caseSummary: string;
  /** Unique key of the process associated with the case instance */
  processKey: string;
  /** SLA deadline timestamp in UTC (ISO 8601 format) */
  slaDueTime: string;
  /** Current SLA status indicating whether the deadline is met, at risk, or breached */
  slaStatus: SlaSummaryStatus;
  /** Index of the escalation rule currently applied to the SLA */
  escalationRuleIndex: string;
  escalationRuleType: EscalationTriggerType;
  /** Current status of the case instance */
  instanceStatus: InstanceStatus;
  /** Last modification timestamp in UTC (ISO 8601 format) */
  lastModifiedTime: string;
}

/**
 * Options for querying SLA summary
 */
export type CaseInstanceSlaSummaryOptions = PaginationOptions & {
  /** Filter to a specific case instance */
  caseInstanceId?: string;
  /** Filter by event start time in UTC */
  startTimeUtc?: Date;
  /** Filter by event end time in UTC */
  endTimeUtc?: Date;
};

/**
 * Stage SLA summary for a single stage within a case instance (from Insights RTM)
 */
export interface CaseInstanceStageSLAStage {
  /** Stage element identifier */
  elementId: string;
  /** Stage display name */
  name: string;
  /** Current execution status of the stage */
  latestStatus: string;
  /** SLA deadline timestamp in UTC (e.g. `"9/17/2025 8:35:38 PM"`) or empty string if no SLA is configured */
  slaDueTime: string;
  /** SLA status for this stage */
  slaStatus: SlaSummaryStatus;
  /** Index of the current escalation rule */
  escalationRuleIndex: string;
  /** Type of the current escalation rule */
  escalationRuleType: EscalationTriggerType;
}

/**
 * Stages SLA summary for a single case instance (from Insights RTM)
 */
export interface CaseInstanceStageSLAResponse {
  /** Case instance identifier */
  caseInstanceId: string;
  /** Stages within this case instance */
  stages: CaseInstanceStageSLAStage[];
}

/**
 * Options for querying stages SLA summary
 */
export interface CaseInstanceStageSLAOptions {
  /** Filter to a specific case instance */
  caseInstanceId?: string;
}

/**
 * Case stage task type
 */
export enum StageTaskType {
  EXTERNAL_AGENT = 'external-agent',
  RPA = 'rpa',
  AGENTIC_PROCESS = 'process',
  AGENT = 'agent',
  ACTION = 'action',
  API_WORKFLOW = 'api-workflow'
}

/**
 * Stage task information
 */
export interface StageTask {
  id: string;
  name: string;
  completedTime: string;
  startedTime: string;
  status: string;
  type: StageTaskType;
}

/**
 * Escalation recipient scope
 */
export enum EscalationRecipientScope {
  USER = 'user',
  USER_GROUP = 'usergroup'
}

/**
 * Escalation rule recipient information
 */
export interface EscalationRecipient {
  /** Type of recipient (user or usergroup) */
  scope: EscalationRecipientScope;
  /** Identifier for a user/usergroup */
  target: string;
  /** The email id of the user/usergroup */
  value: string;
}

/**
 * Escalation action type
 */
export enum EscalationActionType {
  NOTIFICATION = 'notification'
}

/**
 * Escalation rule action configuration
 */
export interface EscalationAction {
  type: EscalationActionType;
  recipients: EscalationRecipient[];
}

/**
 * Escalation rule trigger type
 */
export enum EscalationTriggerType {
  SLA_BREACHED = 'sla-breached',
  AT_RISK = 'at-risk',
  /** Default value when no escalation rule is defined */
  NONE = 'None'
}

/**
 * Escalation rule trigger metadata
 */
export interface EscalationTriggerMetadata {
  type?: EscalationTriggerType;
  atRiskPercentage?: number;
}

/**
 * Escalation rule configuration
 */
export interface EscalationRule {
  triggerInfo: EscalationTriggerMetadata;
  action?: EscalationAction;
}

/**
 * SLA duration unit
 */
export enum SLADurationUnit {
  HOURS = 'h',
  DAYS = 'd',
  WEEKS = 'w',
  MONTHS = 'm'
}

/**
 * SLA configuration for stages
 */
export interface StageSLA {
  length?: number;
  duration?: SLADurationUnit;
  escalationRule?: EscalationRule[];
}

/**
 * Stage information from case instances
 */
export interface CaseGetStageResponse {
  id: string;
  name: string;
  sla?: StageSLA;
  status: string;
  tasks: StageTask[][];
}

/**
 * Case element execution metadata
 */
export interface ElementExecutionMetadata {
  completedTime: string | null;
  elementId: string;
  elementName: string;
  parentElementId: string | null;
  startedTime: string;
  /** Element status (e.g., "Completed", "Faulted", "Running") */
  status: string;
  processKey: string;
  /** External reference link, eg link to the HITL task in Action Center */
  externalLink: string;
  /** List of element runs for the element */
  elementRuns: ElementRunMetadata[];
}

/**
 * Response for getting case instance element executions
 */
export interface CaseInstanceExecutionHistoryResponse {
  creationUserKey: string | null;
  folderKey: string;
  instanceDisplayName: string;
  instanceId: string;
  packageId: string;
  packageKey: string;
  packageVersion: string;
  processKey: string;
  source: string;
  /** Element status (e.g., "Completed", "Faulted", "Running", "Pausing", "Canceling") */
  status: string;
  startedTime: string;
  completedTime: string | null;
  elementExecutions: ElementExecutionMetadata[];
}

/**
 * Element run metadata
 */
export interface ElementRunMetadata {
  status: string;
  startedTime: string;
  completedTime: string | null;
  elementRunId: string;
  parentElementRunId: string | null;
}