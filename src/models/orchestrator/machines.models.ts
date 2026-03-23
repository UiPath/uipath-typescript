import { MachineGetAllOptions, MachineGetByIdOptions, MachineGetResponse } from './machines.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for retrieving UiPath Orchestrator Machines.
 *
 * Machines are entities in Orchestrator that host Robots and manage runtime slots for automation execution. [UiPath Machines Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-machines)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Machines } from '@uipath/uipath-typescript/machines';
 *
 * const machines = new Machines(sdk);
 * const result = await machines.getAll();
 * console.log(result.items); // array of machines
 * ```
 */
export interface MachineServiceModel {
  /**
   * Gets all machines with optional filtering
   * Returns a NonPaginatedResponse with items array and optional totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   *
   * @param options - Query options including optional filter and pagination options
   * @returns Promise resolving to NonPaginatedResponse<MachineGetResponse> or PaginatedResponse<MachineGetResponse> when pagination options are used.
   * {@link MachineGetResponse}
   * @example
   * ```typescript
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
   * const machine = await machines.getById(123);
   * ```
   */
  getById(id: number, options?: MachineGetByIdOptions): Promise<MachineGetResponse>;
}
