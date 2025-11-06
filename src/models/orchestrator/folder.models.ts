import { MachineGetAllOptions, MachineGetResponse, UpdateMachinesToFolderRequest, UpdateMachinesToFolderResponse } from './folder.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Folder Operations
 * 
 * Folders are organizational units in UiPath Orchestrator that help manage resources and permissions.
 */
export interface FolderServiceModel {
  /**
   * Gets all machines for a specific folder with optional filtering
   * 
   * The method returns either:
   * - An array of machines (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @signature getMachinesForFolder(folderId, options?) → Promise&lt;MachineGetResponse[]&gt;
   * @param folderId The ID of the folder to get machines for
   * @param options Query options including optional filter, orderby and pagination options
   * @returns Promise resolving to either an array of machines NonPaginatedResponse<MachineGetResponse> or a PaginatedResponse<MachineGetResponse> when pagination options are used.
   * {@link MachineGetResponse}
   * @example
   * ```typescript
   * // Standard array return
   * const machines = await sdk.folders.getMachinesForFolder(2466968);
   * 
   * // With filter
   * const machines = await sdk.folders.getMachinesForFolder(2466968, { 
   *   filter: "contains(Name,'Robot')"
   * });
   * 
   * // With custom ordering
   * const machines = await sdk.folders.getMachinesForFolder(2466968, { 
   *   orderby: "IsAssignedToFolder DESC,Name ASC"
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
  getMachinesForFolder<T extends MachineGetAllOptions = MachineGetAllOptions>(folderId: number, options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<MachineGetResponse>
      : NonPaginatedResponse<MachineGetResponse>
  >;

  /**
   * Updates machine to folder associations by adding or removing machines
   * 
   * @signature updateMachinesToFolderAssociations(request) → Promise&lt;UpdateMachinesToFolderResponse&gt;
   * @param request Request containing the folder ID and machine IDs to add/remove
   * @returns Promise resolving to the update result
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
  updateMachinesToFolderAssociations(request: UpdateMachinesToFolderRequest): Promise<UpdateMachinesToFolderResponse>;
}

