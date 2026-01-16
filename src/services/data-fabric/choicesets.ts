import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import { ChoiceSetGetAllResponse, ChoiceSetValueGetResponse, ChoiceSetGetByIdOptions } from '../../models/data-fabric/choicesets.types';
import { RawChoiceSetGetAllResponse, RawChoiceSetValueGetResponse } from '../../models/data-fabric/choicesets.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData, parseJsonArray, pascalToCamelCaseKeys } from '../../utils/transform';
import { EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { CHOICESET_VALUES_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';

export class ChoiceSetService extends BaseService implements ChoiceSetServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all choice sets in the system
   *
   * @returns Promise resolving to an array of choice set metadata
   *
   * @example
   * ```typescript
   * // Get all choice sets
   * const choiceSets = await sdk.entities.choicesets.getAll();
   *
   * // Iterate through choice sets
   * choiceSets.forEach(choiceSet => {
   *   console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
   *   console.log(`Description: ${choiceSet.description}`);
   * });
   * ```
   */
  @track('Choicesets.GetAll')
  async getAll(): Promise<ChoiceSetGetAllResponse[]> {
    const rawResponse = await this.get<RawChoiceSetGetAllResponse[]>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL
    );

    // Transform field names
    const data = rawResponse.data || [];
    return data.map(choiceSet =>
      transformData(choiceSet, EntityMap) as unknown as ChoiceSetGetAllResponse
    );
  }

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
   *
   * @example
   * ```typescript
   * // Get all values (non-paginated)
   * const values = await sdk.entities.choicesets.getById('<choiceSetId>');
   *
   * // Iterate through choice set values
   * for (const value of values.items) {
   *   console.log(`Value: ${value.displayName} (${value.name})`);
   * }
   *
   * // First page with pagination
   * const page1 = await sdk.entities.choicesets.getById('<choiceSetId>', { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.entities.choicesets.getById('<choiceSetId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Choicesets.GetById')
  async getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choiceSetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ChoiceSetValueGetResponse>
      : NonPaginatedResponse<ChoiceSetValueGetResponse>
  > {
    // Transformation function for choice set values
    // Includes JSON parsing and transforms each item from PascalCase to camelCase
    const transformFn = (rawValue: unknown): ChoiceSetValueGetResponse[] => {
      const items = parseJsonArray<RawChoiceSetValueGetResponse>(rawValue);
      return items.map(item => {
        const camelCased = pascalToCamelCaseKeys(item);
        return transformData(camelCased, EntityMap) as unknown as ChoiceSetValueGetResponse;
      });
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_BY_ID(choiceSetId),
      transformFn,
      method: HTTP_METHODS.POST,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: CHOICESET_VALUES_PAGINATION.ITEMS_FIELD,
        totalCountField: CHOICESET_VALUES_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }
}

