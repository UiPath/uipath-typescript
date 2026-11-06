/**
 * Logs Module
 *
 * Writes log entries into UiPath Orchestrator's execution logs, so coded apps,
 * coded functions and scripts can log alongside robots. Entries appear under
 * Orchestrator Automations > Logs for the folder they are submitted to.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Logs } from '@uipath/uipath-typescript/logs';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const logs = new Logs(sdk);
 * await logs.submit({ message: 'Invoice batch started' }, { folderKey: '<folderKey>' });
 * ```
 *
 * @module
 */

export { LogService as Logs } from './logs';

export * from '../../../models/orchestrator/logs.types';
export * from '../../../models/orchestrator/logs.models';
