/**
 * Raw policy evaluation trace item as returned by API before transformation.
 */
export interface RawGovernancePolicyTraceItem {
  tenantId?: string;
  startTime: string;
  finalEnforcement?: string;
  policyId?: string;
  policyEnforcement?: string;
  policyEvaluationResult?: string;
  policyName?: string;
  policyStatus?: string;
  policyEvaluationDetails?: string;
  actorProcessId?: string;
  actorProcessType?: string;
  actorIdentityId?: string;
  resourceId?: string;
  resourceType?: string;
  folderKey?: string;
  traceId?: string;
  processKey?: string;
  jobKey?: string;
}

/**
 * Raw governed operation summary response as returned by API before transformation.
 */
export interface RawGovernanceOperationSummaryResponse {
  totalEvaluations?: number;
  allow?: number;
  deny?: number;
  noOp?: number;
}
