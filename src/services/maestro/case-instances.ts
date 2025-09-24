import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  CaseInstanceGetResponse, 
  RawCaseInstanceGetResponse,
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstancesServiceModel,
  createCaseInstanceWithMethods
} from '../../models/maestro';
import { CaseJsonResponse } from '../../models/maestro/case-instances.internal-types';
import { OperationResponse } from '../../models/common/types';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData } from '../../utils/transform';
import { CaseInstanceMap, CaseAppConfigMap } from '../../models/maestro/case-instances.constants';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PROCESS_INSTANCE_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS } from '../../utils/constants/common';
import { track } from '../../core/telemetry';
import { ProcessType } from '../../models/maestro/cases.internal-types';
import { FOLDER_KEY } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';


export class CaseInstancesService extends BaseService implements CaseInstancesServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Get all case instances with optional filtering and pagination
   * 
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options -Query parameters for filtering instances and pagination
   * @returns Promise resolving to case instances or paginated result
   * 
   * @example
   * ```typescript
   * // Get all case instances (non-paginated)
   * const instances = await sdk.maestro.cases.instances.getAll();
   * 
   * // Close faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.close({ comment: 'Closing faulted case instance' });
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.cases.instances.getAll({
   *   processKey: 'MyCaseProcess'
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.maestro.cases.instances.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.maestro.cases.instances.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('CaseInstances.GetAll')
  async getAll<T extends CaseInstanceGetAllWithPaginationOptions = CaseInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseInstanceGetResponse>
      : NonPaginatedResponse<CaseInstanceGetResponse>
  > {
    // Add processType filter to only get case management instances
    const enhancedOptions = {
      ...options,
      processType: ProcessType.CaseManagement
    };

    // Base transformation function for case instances (synchronous)
    const transformCaseInstance = (item: any) => {
      const rawInstance = transformData(item, CaseInstanceMap);
      return createCaseInstanceWithMethods(rawInstance, this);
    };

    // Get the paginated result with basic transformation
    const result = await PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => MAESTRO_ENDPOINTS.INSTANCES.GET_ALL,
      transformFn: transformCaseInstance,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: PROCESS_INSTANCE_PAGINATION.ITEMS_FIELD,
        continuationTokenField: PROCESS_INSTANCE_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: PROCESS_INSTANCE_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: PROCESS_INSTANCE_TOKEN_PARAMS.TOKEN_PARAM
        }
      },
      excludeFromPrefix: Object.keys(enhancedOptions || {})
    }, enhancedOptions);

    // Enhance instances with case JSON data if requested
    if (result.items && result.items.length > 0) {
      const enhancedItems = await this.enhanceInstancesWithCaseJson(result.items);
      return {
        ...result,
        items: enhancedItems
      } as any;
    }
    
    return result as any;
  }

  /**
   * Get a case instance by ID with operation methods (close, pause, resume)
   * @param instanceId - The ID of the instance to retrieve
   * @param folderKey - Required folder key
   * @returns Promise<CaseInstanceGetResponse>
   */
  @track('CaseInstances.GetById')
  async getById(instanceId: string, folderKey: string): Promise<CaseInstanceGetResponse> {
    const response = await this.get<RawCaseInstanceGetResponse>(
      MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(instanceId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );
    
    const transformedInstance = transformData(response.data, CaseInstanceMap);
    const instanceWithMethods = createCaseInstanceWithMethods(transformedInstance, this);
    
    // Enhance with case JSON data
    return this.enhanceInstanceWithCaseJson(instanceWithMethods);
  }

  /**
   * Enhance a single case instance with case JSON data
   * @param instance - The case instance to enhance
   * @returns Promise resolving to enhanced instance
   * @private
   */
  private async enhanceInstanceWithCaseJson(instance: CaseInstanceGetResponse): Promise<CaseInstanceGetResponse> {
    if (!instance.folderKey) {
      return instance;
    }

    try {
      const caseJson = await this.getCaseJson(instance.instanceId, instance.folderKey);
      if (caseJson && caseJson.root) {
        // Transform caseAppConfig
        const transformedCaseAppConfig = caseJson.root.caseAppConfig ? (() => {
          const transformed = transformData(caseJson.root.caseAppConfig, CaseAppConfigMap) as any;
          // Remove id field from each overview item
          if (transformed.overview) {
            transformed.overview = transformed.overview.map(({ id, ...rest }: any) => rest);
          }
          return transformed;
        })() : undefined;

        return {
          ...instance,
          ...(transformedCaseAppConfig && { caseAppConfig: transformedCaseAppConfig }),
          ...(caseJson.root.name && { caseType: caseJson.root.name }),
          ...(caseJson.root.description && { caseTitle: caseJson.root.description })
        };
      }
    } catch (error) {
      console.debug(`Failed to fetch case JSON for instance ${instance.instanceId}:`, error);
    }
    
    return instance;
  }

  /**
   * Enhance multiple case instances with case JSON data
   * @param instances - Array of case instances to enhance
   * @returns Promise resolving to array of enhanced instances
   * @private
   */
  private async enhanceInstancesWithCaseJson(instances: CaseInstanceGetResponse[]): Promise<CaseInstanceGetResponse[]> {
    return Promise.all(
      instances.map(instance => this.enhanceInstanceWithCaseJson(instance))
    );
  }

  /**
   * Get case JSON for a specific instance
   * @param instanceId - The case instance ID
   * @param folderKey - Required folder key
   * @returns Promise resolving to case JSON data
   * @private
   */
  private async getCaseJson(instanceId: string, folderKey: string): Promise<CaseJsonResponse | null> {
    try {
      const response = await this.get<CaseJsonResponse>(
        MAESTRO_ENDPOINTS.CASES.GET_CASE_JSON(instanceId),
        {
          headers: createHeaders({ [FOLDER_KEY]: folderKey })
        }
      );
      return response.data;
    } catch (error) {
      // Return null if the case JSON is not available
      return null;
    }
  }

  /**
   * Close a case instance
   * @param instanceId - The ID of the instance to cancel
   * @param folderKey - Required folder key
   * @param options - Optional cancellation options with comment
   * @returns Promise resolving to operation result with updated instance data
   */
  @track('CaseInstances.Close')
  async close(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }

  /**
   * Pause a case instance
   * @param instanceId - The ID of the instance to pause
   * @param folderKey - Required folder key
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result with updated instance data
   */
  @track('CaseInstances.Pause')
  async pause(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }

  /**
   * Resume a case instance
   * @param instanceId - The ID of the instance to resume
   * @param folderKey - Required folder key
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result with updated instance data
   */
  @track('CaseInstances.Resume')
  async resume(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }
}