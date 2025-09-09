import { QueueGetAllOptions, QueueGetByIdOptions, QueueGetResponse } from './queue.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Queue service model interface
 */
export interface QueueServiceModel {
  /**
   * Gets all queues across folders with optional filtering and folder scoping
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to NonPaginatedResponse or a paginated result
   */
  getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  >;

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;
} 