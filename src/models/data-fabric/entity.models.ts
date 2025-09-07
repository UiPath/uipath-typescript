import { 
  EntityGetRecordsByIdOptions, 
  EntityInsertOptions, 
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetResponse
} from './entity.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/pagination.types';

/**
 * Entity service model interface
 */
export interface EntityServiceModel {
  /**
   * Gets all entities in the system
   * 
   * @returns Promise resolving to an array of entity metadata
   */
  getAll(): Promise<EntityGetResponse[]>;

  /**
   * Gets entity metadata by entity ID with attached operation methods
   * 
   * @param id - UUID of the entity
   * @returns Promise resolving to entity metadata with operation methods
   */
  getById(id: string): Promise<EntityGetResponse>;

  /**
   * Gets entity records by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param options - Query options
   * @returns Promise resolving to query response
   */
  getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(entityId: string, options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

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
   * @returns Promise resolving to query response
   */
  getRecords<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;
}

/**
 * Entity with methods combining metadata with operation methods
 */
export type EntityGetResponse = RawEntityGetResponse & EntityMethods;

/**
 * Creates entity methods that can be attached to entity data
 * 
 * @param entityData - The entity metadata
 * @param service - The entity service instance
 * @returns Object containing entity methods
 */
function createEntityMethods(entityData: RawEntityGetResponse, service: EntityServiceModel): EntityMethods {
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

    async getRecords<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<EntityRecord>
        : NonPaginatedResponse<EntityRecord>
    > {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      
      return service.getRecordsById(entityData.id, options) as any;
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
  entityData: RawEntityGetResponse, 
  service: EntityServiceModel
): EntityGetResponse {
  const methods = createEntityMethods(entityData, service);
  return Object.assign({}, entityData, methods) as EntityGetResponse;
}