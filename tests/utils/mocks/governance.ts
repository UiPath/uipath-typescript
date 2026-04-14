/**
 * Governance service mock utilities
 */
import type { RawPolicyGetResponse, PolicyProduct } from '../../../src/models/governance/governance.types';
import type { TenantPolicySlot, TenantGetResponse } from '../../../src/models/governance/governance.internal-types';
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
 * Creates a mock GET /Tenant/ response with the wrapped `{ totalCount, result }` shape.
 * tenantName is included in slot data (present in GET, stripped before PUT).
 *
 * @param tenantIdentifier - UUID of the tenant
 * @param tenantName - Human-readable tenant name matching SDK config
 */
export const createMockTenantPolicySlots = (
  tenantIdentifier: string,
  tenantName: string
): TenantGetResponse => ({
  totalCount: 1,
  result: [
    {
      name: tenantName,
      identifier: tenantIdentifier,
      url: `https://cloud.uipath.com/test-org/${tenantName}/orchestrator_/`,
      status: 'Enabled',
      tenantPolicies: [
        {
          tenantIdentifier,
          tenantName,
          licenseTypeIdentifier: 'NoLicense',
          policyIdentifier: null,
          productIdentifier: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME,
        },
        {
          tenantIdentifier,
          tenantName,
          licenseTypeIdentifier: 'Attended',
          policyIdentifier: null,
          productIdentifier: 'Robot',
        },
        {
          tenantIdentifier,
          tenantName,
          licenseTypeIdentifier: 'NoLicense',
          policyIdentifier: null,
          productIdentifier: 'IntegrationService',
        },
      ],
    },
  ],
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
