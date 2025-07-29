import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse } from '../../models/common/common-types';
import { 
  QueueDefinitionDto, 
  QueueGetAllOptions, 
  QueueServiceModel 
} from '../../models/orchestrator/queue';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends BaseService implements QueueServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets queues with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Optional folder ID
   * @returns Promise resolving to an array of queues
   * 
   * @example
   * ```typescript
   * // Get all queues
   * const queues = await sdk.queue.getAll();
   * 
   * // Get queues with filtering
   * const queues = await sdk.queue.getAll({ 
   *   filter: "name eq 'MyQueue'"
   * });
   * ```
   */
  async getAll(options: QueueGetAllOptions = {}, folderId?: number): Promise<QueueDefinitionDto[]> {
    let headerParams = {};
    if (folderId !== undefined) {
      headerParams = { [FOLDER_ID]: folderId };
    }
    const headers = createHeaders(headerParams);
    
    // Handle special parameters for queues
    const { mandatoryPermissions, atLeastOnePermissions, ...standardOptions } = options;
    
    // Prefix standard OData parameters with '$'
    const keysToPrefix = Object.keys(standardOptions);
    const apiOptions: Record<string, any> = addPrefixToKeys(standardOptions, '$', keysToPrefix);
    
    // Add the non-prefixed parameters
    if (mandatoryPermissions) {
      apiOptions.mandatoryPermissions = mandatoryPermissions;
    }
    
    if (atLeastOnePermissions) {
      apiOptions.atLeastOnePermissions = atLeastOnePermissions;
    }
    
    const response = await this.get<CollectionResponse<QueueDefinitionDto>>(
      QUEUE_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions,
        headers
      }
    );

    const transformedQueues = response.data?.value.map(queue => 
      pascalToCamelCaseKeys(queue) as QueueDefinitionDto
    );
    
    return transformedQueues;
  }

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Optional folder ID
   * @returns Promise resolving to a queue definition
   * 
   * @example
   * ```typescript
   * // Get queue by ID
   * const queue = await sdk.queue.getById(123);
   * 
   * // Get queue by ID with folder context
   * const queue = await sdk.queue.getById(123, 456);
   * ```
   */
  async getById(id: number, folderId?: number): Promise<QueueDefinitionDto> {
    let headerParams = {};
    if (folderId !== undefined) {
      headerParams = { [FOLDER_ID]: folderId };
    }
    const headers = createHeaders(headerParams);
    
    const response = await this.get<QueueDefinitionDto>(
      QUEUE_ENDPOINTS.GET_BY_ID(id),
      { headers }
    );

    return pascalToCamelCaseKeys(response.data) as QueueDefinitionDto;
  }
}
