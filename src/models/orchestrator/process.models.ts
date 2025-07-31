import { RequestOptions } from '../common/common-types';
import { ProcessGetAllOptions, ProcessGetResponse, ProcessStartRequest, ProcessStartResponse } from './process.types';

/**
 * Process service model interface
 */
export interface ProcessServiceModel {
  /**
   * Gets all processes across folders with optional filtering
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of processes
   */
  getAll(options?: ProcessGetAllOptions): Promise<ProcessGetResponse[]>;
  
  /**
   * Starts a process with the specified configuration
   * 
   * @param request - Process start configuration
   * @param folderId - Required folder ID
   * @param options - Optional request options
   * @returns Promise resolving to array of started process instances
   */
  startProcess(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
} 