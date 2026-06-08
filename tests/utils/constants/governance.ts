/**
 * Governance test constants
 */

export const GOVERNANCE_TEST_CONSTANTS = {
  TENANT_ID: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  TRACE_ID: '11111111-aaaa-bbbb-cccc-222222222222',
  TRACE_ID_2: '33333333-aaaa-bbbb-cccc-444444444444',
  POLICY_ID: 'policy-active-001',
  POLICY_NAME: 'Active External Storage Block',
  POLICY_STATUS_ACTIVE: 'Active',
  POLICY_STATUS_SIMULATED: 'Simulated',
  ACTOR_PROCESS_ID: 'process-abc-001',
  ACTOR_PROCESS_TYPE: 'CodedAgent',
  ACTOR_IDENTITY_ID: 'identity-zzz-001',
  RESOURCE_ID: 'resource-yyy-001',
  RESOURCE_TYPE: 'StorageBucket',
  FOLDER_KEY: '07107668-6576-455d-9046-cf13c14f6414',
  PROCESS_KEY: 'maestro-process-key-001',
  JOB_KEY: 'job-key-001',
  START_TIME_ISO: '2024-01-01T00:00:00.000Z',
  END_TIME_ISO: '2024-12-31T23:59:59.000Z',
  STARTED_TIME_API: '2024-09-12T14:33:21Z',
  EVALUATION_RESULT_DENY: 'Deny',
  EVALUATION_DETAILS: '{"matchedRule":"deny-external-storage"}',
  ERROR_GOVERNANCE_REQUEST_FAILED: 'Governance request failed',
  SUMMARY_TOTAL_EVALUATIONS: 150,
  SUMMARY_ALLOW: 90,
  SUMMARY_DENY: 40,
  SUMMARY_NOOP: 20,
} as const;
