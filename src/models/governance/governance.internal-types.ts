/**
 * Governance internal types — not exposed via barrel exports.
 *
 * Raw API response shapes. The Insights RTM Governance endpoint returns
 * camelCase keys on the wire (verified against the live alpha tenant),
 * despite the OpenAPI spec describing PascalCase. The raw types mirror
 * what the API actually sends, so no key-case transform is needed in the
 * service.
 */

/**
 * Raw policy evaluation trace item as returned by the Insights RTM service.
 */
export interface RawPolicyEvaluationTraceItem {
  tenantId?: string;
  startTime?: string;
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
 * Raw policy evaluation traces response envelope.
 *
 * Only contains `items`; the API does not return a total count or
 * continuation token.
 */
export interface RawPolicyEvaluationTracesResponse {
  items?: RawPolicyEvaluationTraceItem[];
}
