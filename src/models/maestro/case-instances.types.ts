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
  AT_RISK = 'at-risk'
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