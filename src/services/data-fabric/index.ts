/**
 * Data Fabric Services Module
 *
 * Provides access to UiPath Data Fabric services for entity and choice set management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const entities = new Entities(sdk);
 * const allEntities = await entities.getAll();
 *
 * const choicesets = new ChoiceSets(sdk);
 * const allChoiceSets = await choicesets.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep EntityService for legacy UiPath class
export { EntityService as Entities, EntityService } from './entities';
export { ChoiceSetService as ChoiceSets, ChoiceSetService } from './choicesets';

// Re-export service-specific types
export type * from '../../models/data-fabric/entities.types';
export type * from '../../models/data-fabric/entities.models';
export type * from '../../models/data-fabric/choicesets.types';
export type * from '../../models/data-fabric/choicesets.models';
