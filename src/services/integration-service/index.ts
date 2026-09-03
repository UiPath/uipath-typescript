/**
 * Integration Service Module
 *
 * Provides access to UiPath Integration Service connectors, connections,
 * element metadata, and connector activity execution.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import {
 *   Connections,
 *   Connectors,
 *   Elements,
 *   execute,
 * } from '@uipath/uipath-typescript/connections';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const connectors = new Connectors(sdk);
 * const allConnectors = await connectors.getAll();
 *
 * const connections = new Connections(sdk);
 * const allConnections = await connections.getAll({ folderPath: 'Shared/Finance' });
 *
 * const elements = new Elements(sdk);
 * const objects = await elements.getObjects('uipath-slack');
 *
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET');
 * ```
 *
 * @module
 */

// Export services with cleaner names alongside the internal *Service names
export { ConnectorsService as Connectors, ConnectorsService } from './connectors/connectors';
export { ConnectionsService as Connections, ConnectionsService } from './connections/connections';
export { ElementsService as Elements, ElementsService } from './elements/elements';
export { execute } from './execution/execution';

// Re-export service-specific types
export * from '../../models/integration-service/integration-service.types';
export * from '../../models/integration-service/connectors.types';
export * from '../../models/integration-service/connectors.models';
export * from '../../models/integration-service/connections.types';
export * from '../../models/integration-service/connections.models';
export * from '../../models/integration-service/elements.types';
export * from '../../models/integration-service/elements.models';
export * from '../../models/integration-service/execution.types';
