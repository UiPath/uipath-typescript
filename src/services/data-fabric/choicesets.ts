import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import { ChoiceSetGetAllResponse } from '../../models/data-fabric/choicesets.types';
import { RawChoiceSetGetAllResponse } from '../../models/data-fabric/choicesets.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData } from '../../utils/transform';
import { EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';

export class ChoiceSetService extends BaseService implements ChoiceSetServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Transforms raw choice set data to expose only essential public fields
   * @param rawChoiceSet The raw choice set with all internal fields (after EntityMap transformation)
   * @returns Choice set with only public fields exposed
   * @private
   */
  private transformChoiceSet(rawChoiceSet: any): ChoiceSetGetAllResponse {
    return {
      name: rawChoiceSet.name,
      displayName: rawChoiceSet.displayName,
      description: rawChoiceSet.description,
      recordCount: rawChoiceSet.recordCount,
      folderId: rawChoiceSet.folderId,
      createdBy: rawChoiceSet.createdBy,
      updatedBy: rawChoiceSet.updatedBy,
      createdTime: rawChoiceSet.createdTime,
      updatedTime: rawChoiceSet.updatedTime
    };
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
    const response = await this.get<RawChoiceSetGetAllResponse[]>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL
    );

    // Transform API response to normalized field names (createTime -> createdTime, updateTime -> updatedTime)
    // and filter to only expose essential public fields
    return response.data.map(choiceSet =>
      this.transformChoiceSet(transformData(choiceSet, EntityMap))
    );
  }
}

