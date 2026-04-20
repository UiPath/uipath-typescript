/**
 * AoPS (Autonomous Operations) Services Module
 *
 * Provides access to UiPath Autonomous Operations services for policy management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Policies } from '@uipath/uipath-typescript/policies';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const policies = new Policies(sdk);
 *
 * // Get all policies
 * const allPolicies = await policies.getAll();
 *
 * // Get policy details
 * const details = await policies.getDetails('policy-id');
 *
 * // Create a new policy
 * const template = await policies.getFormTemplate('AITrustLayer');
 * const newPolicy = await policies.create({
 *   name: 'My Policy',
 *   productName: 'AITrustLayer',
 *   data: template
 * });
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep PolicyService for legacy UiPath class
export { PolicyService as Policies, PolicyService } from './policies';
export { TenantService as Tenants, TenantService } from './tenants';
export { LicenseTypeService as LicenseTypes, LicenseTypeService } from './license-types';

// Re-export service-specific types
export * from '../../models/aops/policies.types';
export * from '../../models/aops/policies.models';
export * from '../../models/aops/tenants.types';
export * from '../../models/aops/tenants.models';
export * from '../../models/aops/license-types.types';
export * from '../../models/aops/license-types.models';
