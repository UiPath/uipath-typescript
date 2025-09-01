import { 
  EntityGetByIdOptions, 
  RawEntityGetByIdResponse, 
  EntityInsertOptions, 
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord
} from './entity.types';

/**
 * Entity service model interface
 */
export interface EntityServiceModel {
  /**
   * Gets entity data by entity ID
   * 
   * @param id - UUID of the entity
   * @param options - Query options
   * @returns Promise resolving to query response
   */
  getById(id: string, options?: EntityGetByIdOptions): Promise<EntityGetByIdResponse>;

  /**
   * Inserts data into an entity by entity ID
   * 
   * @param id - UUID of the entity
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   */
  insertById(id: string, data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse>;

  /**
   * Updates data in an entity by entity ID
   * 
   * @param id - UUID of the entity
   * @param data - Array of records to update. Each record MUST contain the record Id.
   * @param options - Update options
   * @returns Promise resolving to update response
   */
  updateById(id: string, data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse>;

  /**
   * Deletes data from an entity by entity ID
   * 
   * @param id - UUID of the entity
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   */
  deleteById(id: string, recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse>;
}

/**
 * Entity methods interface - defines operations that can be performed on an entity
 */
export interface EntityMethods {
  /**
   * Insert data into this entity
   * 
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   */
  insert(data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse>;

  /**
   * Update data in this entity
   * 
   * @param data - Array of records to update. Each record MUST contain the record Id,
   *               otherwise the update will fail.
   * @param options - Update options
   * @returns Promise resolving to update response
   */
  update(data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse>;

  /**
   * Delete data from this entity
   * 
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   */
  delete(recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse>;
}

/**
 * Entity type combining data with operational methods
 */
export type EntityGetByIdResponse = RawEntityGetByIdResponse & EntityMethods;

/**
 * Creates entity methods that can be attached to entity data
 * 
 * @param entityData - The entity data from API response
 * @param id - The entity ID
 * @param service - The entity service instance
 * @returns Object containing entity methods
 */
function createEntityMethods(entityData: RawEntityGetByIdResponse, service: EntityServiceModel): EntityMethods {
  return {
    async insert(data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse> {
      if (!entityData.id) throw new Error('Task ID is undefined');

      return service.insertById(entityData.id, data, options);
    },

    async update(data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse> {
      if (!entityData.id) throw new Error('Task ID is undefined');

      return service.updateById(entityData.id, data, options);
    },

    async delete(recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse> {
      if (!entityData.id) throw new Error('Task ID is undefined');

      return service.deleteById(entityData.id, recordIds, options);
    }
  };
}

/**
 * Creates an actionable entity by combining API entity data with operational methods
 * 
 * @param entityData - The entity data from API
 * @param id - The entity ID
 * @param service - The entity service instance
 * @returns An entity object with added methods
 */
export function createEntityWithMethods(
  entityData: RawEntityGetByIdResponse,
  id: string, 
  service: EntityServiceModel
): EntityGetByIdResponse {
  const methods = createEntityMethods(entityData, service);
  return Object.assign({}, entityData, methods, { id }) as EntityGetByIdResponse;
}