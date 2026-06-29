/**
 * Integration Service — Connections module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Connections } from '@uipath/uipath-typescript/is-connections';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const connections = new Connections(sdk);
 * const all = await connections.getAll({ folderKey: '<folderKey>' });
 * ```
 *
 * @module
 */

export { ConnectionsService as Connections, ConnectionsService } from './connections';

export * from '../../../models/integration-service/connections.types';
export * from '../../../models/integration-service/connections.models';
