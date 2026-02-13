/**
 * Maestro Cases Module
 *
 * Provides access to UiPath Maestro for case management operations.
 * This module includes both case definitions and case instances.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const cases = new Cases(sdk);
 * const allCases = await cases.getAll();
 *
 * const caseInstances = new CaseInstances(sdk);
 * const allInstances = await caseInstances.getAll();
 * ```
 *
 * @module
 */

export { CasesService as Cases, CasesService } from './cases';
export { CaseInstancesService as CaseInstances, CaseInstancesService } from './case-instances';

export * from '../../../models/maestro/cases.types';
export * from '../../../models/maestro/cases.models';
export * from '../../../models/maestro/case-instances.types';
export * from '../../../models/maestro/case-instances.models';
