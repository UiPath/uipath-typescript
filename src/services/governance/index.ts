/**
 * Governance Module
 *
 * Provides access to UiPath Automation Ops governance policy management.
 * Supports listing, configuring, and deploying compliance policies (ISO 42001, HIPAA, SOC 2, etc.)
 * to tenants, groups, or individual users.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Governance } from '@uipath/uipath-typescript/governance';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const governance = new Governance(sdk);
 * const policies = await governance.getAll();
 * ```
 *
 * @module
 */

export { GovernanceService as Governance, GovernanceService } from './governance';

export * from '../../models/governance/governance.types';
export * from '../../models/governance/governance.models';
export {
  HIPAA,
  ISO42001,
  EU_AI_ACT,
  NIST_AI_RMF,
  SOC2,
  COMPLIANCE_PACKS,
} from '../../models/governance/compliance-packs';
