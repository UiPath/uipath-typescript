import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import { ChoiceSetGetAllResponse } from '../../models/data-fabric/choicesets.types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData } from '../../utils/transform';
import { EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with the UiPath Data Service ChoiceSet API
 *
 * Choice Sets are enumerated lists used as field types in entities, enabling
 * single or multi-select fields like expense types, categories, or statuses.
 *
 * @see {@link https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets | Choice Sets Documentation}
 */
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
   *   console.log(`Record count: ${choiceSet.recordCount}`);
   * });
   * ```
   */
  @track('Choicesets.GetAll')
  async getAll(): Promise<ChoiceSetGetAllResponse[]> {
    const response = await this.get<ChoiceSetGetAllResponse[]>(
      DATA_FABRIC_ENDPOINTS.CHOICESET.GET_ALL
    );

    // Transform API response to normalized field names (createTime -> createdTime, updateTime -> updatedTime)
    return response.data.map(choiceSet =>
      transformData(choiceSet, EntityMap)
    );
  }
}

