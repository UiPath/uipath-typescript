import { GOVERNANCE_TEST_CONSTANTS } from '../constants/governance';
import type {
  RawGovernancePolicyTraceItem,
  RawGovernanceOperationSummaryResponse,
} from '../../../src/models/governance/governance.internal-types';

/**
 * Creates a raw policy evaluation trace item (camelCase) matching the live API response shape.
 */
export const createMockRawGovernancePolicyTrace = (
  overrides: Partial<RawGovernancePolicyTraceItem> = {},
): RawGovernancePolicyTraceItem => ({
  tenantId: GOVERNANCE_TEST_CONSTANTS.TENANT_ID,
  startTime: GOVERNANCE_TEST_CONSTANTS.STARTED_TIME_API,
  finalEnforcement: 'Deny',
  policyId: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
  policyEnforcement: 'Deny',
  policyEvaluationResult: GOVERNANCE_TEST_CONSTANTS.EVALUATION_RESULT_DENY,
  policyName: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
  policyStatus: GOVERNANCE_TEST_CONSTANTS.POLICY_STATUS_ACTIVE,
  policyEvaluationDetails: GOVERNANCE_TEST_CONSTANTS.EVALUATION_DETAILS,
  actorProcessId: GOVERNANCE_TEST_CONSTANTS.ACTOR_PROCESS_ID,
  actorProcessType: GOVERNANCE_TEST_CONSTANTS.ACTOR_PROCESS_TYPE,
  actorIdentityId: GOVERNANCE_TEST_CONSTANTS.ACTOR_IDENTITY_ID,
  resourceId: GOVERNANCE_TEST_CONSTANTS.RESOURCE_ID,
  resourceType: GOVERNANCE_TEST_CONSTANTS.RESOURCE_TYPE,
  folderKey: GOVERNANCE_TEST_CONSTANTS.FOLDER_KEY,
  traceId: GOVERNANCE_TEST_CONSTANTS.TRACE_ID,
  processKey: GOVERNANCE_TEST_CONSTANTS.PROCESS_KEY,
  jobKey: GOVERNANCE_TEST_CONSTANTS.JOB_KEY,
  ...overrides,
});

/**
 * Creates a raw policy evaluation traces response envelope (camelCase).
 */
export const createMockRawGovernancePolicyTracesResponse = (
  items: RawGovernancePolicyTraceItem[] = [createMockRawGovernancePolicyTrace()],
): { items: RawGovernancePolicyTraceItem[] } => ({
  items,
});

/**
 * Creates a raw governed operation summary response (camelCase) matching the
 * live API response shape.
 */
export const createMockRawGovernanceOperationSummary = (
  overrides: Partial<RawGovernanceOperationSummaryResponse> = {},
): RawGovernanceOperationSummaryResponse => ({
  totalEvaluations: GOVERNANCE_TEST_CONSTANTS.SUMMARY_TOTAL_EVALUATIONS,
  allow: GOVERNANCE_TEST_CONSTANTS.SUMMARY_ALLOW,
  deny: GOVERNANCE_TEST_CONSTANTS.SUMMARY_DENY,
  noOp: GOVERNANCE_TEST_CONSTANTS.SUMMARY_NOOP,
  ...overrides,
});
