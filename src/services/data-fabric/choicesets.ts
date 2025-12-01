import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import { ChoiceSetGetAllResponse, ChoiceSetValue, ChoiceSetGetByIdOptions } from '../../models/data-fabric/choicesets.types';
import { RawChoiceSetGetAllResponse, RawChoiceSetValue } from '../../models/data-fabric/choicesets.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData } from '../../utils/transform';
import { EntityMap, ChoiceSetValueMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS } from '../../utils/constants/common';

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
   * Gets choice set values by choice set ID
   * 
   * @param choicesetId - UUID of the choice set
   * @param options - Query options including expansionLevel and pagination options
   * @returns Promise resolving to an array of choice set values or paginated response
   * 
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
  @track('Choicesets.GetById')
  async getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choicesetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ChoiceSetValue>
      : NonPaginatedResponse<ChoiceSetValue>
  > {
    // Transformation function for choice set values
    const transformChoiceSetValue = (item: RawChoiceSetValue): ChoiceSetValue => {
      return transformData(item, ChoiceSetValueMap) as unknown as ChoiceSetValue;
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_BY_ID(choicesetId),
      transformFn: transformChoiceSetValue,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ENTITY_PAGINATION.ITEMS_FIELD,
        totalCountField: ENTITY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      },
      excludeFromPrefix: ['expansionLevel'] // Don't add ODATA prefix to expansionLevel
    }, options) as any;
  }
}

