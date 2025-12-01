import { 
  ChoiceSetGetResponse,
  ChoiceSetValue,
  ChoiceSetGetByIdOptions 
} from './choicesets.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

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

  /**
   * Gets choice set values by choice set ID
   * 
   * @param choicesetId - UUID of the choice set
   * @param options - Query options including expansionLevel and pagination options
   * @returns Promise resolving to an array of choice set values or paginated response
   * {@link ChoiceSetValue}
   * @example
   * ```typescript
   * // Basic usage (non-paginated)
   * const values = await sdk.entities.choicesets.getById(<choicesetId>);
   * 
   * // With expansion level
   * const values = await sdk.entities.choicesets.getById(<choicesetId>, {
   *   expansionLevel: 1
   * });
   * 
   * // With pagination
   * const paginatedResponse = await sdk.entities.choicesets.getById(<choicesetId>, {
   *   pageSize: 50,
   *   expansionLevel: 1
   * });
   * 
   * // Navigate to next page
   * const nextPage = await sdk.entities.choicesets.getById(<choicesetId>, {
   *   cursor: paginatedResponse.nextCursor,
   *   expansionLevel: 1
   * });
   * ```
   */
  getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choicesetId: string, 
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ChoiceSetValue>
      : NonPaginatedResponse<ChoiceSetValue>
  >;
}

