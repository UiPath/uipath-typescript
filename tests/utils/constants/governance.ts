/**
 * Governance service test constants
 */

export const GOVERNANCE_TEST_CONSTANTS = {
  // Policy identifiers
  POLICY_ID: '93d36f8a-6931-4a38-8a32-135e87c9286b',
  POLICY_ID_2: '9781562f-8a00-41eb-8c20-b1b21170e6a8',

  // Tenant identifier (UUID used in the API slot table)
  TENANT_IDENTIFIER: '880f829a-5e31-425b-9b0d-e5ee82164f5f',

  // Policy metadata
  POLICY_NAME: 'ISO42001-AITrustLayer-v1',
  POLICY_NAME_2: 'default',
  POLICY_DESCRIPTION: 'ISO 42001:2023 compliance policy',
  POLICY_PRIORITY: 1,
  POLICY_AVAILABILITY: 30,

  // Product
  PRODUCT_NAME: 'AITrustLayer',
  PRODUCT_LABEL: 'AI Trust Layer',

  // Deployment targets
  GROUP_ID: 'group-abc-123',
  USER_ID: 'user-def-456',

  // Settings
  SETTINGS_KEY: 'global-control-toggle',
  SETTINGS_VALUE: true,

  // Error messages
  ERROR_POLICY_NOT_FOUND: 'Policy not found',
} as const;
