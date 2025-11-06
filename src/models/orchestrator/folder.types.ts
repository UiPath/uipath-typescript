import { BaseOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Interface for machine response
 */
export interface MachineGetResponse {
  id: number;
  licenseKey: string | null;
  name: string;
  key: string;
  description: string | null;
  type: string;
  nonProductionSlots: number;
  unattendedSlots: number;
  testAutomationSlots: number;
  isAssignedToFolder: boolean;
  robotType: string;
  machineSessionRuntimeType: string;
  status: string;
}

/**
 * Options for getting machines for a folder
 */
export type MachineGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * OData filter expression
   */
  filter?: string;
  /**
   * OData orderby expression
   */
  orderby?: string;
}

/**
 * Request for updating machine to folder associations
 */
export interface UpdateMachinesToFolderRequest {
  /**
   * Association details
   */
  associations: {
    /**
     * The folder ID to associate machines with
     */
    folderId: number;
    /**
     * Array of machine IDs to add to the folder
     */
    addedMachineIds: number[];
    /**
     * Array of machine IDs to remove from the folder
     */
    removedMachineIds: number[];
  };
}

/**
 * Response from updating machine to folder associations
 */
export interface UpdateMachinesToFolderResponse {
  success: boolean;
}

export type MachineGetByIdOptions = BaseOptions

