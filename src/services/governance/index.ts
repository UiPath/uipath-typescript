/**
 * Governance Module
 *
 * Provides access to UiPath governance policy evaluation traces.
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
 * const traces = await governance.getTraces(new Date('2024-01-01'));
 * ```
 *
 * @module
 */

export { GovernanceService as Governance } from './governance';

export * from '../../models/governance';
