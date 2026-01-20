import {
  EntityGetRecordsByIdOptions,
  EntityInsertOptions,
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetResponse,
  EntityDownloadAttachmentOptions
} from './entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/**
 * Service for managing UiPath Data Fabric Entities.
 *
 * Entities are collections of records that can be used to store and manage data in the Data Fabric. [UiPath Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)
 *
 */
export interface EntityServiceModel {
  /**
   * Gets all entities in the system
   * 
   * @returns Promise resolving to either an array of entities NonPaginatedResponse<EntityGetResponse> or a PaginatedResponse<EntityGetResponse> when pagination options are used.
   * {@link EntityGetResponse}
   * @example
   * ```typescript
   * // Get all entities
   * const entities = await sdk.entities.getAll();
   * 
   * // Iterate through entities
   * entities.forEach(entity => {
   *   console.log(`Entity: ${entity.displayName} (${entity.name})`);
   *   console.log(`Type: ${entity.entityType}`);
   * });
   * 
   * // Find a specific entity by name
   * const customerEntity = entities.find(e => e.name === 'Customer');
   * 
   * // Use entity methods directly
   * if (customerEntity) {
   *   const records = await customerEntity.getRecords();
   *   console.log(`Customer records: ${records.items.length}`);
   * 
   *   const insertResult = await customerEntity.insert([
   *     { name: "John", age: 30 }
   *   ]);
   * }
   * ```
   */
  getAll(): Promise<EntityGetResponse[]>;

  /**
   * Gets entity metadata by entity ID with attached operation methods
   * 
   * @param id - UUID of the entity
   * @returns Promise resolving to entity metadata with operation methods
   * {@link EntityGetResponse}
   * @example
   * ```typescript
   * // Get entity metadata with methods
   * const entity = await sdk.entities.getById(<entityId>);
   * 
   * // Call operations directly on the entity
   * const records = await entity.getRecords();
   *
   * // If a field references a ChoiceSet, get the choiceSetId from records.fields
   * const choiceSetId = records.fields[0].referenceChoiceSet?.id;
   * if (choiceSetId) {
   *   const choiceSetValues = await sdk.entities.choicesets.getById(choiceSetId);
   * }
   *
   * const insertResult = await entity.insert([
   *   { name: "John", age: 30 }
   * ]);
   * ```
   */
  getById(id: string): Promise<EntityGetResponse>;

  /**
   * Gets entity records by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param options - Query options
   * @returns Promise resolving to either an array of entity records NonPaginatedResponse<EntityRecord> or a PaginatedResponse<EntityRecord> when pagination options are used.
   * {@link EntityRecord}
   * @example
   * ```typescript
   * // Basic usage (non-paginated)
   * const records = await sdk.entities.getRecordsById(<entityId>);
   * 
   * // With expansion level
   * const records = await sdk.entities.getRecordsById(<entityId>, {
   *   expansionLevel: 1
   * });
   * 
   * // With pagination
   * const paginatedResponse = await sdk.entities.getRecordsById(<entityId>, {
   *   pageSize: 50,
   *   expansionLevel: 1
   * });
   * 
   * // Navigate to next page
   * const nextPage = await sdk.entities.getRecordsById(<entityId>, {
   *   cursor: paginatedResponse.nextCursor,
   *   expansionLevel: 1
   * });
   * ```
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
   * {@link EntityInsertResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await sdk.entities.insertById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ]);
   * 
   * // With options
   * const result = await sdk.entities.insertById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  insertById(id: string, data: Record<string, any>[], options?: EntityInsertOptions): Promise<EntityInsertResponse>;

  /**
   * Updates data in an entity by entity ID
   * 
   * @param id - UUID of the entity
   * @param data - Array of records to update. Each record MUST contain the record Id.
   * @param options - Update options
   * @returns Promise resolving to update response
   * {@link EntityUpdateResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await sdk.entities.updateById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ]);
   * 
   * // With options
   * const result = await sdk.entities.updateById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  updateById(id: string, data: EntityRecord[], options?: EntityUpdateOptions): Promise<EntityUpdateResponse>;

  /**
   * Deletes data from an entity by entity ID
   *
   * @param id - UUID of the entity
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   * {@link EntityDeleteResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await sdk.entities.deleteById(<entityId>, [
   *   <recordId-1>, <recordId-2>
   * ]);
   * ```
   */
  deleteById(id: string, recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse>;

  /**
   * Downloads an attachment stored in a File-type field of an entity record.
   *
   * @param options - Options containing entityName, recordId, and fieldName
   * @returns Promise resolving to Blob containing the file content
   * @example
   * ```typescript
   * // First, get records to obtain the record ID
   * const records = await sdk.entities.getRecordsById(<entityId>);
   * // Get the recordId for the record that contains the attachment
   * const recordId = records.items[0].id;
   *
   * // Download attachment using SDK method
   * const response = await sdk.entities.downloadAttachment({
   *   entityName: 'Invoice',
   *   recordId: recordId,
   *   fieldName: 'Documents'
   * });
   *
   * // Or download using entity method
   * const entity = await sdk.entities.getById(<entityId>);
   * const response = await entity.downloadAttachment(recordId, 'Documents');
   *
   * // Browser: Display Image
   * const url = URL.createObjectURL(response);
   * document.getElementById('image').src = url;
   * // Call URL.revokeObjectURL(url) when done
   *
   * // Browser: Display PDF in iframe
   * const url = URL.createObjectURL(response);
   * document.getElementById('pdf-viewer').src = url;
   * // Call URL.revokeObjectURL(url) when done
   *
   * // Browser: Render PDF with PDF.js
   * const arrayBuffer = await response.arrayBuffer();
   * const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
   *
   * // Node.js: Save to file
   * const buffer = Buffer.from(await response.arrayBuffer());
   * fs.writeFileSync('attachment.pdf', buffer);
   * ```
   */
  downloadAttachment(options: EntityDownloadAttachmentOptions): Promise<Blob>;
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

  /**
   * Downloads an attachment stored in a File-type field of an entity record
   *
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to Blob containing the file content
   */
  downloadAttachment(recordId: string, fieldName: string): Promise<Blob>;
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
    },

    async downloadAttachment(recordId: string, fieldName: string): Promise<Blob> {
      if (!entityData.name) throw new Error('Entity name is undefined');

      return service.downloadAttachment({
        entityName: entityData.name,
        recordId,
        fieldName
      });
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