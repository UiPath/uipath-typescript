import { RequestOptions } from '../common/types';
import { ProcessGetAllOptions, ProcessGetResponse, ProcessRef, ProcessStartRefOptions, ProcessStartRequest, ProcessStartResponse, ProcessGetByIdOptions, ProcessGetByNameOptions, ProcessStartOptions } from './processes.types';
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
   * Starts a process identified by `processRef` (`{ id }`, `{ name }`, or `{ key }` (GUID)).
   *
   * Folder context and every startInfo field (`jobPriority`, `jobsCount`, `robotIds`,
   * `inputArguments`, etc.) live in `options`. Runtime resource overrides apply on the
   * `{ name }` and `{ key }` branches — a cross-folder redirect steers both the wire body
   * identity and the `X-UIPATH-FolderPath-Encoded` header to the override target.
   *
   * Ref resolution:
   * - `{ id }` — resolves numeric release id to its key via an internal `getById` lookup,
   *   then sends `ReleaseKey` on the wire.
   * - `{ name }` — sent as `ReleaseName` on the wire; the server resolves it against the
   *   ambient folder scope.
   * - `{ key }` — sent as `ReleaseKey` on the wire.
   *
   * @param processRef - Process ref (`{ id }`, `{ name }`, or `{ key }` (GUID))
   * @param options - Folder scoping + startInfo fields + optional OData query
   * @returns Promise resolving to an array of started process instances of {@link ProcessStartResponse}
   *
   * @example
   * ```typescript
   * import { JobPriority } from '@uipath/uipath-typescript/processes';
   *
   * // By numeric release id
   * await processes.start({ id: <releaseId> }, { folderId: <folderId> });
   *
   * // By process name + folder path (folder scoping applies to both the lookup and the start)
   * await processes.start({ name: 'InvoiceReview' }, { folderPath: 'Shared/Live' });
   *
   * // By release key (GUID)
   * await processes.start({ key: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' }, { folderKey: '<folderKey>' });
   *
   * // With startInfo options
   * await processes.start(
   *   { name: 'InvoiceReview' },
   *   { folderPath: 'Shared/Live', jobPriority: JobPriority.High, jobsCount: 3 },
   * );
   * ```
   */
  start(processRef: ProcessRef, options?: ProcessStartRefOptions): Promise<ProcessStartResponse[]>;
  /**
   * Starts a process — legacy `ProcessStartRequest` form.
   *
   * @deprecated Use the ref-based form: `start(processRef, options?)`. See {@link ProcessRef}
   * and {@link ProcessStartRefOptions} for the recommended shape.
   *
   * @param request - Process start configuration
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters
   * @returns Promise resolving to array of started process instances
   */
  start(request: ProcessStartRequest, options?: ProcessStartOptions): Promise<ProcessStartResponse[]>;
  /**
   * Starts a process — positional `folderId` form.
   *
   * @deprecated Use the ref-based form: `start(processRef, { folderId })`. See {@link ProcessRef}.
   *
   * @param request - Process start configuration
   * @param folderId - Required folder ID (numeric)
   * @param options - Optional request options
   * @returns Promise resolving to array of started process instances
   */
  start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
}
