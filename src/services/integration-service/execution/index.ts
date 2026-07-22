/**
 * Integration Service — Execution passthrough module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { execute } from '@uipath/uipath-typescript/is-execution';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET');
 * ```
 *
 * @module
 */

export { execute } from './execution';
export * from '../../../models/integration-service/execution.types';
