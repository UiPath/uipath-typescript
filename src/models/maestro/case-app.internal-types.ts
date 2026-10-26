/**
 * Internal types for the Case App (v3) routes — wire shapes before transformation, and request bodies.
 */

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
