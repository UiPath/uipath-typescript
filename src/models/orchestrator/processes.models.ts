import { RequestOptions } from '../common/types';
import { ProcessGetAllOptions, ProcessGetResponse, ProcessStartRequest, ProcessStartResponse, ProcessGetByIdOptions, ProcessGetByNameOptions, ProcessStartOptions } from './processes.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing and executing UiPath Automation Processes.
 *
 * Processes (also known as automations or workflows) are the core units of automation in UiPath, representing sequences of activities that perform specific business tasks. [UiPath Processes Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-processes)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Processes } from '@uipath/uipath-typescript/processes';
 *
 * const processes = new Processes(sdk);
 * const allProcesses = await processes.getAll();
 * ```
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
   * const allProcesses = await processes.getAll();
   *
   * // Get processes within a specific folder
   * const folderProcesses = await processes.getAll({
   *   folderId: <folderId>
   * });
   *
   * // Get processes with filtering
   * const filteredProcesses = await processes.getAll({
   *   filter: "name eq 'MyProcess'"
   * });
   *
   * // First page with pagination
   * const page1 = await processes.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await processes.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await processes.getAll({
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
   * const process = await processes.getById(<processId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: ProcessGetByIdOptions): Promise<ProcessGetResponse>;

  /**
   * Retrieves a single process by name.
   *
   * @param name - Process name to search for
   * @param options - Optional folder scoping (`folderPath` or `folderKey`) and OData query parameters
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * // Get process by name with folder path
   * const process = await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
   *
   * // Get process by name with folder key
   * const process = await processes.getByName('MyProcess', { folderKey: 'folder-guid' });
   * ```
   */
  getByName(name: string, options?: ProcessGetByNameOptions): Promise<ProcessGetResponse>;

  /**
   * Starts a process execution (job).
   *
   * Folder context is supplied via the options object using `folderId`,
   * `folderPath`, or `folderKey`. When more than one is supplied, the server
   * prefers `folderPath` > `folderKey` > `folderId`.
   *
   * @param request - Process start configuration. Either `processKey` or `processName` must be provided.
   * @param options - Folder context plus optional OData query parameters
   * @returns Promise resolving to the started jobs
   * {@link ProcessStartResponse}
   * @example
   * ```typescript
   * // Start by name within a folder path
   * await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderPath: 'Shared/Finance' },
   * );
   *
   * // Start by key within a folder key
   * await processes.start(
   *   { processKey: '<process-key>' },
   *   { folderKey: '<folder-guid>' },
   * );
   *
   * // Start by name within a folder ID
   * await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderId: <folder-id> },
   * );
   * ```
   */
  start(
    request: ProcessStartRequest,
    options?: ProcessStartOptions,
  ): Promise<ProcessStartResponse[]>;

  /**
   * Starts a process execution (job) using the positional folder-ID form.
   *
   * @param request - Process start configuration. Either `processKey` or `processName` must be provided.
   * @param folderId - Numeric folder ID
   * @param options - Optional OData query parameters
   * @returns Promise resolving to the started jobs
   * {@link ProcessStartResponse}
   * @deprecated Pass folder context via the options object instead — `start(request, { folderId })`.
   * @example
   * ```typescript
   * await processes.start({ processName: 'MyProcess' }, <folderId>);
   * ```
   */
  start(
    request: ProcessStartRequest,
    folderId: number,
    options?: RequestOptions,
  ): Promise<ProcessStartResponse[]>;
}
