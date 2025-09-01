import { QueueGetAllOptions, QueueGetByIdOptions, QueueGetResponse } from './queue.types';

/**
 * Queue service model interface
 */
export interface QueueServiceModel {
  /**
   * Gets all queues across folders with optional filtering and folder scoping
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of queues
   */
  getAll(options?: QueueGetAllOptions): Promise<QueueGetResponse[]>;

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;
} 