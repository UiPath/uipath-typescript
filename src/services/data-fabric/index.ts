/**
 * Data Fabric Services Module
 *
 * Provides access to UiPath Data Fabric services for entity and choice set
 * operations.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import {
 *   ChoiceSets,
 *   Entities,
 * } from '@uipath/uipath-typescript/entities';
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
export { DataFabricRoleService } from './roles';
export { DataFabricDirectoryService } from './directory';

// Re-export service-specific types
export * from '../../models/data-fabric/entities.types';
export { LogicalOperator, QueryFilterOperator } from '../../models/data-fabric/entities.types';
export * from '../../models/data-fabric/entities.models';
export * from '../../models/data-fabric/choicesets.types';
export * from '../../models/data-fabric/choicesets.models';
export * from '../../models/data-fabric/roles.types';
export * from '../../models/data-fabric/roles.models';
export * from '../../models/data-fabric/directory.types';
export * from '../../models/data-fabric/directory.models';
