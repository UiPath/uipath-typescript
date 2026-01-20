import {
  ChoiceSetGetAllResponse,
  ChoiceSetGetResponse,
  ChoiceSetGetByIdOptions
} from './choicesets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

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

  /**
   * Gets choice set values by choice set ID with optional pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param choiceSetId - UUID of the choice set
   * @param options - Pagination options
   * @returns Promise resolving to choice set values or paginated result
   * {@link ChoiceSetGetResponse}
   * @example
   * ```typescript
   * // First, get the choice set ID using getAll()
   * const choiceSets = await sdk.entities.choicesets.getAll();
   * const expenseTypes = choiceSets.find(cs => cs.name === 'ExpenseTypes');
   * const choiceSetId = expenseTypes.id;
   *
   * // Get all values (non-paginated)
   * const values = await sdk.entities.choicesets.getById(choiceSetId);
   *
   * // Iterate through choice set values
   * for (const value of values.items) {
   *   console.log(`Value: ${value.displayName}`);
   * }
   *
   * // First page with pagination
   * const page1 = await sdk.entities.choicesets.getById(choiceSetId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.entities.choicesets.getById(choiceSetId, { cursor: page1.nextCursor });
   * }
   * ```
   */
  getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choiceSetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ChoiceSetGetResponse>
      : NonPaginatedResponse<ChoiceSetGetResponse>
  >;
}

