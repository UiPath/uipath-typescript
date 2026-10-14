/**
 * Orchestrator Users Module
 *
 * Provides access to the users of a UiPath Orchestrator tenant — people, directory
 * groups, robots and external applications — with filtering, sorting, projection
 * and pagination. Tenant-level: no folder context is required.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { OrchestratorUsers } from '@uipath/uipath-typescript/orchestrator-users';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const orchestratorUsers = new OrchestratorUsers(sdk);
 * const { items } = await orchestratorUsers.getAll({ filter: "userName eq 'jane.doe@example.com'" });
 * ```
 *
 * @module
 */

export {
  OrchestratorUserService as OrchestratorUsers,
  OrchestratorUserService,
} from './users';

export * from '../../../models/orchestrator/users.types';
export * from '../../../models/orchestrator/users.models';
// `licenseType` reuses the runtime-type enum shared with Processes and Jobs.
export { RuntimeType } from '../../../models/orchestrator/processes.types';
