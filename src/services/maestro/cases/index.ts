/**
 * Maestro Cases Module
 *
 * Provides access to UiPath Maestro for case management operations.
 * This module includes both case definitions and case instances.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Cases, CaseInstances } from '@uipath/uipath-typescript/maestro-cases';
 *
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * // Get case definitions
 * const cases = new Cases(uiPath);
 * const allCases = await cases.getAll();
 *
 * // Get case instances
 * const instances = new CaseInstances(uiPath);
 * const allInstances = await instances.getAll();
 *
 * // Close a specific case instance
 * await instances.close('instance-id', 'folder-key', { comment: 'Closing case' });
 * ```
 *
 * @module
 */

// Export services with clean names (flat structure, no hierarchy)
export { CasesService as Cases, CasesService } from './cases';
export { CaseInstancesService as CaseInstances, CaseInstancesService } from './case-instances';

// Re-export types for convenience
export type * from '../../../models/maestro/cases.types';
export type * from '../../../models/maestro/cases.models';
export type * from '../../../models/maestro/case-instances.types';
export type * from '../../../models/maestro/case-instances.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
