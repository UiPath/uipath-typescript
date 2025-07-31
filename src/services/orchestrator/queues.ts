import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse } from '../../models/common/common-types';
import { 
  QueueGetResponse, 
  QueueGetAllOptions, 
  QueueGetByIdOptions,
  QueueServiceModel 
} from '../../models/orchestrator/queue';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../utils/constants/endpoints';
import { QueueMap } from '../../models/orchestrator/queues.constants';

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends BaseService implements QueueServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all queues across folders with optional filtering and folder scoping
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of queues
   * 
   * @example
   * ```typescript
   * // Get all queues across folders
   * const queues = await sdk.queue.getAll();
   * 
   * // Get queues within a specific folder
   * const queues = await sdk.queue.getAll({ 
   *   folderId: 123
   * });
   * 
   * // Get queues with filtering
   * const queues = await sdk.queue.getAll({ 
   *   filter: "name eq 'MyQueue'"
   * });
   * ```
   */
  async getAll(options: QueueGetAllOptions = {}): Promise<QueueGetResponse[]> {
    const { folderId, ...restOptions } = options;
    
    // If folderId is provided, use the folder-specific endpoint
    if (folderId !== undefined) {
      return this.getByFolder(folderId, restOptions);
    }
    
    // Otherwise get queues across all folders
    const keysToPrefix = Object.keys(restOptions);
    const apiOptions = addPrefixToKeys(restOptions, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<QueueGetResponse>>(
      QUEUE_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions
      }
    );

    const transformedQueues = response.data?.value.map(queue => 
      transformData(pascalToCamelCaseKeys(queue) as QueueGetResponse, QueueMap)
    );
    
    return transformedQueues;
  }

  /**
   * Gets queues in a folder with optional query parameters
   * 
   * @param folderId - required folder ID
   * @param options - Query options
   * @returns Promise resolving to an array of queues
   */
  private async getByFolder(folderId: number, options: QueueGetAllOptions = {}): Promise<QueueGetResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<QueueGetResponse>>(
      QUEUE_ENDPOINTS.GET_BY_FOLDER,
      { 
        params: apiOptions,
        headers
      }
    );

    const transformedQueues = response.data?.value.map(queue => 
      transformData(pascalToCamelCaseKeys(queue) as QueueGetResponse, QueueMap)
    );
    
    return transformedQueues;
  }

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition
   * 
   * @example
   * ```typescript
   * // Get queue by ID 
   * const queue = await sdk.queue.getById(123, 456);
   * ```
   */
  async getById(id: number, folderId: number, options: QueueGetByIdOptions = {}): Promise<QueueGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<QueueGetResponse>(
      QUEUE_ENDPOINTS.GET_BY_ID(id),
      { 
        headers,
        params: apiOptions
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as QueueGetResponse, QueueMap);
  }
}
