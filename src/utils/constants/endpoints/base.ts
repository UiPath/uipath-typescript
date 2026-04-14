/**
 * Base path constants for different services
 */

export const ORCHESTRATOR_BASE = 'orchestrator_';
export const PIMS_BASE = 'pims_';
export const DATAFABRIC_BASE = 'datafabric_';
export const IDENTITY_BASE = 'identity_';
export const AUTOPILOT_BASE = 'autopilotforeveryone_';
// The governance API is org-scoped: {baseUrl}/{orgName}/roboticsops_/api/...
// ApiClient always prepends {orgName}/{tenantName}/ to paths. The '../' traverses back
// from the tenant level to the org level after URL normalization, producing the correct URL.
export const GOVERNANCE_BASE = '../roboticsops_';
