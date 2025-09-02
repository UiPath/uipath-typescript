import { 
  EntityGetRecordsByIdOptions, 
  EntityInsertOptions, 
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetByIdResponse
} from './entity.types';

/**
 * Entity service model interface
 */
export interface EntityServiceModel {
  /**
   * Gets entity metadata by entity ID with attached operation methods
   * 
   * @param id - UUID of the entity
   * @returns Promise resolving to entity metadata with operation methods
   */
  getById(id: string): Promise<EntityGetByIdResponse>;

  /**
   * Gets entity records by entity ID
   * 
   * @param id - UUID of the entity
   * @param options - Query options
   * @returns Promise resolving to query response
   */
  getRecordsById(id: string, options?: EntityGetRecordsByIdOptions): Promise<EntityRecord[]>;

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

  /**
   * Get records from this entity
   * 
   * @param options - Query options
   * @returns Promise resolving to array of entity records
   */
  getRecords(options?: EntityGetRecordsByIdOptions): Promise<EntityRecord[]>;
}

/**
 * Entity with methods combining metadata with operation methods
 */
export type EntityGetByIdResponse = RawEntityGetByIdResponse & EntityMethods;

/**
 * Creates entity methods that can be attached to entity data
 * 
 * @param entityData - The entity metadata
 * @param service - The entity service instance
 * @returns Object containing entity methods
 */
function createEntityMethods(entityData: RawEntityGetByIdResponse, service: EntityServiceModel): EntityMethods {
  return {
    async insert(data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');

      return service.insertById(entityData.id, data, options);
    },

    async update(data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');

      return service.updateById(entityData.id, data, options);
    },

    async delete(recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');

      return service.deleteById(entityData.id, recordIds, options);
    },

    async getRecords(options?: EntityGetRecordsByIdOptions): Promise<EntityRecord[]> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      
      return service.getRecordsById(entityData.id, options);
    }
  };
}

/**
 * Creates an actionable entity metadata by combining entity with operational methods
 * 
 * @param entityData - Entity metadata
 * @param service - The entity service instance
 * @returns Entity metadata with added methods
 */
export function createEntityWithMethods(
  entityData: RawEntityGetByIdResponse, 
  service: EntityServiceModel
): EntityGetByIdResponse {
  const methods = createEntityMethods(entityData, service);
  return Object.assign({}, entityData, methods) as EntityGetByIdResponse;
}