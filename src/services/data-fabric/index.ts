/**
 * Data Fabric Services Module
 *
 * Provides access to UiPath Data Fabric services for entity management and choice sets.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 * import { ChoiceSets } from '@uipath/uipath-typescript/choicesets';
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

// Export Entities service
export { EntityService as Entities, EntityService } from './entities/entities';

// Export ChoiceSets service
export { ChoiceSetService as ChoiceSets, ChoiceSetService } from './choicesets/choicesets';

// Re-export service-specific types
export type * from '../../models/data-fabric/entities.types';
export type * from '../../models/data-fabric/entities.models';
export type * from '../../models/data-fabric/choicesets.types';
export type * from '../../models/data-fabric/choicesets.models';
