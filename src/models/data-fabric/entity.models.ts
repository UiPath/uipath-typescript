import { 
  EntityGetByIdOptions, 
  EntityGetByIdResponse, 
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
  getById(id: string, options?: EntityGetByIdOptions): Promise<Entity>;

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
 * Entity model class representing a Data Fabric entity
 */
export class Entity {
  /**
   * The unique identifier for this entity
   */
  public readonly id: string;

  /**
   * The entity data records
   */
  public readonly data: EntityRecord[];

  /**
   * The entity field metadata
   */
  public readonly fields: EntityGetByIdResponse['fields'];

  /**
   * The total count of records
   */
  public readonly totalCount: number;

  /**
   * Creates a new Entity instance
   * 
   * @param response - The entity response data
   * @param id - The entity ID
   * @param service - The service to use for operations
   */
  constructor(
    response: EntityGetByIdResponse,
    id: string,
    private readonly _service: EntityServiceModel
  ) {
    this.id = id;
    this.data = response.data;
    this.fields = response.fields;
    this.totalCount = response.totalCount;
  }

  /**
   * Insert data into this entity
   * 
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   */
  async insert(data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse> {
    return this._service.insertById(this.id, data, options);
  }

  /**
   * Update data in this entity
   * 
   * @param data - Array of records to update. Each record MUST contain the record Id,
   *               otherwise the update will fail.
   * @param options - Update options
   * @returns Promise resolving to update response
   */
  async update(data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse> {
    return this._service.updateById(this.id, data, options);
  }

  /**
   * Delete data from this entity
   * 
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   */
  async delete(recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse> {
    return this._service.deleteById(this.id, recordIds, options);
  }
}