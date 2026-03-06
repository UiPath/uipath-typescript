import { MachineGetAllOptions, MachineGetByIdOptions, MachineGetResponse } from './machines.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for retrieving UiPath Orchestrator Machines.
 *
 * Machines represent the physical or virtual computers where UiPath Robots are deployed and execute automations. [UiPath Machines Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-machines)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Machines } from '@uipath/uipath-typescript/machines';
 *
 * const machines = new Machines(sdk);
 * const allMachines = await machines.getAll();
 * ```
 */
export interface MachineServiceModel {
  /**
   * Gets all machines with optional filtering
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   *
   * @param options - Query options including optional filter and pagination options
   * @returns Promise resolving to either an array of machines NonPaginatedResponse<MachineGetResponse> or a PaginatedResponse<MachineGetResponse> when pagination options are used.
   * {@link MachineGetResponse}
   * @example
   * ```typescript
   * // Standard array return
   * const allMachines = await machines.getAll();
   *
   * // Get machines with filtering
   * const filteredMachines = await machines.getAll({
   *   filter: "name eq 'MyMachine'"
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
  getAll<T extends MachineGetAllOptions = MachineGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<MachineGetResponse>
      : NonPaginatedResponse<MachineGetResponse>
  >;

  /**
   * Gets a single machine by ID
   *
   * @param id - Machine ID
   * @param options - Optional query parameters
   * @returns Promise resolving to a single machine
   * {@link MachineGetResponse}
   * @example
   * ```typescript
   * // Get machine by ID
   * const machine = await machines.getById(<machineId>);
   * ```
   */
  getById(id: number, options?: MachineGetByIdOptions): Promise<MachineGetResponse>;
}
