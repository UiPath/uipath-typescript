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
   * Retrieves a single process by name, optionally scoped to a folder
   *
   * Uses the process name and folder path (or folder key) to look up the resource.
   * The folder context is resolved server-side via the X-UIPATH-FolderPath-Encoded /
   * X-UIPATH-FolderKey headers — no client-side folder ID resolution is needed.
   * The folder path is URL-encoded automatically before being sent.
   *
   * @param name - Process name to search for
   * @param options - Optional folder scoping and query parameters
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * // Get process by name with folder path
   * const process = await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
   *
   * // Get process by name with folder key
   * const process = await processes.getByName('MyProcess', { folderKey: 'folder-guid' });
   *
   * // Get process by name (uses default folder context)
   * const process = await processes.getByName('MyProcess');
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
   * The legacy positional-`folderId` form (`start(request, 123, options?)`)
   * remains supported for backward compatibility but is deprecated; prefer
   * passing the options object.
   *
   * @param request - Process start configuration. Either `processKey` or `processName` must be provided.
   * @param optionsOrFolderId - Options object (preferred) or legacy positional folder ID
   * @param legacyOptions - Legacy options object (used only with positional folderId)
   * @returns Promise resolving to the started jobs
   * {@link ProcessStartResponse}
   * @example
   * ```typescript
   * // Preferred — options object with folder context
   * await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderPath: 'Shared/Finance' },
   * );
   *
   * await processes.start(
   *   { processKey: '<process-key>' },
   *   { folderKey: '<folder-guid>' },
   * );
   *
   * // Legacy positional form (still works)
   * await processes.start({ processName: 'MyProcess' }, <folderId>);
   * ```
   */
  start(
    request: ProcessStartRequest,
    optionsOrFolderId?: ProcessStartOptions | number,
    legacyOptions?: RequestOptions,
  ): Promise<ProcessStartResponse[]>;
}