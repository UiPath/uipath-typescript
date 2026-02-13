import { RequestOptions } from '../common/types';
import { ProcessGetAllOptions, ProcessGetResponse, ProcessStartRequest, ProcessStartResponse, ProcessGetByIdOptions } from './processes.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing and executing UiPath Automation Processes.
 * 
 * Processes (also known as automations or workflows) are the core units of automation in UiPath, representing sequences of activities that perform specific business tasks. [UiPath Processes Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-processes)
 */
export interface ProcessServiceModel {
  /**
   * Gets all processes across folders with optional filtering
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of processes NonPaginatedResponse<ProcessGetResponse> or a PaginatedResponse<ProcessGetResponse> when pagination options are used.
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * // Standard array return
   * const processes = await sdk.processes.getAll();
   * 
   * // Get processes within a specific folder
   * const processes = await sdk.processes.getAll({ 
   *   folderId: <folderId>
   * });
   * 
   * // Get processes with filtering
   * const processes = await sdk.processes.getAll({ 
   *   filter: "name eq 'MyProcess'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.processes.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.processes.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.processes.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends ProcessGetAllOptions = ProcessGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ProcessGetResponse>
      : NonPaginatedResponse<ProcessGetResponse>
  >;
  
  /**
   * Gets a single process by ID
   * 
   * @param id - Process ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * // Get process by ID
   * const process = await sdk.processes.getById(<processId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: ProcessGetByIdOptions): Promise<ProcessGetResponse>;
  
  /**
   * Starts a process with the specified configuration
   * 
   * @param request - Process start configuration
   * @param folderId - Required folder ID
   * @param options - Optional request options
   * @returns Promise resolving to array of started process instances
   * {@link ProcessStartResponse}
   * @example
   * ```typescript
   * // Start a process by process key
   * const process = await sdk.processes.start({
   *   processKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   * }, <folderId>); // folderId is required
   * 
   * // Start a process by name with specific robots
   * const process = await sdk.processes.start({
   *   processName: "MyProcess"
   * }, <folderId>); // folderId is required
   * ```
   */
  start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
} 