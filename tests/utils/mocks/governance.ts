/**
 * Governance service mock utilities
 */
import type { RawPolicyGetResponse, PolicyProduct } from '../../../src/models/governance/governance.types';
import { GOVERNANCE_TEST_CONSTANTS } from '../constants/governance';

const MOCK_PRODUCT: PolicyProduct = {
  name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME,
  label: GOVERNANCE_TEST_CONSTANTS.PRODUCT_LABEL,
  isRestricted: false,
  isCloud: true,
  isRemote: false,
};

/**
 * Creates a mock raw policy as returned by GET /Policy.
 * API already returns camelCase — no transformation needed.
 */
export const createMockRawPolicy = (overrides: Partial<RawPolicyGetResponse> = {}): RawPolicyGetResponse => ({
  identifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
  name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
  description: GOVERNANCE_TEST_CONSTANTS.POLICY_DESCRIPTION,
  priority: GOVERNANCE_TEST_CONSTANTS.POLICY_PRIORITY,
  availability: GOVERNANCE_TEST_CONSTANTS.POLICY_AVAILABILITY,
  product: MOCK_PRODUCT,
  ...overrides,
});

/**
 * Creates a mock raw policy settings API response
 * (the nested shape returned by GET /Policy/form-data/{id}).
 */
export const createMockRawPolicySettings = (
  overrides: Partial<Record<string, unknown>> = {}
): { policyIdentifier: string; data: { data: Record<string, unknown> } } => ({
  policyIdentifier: '00000000-0000-0000-0000-000000000000',
  data: {
    data: {
      [GOVERNANCE_TEST_CONSTANTS.SETTINGS_KEY]: GOVERNANCE_TEST_CONSTANTS.SETTINGS_VALUE,
      agents: true,
      jarvis: false,
      ...overrides,
    },
  },
});
