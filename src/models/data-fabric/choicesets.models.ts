import { ChoiceSetGetAllResponse } from './choicesets.types';

/**
 * Service for managing UiPath Data Fabric Choice Sets
 *
 * Choice Sets are enumerated lists of values that can be used as field types in entities. They enable single-select or multi-select fields, such as expense types, categories, or status values. [UiPath Choice Sets Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets)
 */
export interface ChoiceSetServiceModel {
  /**
   * Gets all choice sets in the org
   *
   * @returns Promise resolving to an array of choice set metadata
   * {@link ChoiceSetGetAllResponse}
   * @example
   * ```typescript
   * // Get all choice sets
   * const choiceSets = await sdk.entities.choicesets.getAll();
   *
   * // Iterate through choice sets
   * choiceSets.forEach(choiceSet => {
   *   console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
   *   console.log(`Description: ${choiceSet.description}`);
   *   console.log(`Created by: ${choiceSet.createdBy}`);
   * });
   *
   * // Find a specific choice set by name
   * const expenseTypes = choiceSets.find(cs => cs.name === 'ExpenseTypes');
   *
   * // Check choice set details
   * if (expenseTypes) {
   *   console.log(`Last updated: ${expenseTypes.updatedTime}`);
   *   console.log(`Updated by: ${expenseTypes.updatedBy}`);
   * }
   * ```
   */
  getAll(): Promise<ChoiceSetGetAllResponse[]>;
}

