/**
 * Orchestrator Machines Module
 *
 * Provides access to UiPath Orchestrator for machine management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Machines } from '@uipath/uipath-typescript/machines';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const machines = new Machines(sdk);
 * const result = await machines.getAll();
 * console.log(result.items); // array of machines
 * ```
 *
 * @module
 */

export { MachineService as Machines, MachineService } from './machines';

export * from '../../../models/orchestrator/machines.types';
export * from '../../../models/orchestrator/machines.models';
