import { ChoiceSetGetResponse } from './choicesets.types';

/**
 * Service for managing UiPath Data Fabric Choice Sets.
 * 
 * Choice Sets are predefined lists of values that can be used across entities in the Data Fabric.
 */
export interface ChoiceSetServiceModel {
  /**
   * Gets all choice sets in the system
   * 
   * @returns Promise resolving to an array of choice set metadata
   * {@link ChoiceSetGetResponse}
   * @example
   * ```typescript
   * // Get all choice sets
   * const choiceSets = await sdk.entities.choicesets.getAll();
   * 
   * // Iterate through choice sets
   * choiceSets.forEach(choiceSet => {
   *   console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
   *   console.log(`Record count: ${choiceSet.recordCount}`);
   * });
   * ```
   */
  getAll(): Promise<ChoiceSetGetResponse[]>;
}

