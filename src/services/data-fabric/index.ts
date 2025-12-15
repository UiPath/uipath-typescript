/**
 * Data Fabric Services Module
 *
 * Provides access to UiPath Data Fabric services for entity management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const entitiesService = new Entities(sdk);
 * const allEntities = await entitiesService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep EntityService for legacy UiPath class
export { EntityService as Entities, EntityService } from './entities';

// Re-export service-specific types
export type * from '../../models/data-fabric/entities.types';
export type * from '../../models/data-fabric/entities.models';
