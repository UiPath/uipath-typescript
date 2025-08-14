import { EntityGetByIdOptions, EntityGetByIdResponse } from './entity.types';

/**
 * Entity service model interface
 */
export interface EntityServiceModel {
  /**
   * Gets entity data by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param options - Query options
   * @returns Promise resolving to query response
   */
  getById(entityId: string, options?: EntityGetByIdOptions): Promise<EntityGetByIdResponse>;
}