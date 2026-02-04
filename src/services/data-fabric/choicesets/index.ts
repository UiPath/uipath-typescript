/**
 * ChoiceSets Service Module
 *
 * Provides access to UiPath Data Fabric ChoiceSets service for managing choice sets.
 *
 * ChoiceSets are enumerated lists of values that can be used as field types in entities.
 * They enable single-select or multi-select fields, such as expense types, categories, or status values.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ChoiceSets } from '@uipath/uipath-typescript/choicesets';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const choicesets = new ChoiceSets(sdk);
 * const allChoiceSets = await choicesets.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep ChoiceSetService for legacy UiPath class
export { ChoiceSetService as ChoiceSets, ChoiceSetService } from '../choicesets';

// Re-export service-specific types
export type * from '../../../models/data-fabric/choicesets.types';
export type * from '../../../models/data-fabric/choicesets.models';
