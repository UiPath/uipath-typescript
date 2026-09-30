/**
 * Internal types for the Case App (v3) routes — wire shapes before transformation, and request bodies.
 */

import type { CaseAppSection } from './case-app.types';

/** Case instance as the list route sends it; only the fields the service reshapes are named */
export interface RawCaseAppInstance {
  instanceRuns?: Record<string, unknown>[] | null;
  [key: string]: unknown;
}

/** Element run as the API sends it */
export interface RawCaseAppElementRun {
  elementRunId: string;
  status: string;
  startedTimeUtc: string | null;
  completedTimeUtc: string | null;
  incomingFlowId: string | null;
  incomingFlowIds: string[];
  markerItemIndex: number | null;
  workflowId: string | null;
  version: number | null;
  parentElementRunId: string | null;
  jobKey: string | null;
  externalLink: string | null;
  maestroLink: string | null;
}

/** Element execution as the API sends it */
export interface RawCaseAppElementExecution {
  elementId: string;
  elementType: string;
  elementName: string | null;
  elementExtensionType: string | null;
  status: string;
  startedTimeUtc: string | null;
  completedTimeUtc: string | null;
  runId: string;
  parentRunId: string | null;
  parentElementId: string | null;
  parentElementRunId: string | null;
  processKey: string | null;
  caseInstanceId: string | null;
  caseStageElementId: string | null;
  jobKey: string | null;
  externalLink: string | null;
  maestroLink: string | null;
  elementRuns: RawCaseAppElementRun[];
}

/** Element-executions response as the API sends it */
export interface RawCaseAppGetElementExecutionsResponse {
  instanceId: string;
  instanceDisplayName: string;
  externalId: string | null;
  organizationId: string;
  tenantId: string;
  folderKey: string;
  processKey: string;
  packageId: string;
  packageKey: string;
  packageVersion: string;
  source: string;
  creationUserKey: string | null;
  status: string;
  startedTimeUtc: string;
  completedTimeUtc: string | null;
  traceId: string | null;
  caseSummary: string | null;
  caseSummaryExpression: string | null;
  sections: CaseAppSection[] | null;
  sectionsExpressions: CaseAppSection[] | null;
  elementExecutions: RawCaseAppElementExecution[];
}

/** SLA summary as the API sends it */
export interface RawCaseAppGetSlaSummaryResponse {
  caseInstanceId: string;
  folderKey: string | null;
  name: string | null;
  externalId: string | null;
  caseSummary: string | null;
  processKey: string | null;
  slaDueTime: string | null;
  slaStatus: string | null;
  slaName: string | null;
  escalationRuleIndex: number | null;
  escalationRuleType: string | null;
  escalationRuleName: string | null;
  instanceStatus: string;
  state: string;
  lastModifiedTime: string | null;
}

/** Ad-hoc tasks response as the API sends it */
export interface RawCaseAppAdhocTasksResponse {
  stages: {
    stageId: string | null;
    stageLabel: string;
    tasks: { taskName: string; taskId: string | null }[];
  }[];
}

/** Body of the message-send route */
export interface CaseAppSendMessageRequestBody {
  name: string;
  reference: string;
  itemData: Record<string, string | string[]>;
}
