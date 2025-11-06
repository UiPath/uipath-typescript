import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { 
  MachineGetResponse, 
  MachineGetAllOptions,
  UpdateMachinesToFolderRequest,
  UpdateMachinesToFolderResponse
} from '../../models/orchestrator/folder.types';
import { FolderServiceModel } from '../../models/orchestrator/folder.models';
import { pascalToCamelCaseKeys, transformData, camelToPascalCaseKeys } from '../../utils/transform';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { MachineMap } from '../../models/orchestrator/folder.constants';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Folder API
 */
export class FolderService extends BaseService implements FolderServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all machines for a specific folder with optional filtering
   * 
   * The method returns either:
   * - An array of machines (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param folderId - The ID of the folder to get machines for
   * @param options - Query options including optional filter, orderby and pagination options
   * @returns Promise resolving to an array of machines or paginated result
   * 
   * @example
   * ```typescript
   * // Standard array return
   * const machines = await sdk.folders.getMachinesForFolder(2466968);
   * 
   * // With filter
   * const machines = await sdk.folders.getMachinesForFolder(2466968, { 
   *   filter: "contains(Name,'[Default] Cloud Robots - Serverless')"
   * });
   * 
   * // With custom ordering
   * const machines = await sdk.folders.getMachinesForFolder(2466968, { 
   *   orderby: "IsAssignedToFolder DESC,UnattendedSlots DESC,TestAutomationSlots DESC,NonProductionSlots DESC,Name ASC"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.folders.getMachinesForFolder(2466968, { pageSize: 25 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.folders.getMachinesForFolder(2466968, { cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.folders.getMachinesForFolder(2466968, {
   *   jumpToPage: 5,
   *   pageSize: 25
   * });
   * ```
   */
  @track('Folders.GetMachinesForFolder')
  async getMachinesForFolder<T extends MachineGetAllOptions = MachineGetAllOptions>(
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<MachineGetResponse>
      : NonPaginatedResponse<MachineGetResponse>
  > {
    // Transformation function for machines
    const transformMachineResponse = (machine: any) => 
      transformData(pascalToCamelCaseKeys(machine) as MachineGetResponse, MachineMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FOLDER_ENDPOINTS.GET_MACHINES_FOR_FOLDER(folderId),
      getByFolderEndpoint: FOLDER_ENDPOINTS.GET_MACHINES_FOR_FOLDER(folderId),
      transformFn: transformMachineResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,      
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM          
        }
      }
    }, options) as any;
  }

  /**
   * Updates machine to folder associations by adding or removing machines
   * 
   * @param request - Request containing the folder ID and machine IDs to add/remove
   * @returns Promise resolving to the update result
   * 
   * @example
   * ```typescript
   * // Add machines to a folder
   * await sdk.folders.updateMachinesToFolderAssociations({
   *   associations: {
   *     folderId: 377502,
   *     addedMachineIds: [244099],
   *     removedMachineIds: []
   *   }
   * });
   * 
   * // Remove machines from a folder
   * await sdk.folders.updateMachinesToFolderAssociations({
   *   associations: {
   *     folderId: 377502,
   *     addedMachineIds: [],
   *     removedMachineIds: [244099]
   *   }
   * });
   * 
   * // Add and remove machines in one call
   * await sdk.folders.updateMachinesToFolderAssociations({
   *   associations: {
   *     folderId: 377502,
   *     addedMachineIds: [244100, 244101],
   *     removedMachineIds: [244099]
   *   }
   * });
   * ```
   */
  @track('Folders.UpdateMachinesToFolderAssociations')
  async updateMachinesToFolderAssociations(
    request: UpdateMachinesToFolderRequest
  ): Promise<UpdateMachinesToFolderResponse> {
    // Convert request to PascalCase for API
    const pascalRequest = {
      associations: {
        FolderId: request.associations.folderId,
        AddedMachineIds: request.associations.addedMachineIds,
        RemovedMachineIds: request.associations.removedMachineIds
      }
    };

    const response = await this.post<any>(
      FOLDER_ENDPOINTS.UPDATE_MACHINES_TO_FOLDER_ASSOCIATIONS,
      pascalRequest
    );

    // Return success response
    return {
      success: true
    };
  }
}

