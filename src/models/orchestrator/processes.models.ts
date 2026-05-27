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
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * // By folder ID
   * await processes.getByName('MyProcess', { folderId: 123 });
   *
   * // By folder key (GUID)
   * await processes.getByName('MyProcess', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
   *
   * // With expand
   * await processes.getByName('MyProcess', { folderPath: 'Shared/Finance', expand: 'entryPoints' });
   * ```
   */
  getByName(name: string, options?: ProcessGetByNameOptions): Promise<ProcessGetResponse>;

  /**
   * Starts a process with the specified configuration.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * inside the options.
   *
   * @param request - Process start configuration
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`, `filter`, `orderby`)
   * @returns Promise resolving to array of started process instances
   * {@link ProcessStartResponse}
   * @example
   * ```typescript
   * // By folder ID
   * await processes.start({ processKey: '<processKey>' }, { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await processes.start({ processKey: '<processKey>' }, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await processes.start({ processKey: '<processKey>' }, { folderPath: 'Shared/Finance' });
   *
   * // Start by process name (instead of processKey)
   * await processes.start({ processName: 'MyProcess' }, { folderId: <folderId> });
   *
   * // With additional options
   * await processes.start({ processKey: '<processKey>' }, { folderId: <folderId>, expand: 'Robot' });
   * ```
   */
  start(request: ProcessStartRequest, options?: ProcessStartOptions): Promise<ProcessStartResponse[]>;
  /**
   * Starts a process — positional `folderId` form.
   *
   * @deprecated Use the options-object form: `start(request, { folderId })`. See {@link ProcessStartOptions} for the supported options.
   *
   * @param request - Process start configuration
   * @param folderId - Required folder ID (numeric)
   * @param options - Optional request options
   * @returns Promise resolving to array of started process instances
   * {@link ProcessStartResponse}
   */
  start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
}
