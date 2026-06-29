/**
 * Integration Service — Connectors module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const connectors = new Connectors(sdk);
 * const all = await connectors.getAll();
 * ```
 *
 * @module
 */

export { ConnectorsService as Connectors, ConnectorsService } from './connectors';

export * from '../../../models/integration-service/connectors.types';
export * from '../../../models/integration-service/connectors.models';

// Re-exported because Connector methods return Connection entities.
export * from '../../../models/integration-service/connections.types';
export * from '../../../models/integration-service/connections.models';
