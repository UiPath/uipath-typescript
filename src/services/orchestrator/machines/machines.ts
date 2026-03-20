import { BaseService } from '../../base';
import {
  MachineGetResponse,
  MachineGetAllOptions,
  MachineGetByIdOptions
} from '../../../models/orchestrator/machines.types';
import { MachineServiceModel } from '../../../models/orchestrator/machines.models';
import { addPrefixToKeys, pascalToCamelCaseKeys } from '../../../utils/transform';
import { MACHINE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Machines API
 */
export class MachineService extends BaseService implements MachineServiceModel {
  /**
   * Gets all machines with optional filtering
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array and optional totalCount (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param options - Query options including optional filters and pagination
   * @returns Promise resolving to NonPaginatedResponse or PaginatedResponse
   *
   * @example
   * ```typescript
   * import { Machines } from '@uipath/uipath-typescript/machines';
   *
   * const machines = new Machines(sdk);
   *
   * // Get all machines
   * const result = await machines.getAll();
   * console.log(result.items); // MachineGetResponse[]
   *
   * // Get machines with filtering
   * const filteredMachines = await machines.getAll({
   *   filter: "Name eq 'MyMachine'"
   * });
   *
   * // First page with pagination
   * const page1 = await machines.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await machines.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await machines.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Machines.GetAll')
  async getAll<T extends MachineGetAllOptions = MachineGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<MachineGetResponse>
      : NonPaginatedResponse<MachineGetResponse>
  > {
    const transformMachineResponse = (machine: any) =>
      pascalToCamelCaseKeys(machine) as MachineGetResponse;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => MACHINE_ENDPOINTS.GET_ALL,
      transformFn: transformMachineResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }

  /**
   * Gets a single machine by ID
   *
   * @param id - Machine ID
   * @param options - Optional query parameters
   * @returns Promise resolving to a single machine
   *
   * @example
   * ```typescript
   * import { Machines } from '@uipath/uipath-typescript/machines';
   *
   * const machines = new Machines(sdk);
   *
   * // Get machine by ID
   * const machine = await machines.getById(123);
   * ```
   */
  @track('Machines.GetById')
  async getById(id: number, options: MachineGetByIdOptions = {}): Promise<MachineGetResponse> {
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<MachineGetResponse>(
      MACHINE_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions
      }
    );

    return pascalToCamelCaseKeys(response.data) as MachineGetResponse;
  }
}
