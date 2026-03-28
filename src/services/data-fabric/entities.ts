import { BaseService } from '../base';
import { EntityServiceModel, EntityGetResponse, createEntityWithMethods } from '../../models/data-fabric/entities.models';
import {
  EntityGetRecordsByIdOptions,
  EntityGetAllRecordsOptions,
  EntityGetRecordByIdOptions,
  EntityInsertOptions,
  EntityInsertRecordOptions,
  EntityBatchInsertOptions,
  EntityInsertRecordsOptions,
  EntityInsertResponse,
  EntityBatchInsertResponse,
  EntityUpdateOptions,
  EntityUpdateRecordOptions,
  EntityUpdateRecordResponse,
  EntityUpdateRecordsOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteRecordsOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetResponse,
  EntityFieldDataType,
  EntityFileType,
  EntityUploadAttachmentOptions,
  EntityUploadAttachmentResponse,
  EntityDeleteAttachmentResponse,
  EntityQueryOptions,
  EntityQueryResponse
} from '../../models/data-fabric/entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS } from '../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { RESPONSE_TYPES } from '../../utils/constants/headers';
import { createParams } from '../../utils/http/params';
import { pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { EntityFieldTypeMap, SqlFieldType, EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  /**
   * Gets entity metadata by entity ID with attached operation methods
   *
   * @param id - UUID of the entity
   * @returns Promise resolving to entity metadata with schema information and operation methods
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   * const entity = await entities.getById("<entityId>");
   *
   * // Call operations directly on the entity
   * const records = await entity.getAllRecords();
   *
   * // Insert a single record
   * const insertResult = await entity.insertRecord({ name: "John", age: 30 });
   *
   * // Or batch insert multiple records
   * const batchResult = await entity.insertRecords([
   *     { name: "Jane", age: 25 },
   *     { name: "Bob", age: 35 }
   * ]);
   * ```
   */
  @track('Entities.GetById')
  async getById(id: string): Promise<EntityGetResponse> {
    // Get entity metadata
    const response = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id)
    );
    
    // Apply EntityMap transformations
    const metadata = transformData(response.data as RawEntityGetResponse, EntityMap)
    
    // Transform metadata with field mappers
    this.applyFieldMappings(metadata);
    
    // Return the entity metadata with methods attached
    return createEntityWithMethods(metadata, this);
  }

  /**
   * Gets entity records by entity ID
   *
   * @param entityId - UUID of the entity
   * @param options - Query options including expansionLevel and pagination options
   * @returns Promise resolving to an array of entity records or paginated response
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage (non-paginated)
   * const records = await entities.getAllRecords("<entityId>");
   *
   * // With expansion level
   * const records = await entities.getAllRecords("<entityId>", {
   *   expansionLevel: 1
   * });
   *
   * // With pagination
   * const paginatedResponse = await entities.getAllRecords("<entityId>", {
   *   pageSize: 50,
   *   expansionLevel: 1
   * });
   *
   * // Navigate to next page
   * const nextPage = await entities.getAllRecords("<entityId>", {
   *   cursor: paginatedResponse.nextCursor,
   *   expansionLevel: 1
   * });
   * ```
   */
  @track('Entities.GetAllRecords')
  async getAllRecords<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(
    entityId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_RECORDS(entityId),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ENTITY_PAGINATION.ITEMS_FIELD,
        totalCountField: ENTITY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,    
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,         
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM            
        }
      },
      excludeFromPrefix: ['expansionLevel'] // Don't add ODATA prefix to expansionLevel
    }, options);
  }

  /**
   * Gets a single entity record by entity ID and record ID
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record
   * @param options - Query options including expansionLevel
   * @returns Promise resolving to the entity record
   *
   * @example
   * ```typescript
   * // Basic usage
   * const record = await sdk.entities.getRecordById(<entityId>, <recordId>);
   *
   * // With expansion level
   * const record = await sdk.entities.getRecordById(<entityId>, <recordId>, {
   *   expansionLevel: 1
   * });
   * ```
   */
  @track('Entities.GetRecordById')
  async getRecordById(
    entityId: string,
    recordId: string,
    options: EntityGetRecordByIdOptions = {}
  ): Promise<EntityRecord> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.get<EntityRecord>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_ID(entityId, recordId),
      { params }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    // Apply EntityMap transformations
    const transformedResponse = transformData(camelResponse, EntityMap);
    return transformedResponse;
  }
   
  /**
   * Inserts a single record into an entity by entity ID
   *
   * @param entityId - UUID of the entity
   * @param data - Record to insert
   * @param options - Insert options
   * @returns Promise resolving to the inserted record with generated record ID
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage
   * const result = await entities.insertRecordById("<entityId>", { name: "John", age: 30 });
   *
   * // With options
   * const result = await entities.insertRecordById("<entityId>", { name: "John", age: 30 }, {
   *   expansionLevel: 1
   * });
   * ```
   */
  @track('Entities.InsertRecordById')
  async insertRecordById(id: string, data: Record<string, any>, options: EntityInsertRecordOptions = {}): Promise<EntityInsertResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.post<EntityInsertResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_ID(id),
      data,
      {
        params,
        ...options
      }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Inserts data into an entity by entity ID using batch insert
   *
   * @param entityId - UUID of the entity
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage
   * const result = await entities.insertRecordsById("<entityId>", [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ]);
   *
   * // With options
   * const result = await entities.insertRecordsById("<entityId>", [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  @track('Entities.InsertRecordsById')
  async insertRecordsById(id: string, data: Record<string, any>[], options: EntityInsertRecordsOptions = {}): Promise<EntityBatchInsertResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel,
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityBatchInsertResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.BATCH_INSERT_BY_ID(id),
      data,
      {
        params,
        ...options
      }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Updates a single record in an entity by entity ID
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to update
   * @param data - Key-value pairs of fields to update
   * @param options - Update options
   * @returns Promise resolving to the updated record
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage
   * const result = await entities.updateRecordById("<entityId>", "<recordId>", { name: "John Updated", age: 31 });
   *
   * // With options
   * const result = await entities.updateRecordById("<entityId>", "<recordId>", { name: "John Updated", age: 31 }, {
   *   expansionLevel: 1
   * });
   * ```
   */
  @track('Entities.UpdateRecordById')
  async updateRecordById(entityId: string, recordId: string, data: Record<string, any>, options: EntityUpdateRecordOptions = {}): Promise<EntityUpdateRecordResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.post<EntityUpdateRecordResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_RECORD_BY_ID(entityId, recordId),
      data,
      {
        params,
        ...options
      }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Updates data in an entity by entity ID
   *
   * @param entityId - UUID of the entity
   * @param data - Array of records to update. Each record MUST contain the record Id,
   *               otherwise the update will fail.
   * @param options - Update options
   * @returns Promise resolving to update response
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage
   * const result = await entities.updateRecordsById("<entityId>", [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ]);
   *
   * // With options
   * const result = await entities.updateRecordsById("<entityId>", [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  @track('Entities.UpdateRecordsById')
  async updateRecordsById(id: string, data: EntityRecord[], options: EntityUpdateRecordsOptions = {}): Promise<EntityUpdateResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel,
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityUpdateResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_ID(id),
      data,
      {
        params,
        ...options
      }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Deletes data from an entity by entity ID
   *
   * @param entityId - UUID of the entity
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Basic usage
   * const result = await entities.deleteRecordsById("<entityId>", [
   *   "<recordId-1>", "<recordId-2>"
   * ]);
   * ```
   */
  @track('Entities.DeleteRecordsById')
  async deleteRecordsById(id: string, recordIds: string[], options: EntityDeleteRecordsOptions = {}): Promise<EntityDeleteResponse> {
    const params = createParams({
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityDeleteResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_ID(id),
      recordIds,
      {
        params,
        ...options
      }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Gets all entities in the system
   *
   * @returns Promise resolving to an array of entity metadata
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Get all entities
   * const allEntities = await entities.getAll();
   *
   * // Call operations on an entity
   * const records = await allEntities[0].getAllRecords();
   * ```
   */
  @track('Entities.GetAll')
  async getAll(): Promise<EntityGetResponse[]> {
    const response = await this.get<RawEntityGetResponse[]>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL
    );
    
    // Apply transformations
    const entities = response.data.map(entity => {
      // Transform each entity
      const metadata = transformData(entity as RawEntityGetResponse, EntityMap);
      this.applyFieldMappings(metadata);
      // Attach entity methods
      return createEntityWithMethods(metadata, this);
    });
    
    return entities;
  }

  /**
   * Downloads an attachment from an entity record field
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to Blob containing the file content
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Get the entityId from getAll()
   * const allEntities = await entities.getAll();
   * const entityId = allEntities[0].id;
   *
   * // Get the recordId from getAllRecords()
   * const records = await entities.getAllRecords(entityId);
   * const recordId = records[0].id;
   *
   * // Download attachment for a specific record and field
   * const blob = await entities.downloadAttachment(entityId, recordId, 'Documents');
   * ```
   */
  @track('Entities.DownloadAttachment')
  async downloadAttachment(entityId: string, recordId: string, fieldName: string): Promise<Blob> {
    const response = await this.get<Blob>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DOWNLOAD_ATTACHMENT(entityId, recordId, fieldName),
      {
        responseType: RESPONSE_TYPES.BLOB
      }
    );

    return response.data;
  }

  /**
   * Uploads an attachment to a File-type field of an entity record
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to upload the attachment to
   * @param fieldName - Name of the File-type field
   * @param file - File to upload (Blob, File, or Uint8Array)
   * @param options - Optional {@link EntityUploadAttachmentOptions} (e.g. expansionLevel)
   * @returns Promise resolving to {@link EntityUploadAttachmentResponse}
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Get the entityId from getAll()
   * const allEntities = await entities.getAll();
   * const entityId = allEntities[0].id;
   *
   * // Get the recordId from getAllRecords()
   * const records = await entities.getAllRecords(entityId);
   * const recordId = records[0].id;
   *
   * // Upload a file attachment
   * const response = await entities.uploadAttachment(entityId, recordId, 'Documents', file);
   * ```
   */
  @track('Entities.UploadAttachment')
  async uploadAttachment(entityId: string, recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const params = createParams({ expansionLevel: options?.expansionLevel });

    const response = await this.post<EntityUploadAttachmentResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPLOAD_ATTACHMENT(entityId, recordId, fieldName),
      formData,
      { params }
    );

    // Convert PascalCase response to camelCase
    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

  /**
   * Removes an attachment from a File-type field of an entity record
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to {@link EntityDeleteAttachmentResponse}
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Get the entityId from getAll()
   * const allEntities = await entities.getAll();
   * const entityId = allEntities[0].id;
   *
   * // Get the recordId from getAllRecords()
   * const records = await entities.getAllRecords(entityId);
   * const recordId = records[0].id;
   *
   * // Delete attachment for a specific record and field
   * await entities.deleteAttachment(entityId, recordId, 'Documents');
   * ```
   */
  @track('Entities.DeleteAttachment')
  async deleteAttachment(entityId: string, recordId: string, fieldName: string): Promise<EntityDeleteAttachmentResponse> {
    const response = await this.delete<EntityDeleteAttachmentResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ATTACHMENT(entityId, recordId, fieldName)
    );

    return response.data;
  }

  /**
   * Queries an entity by name with support for joins, aggregates, filters, grouping, and sorting
   *
   * @param entityName - Name of the entity to query
   * @param options - Query options including selectedFields, aggregates, joins, filterGroup, groupBy, sortOptions, start, limit
   * @returns Promise resolving to query response with matching records
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Simple filtered query
   * const result = await entities.query('Customer', {
   *   selectedFields: ['name', 'email'],
   *   filterGroup: {
   *     logicalOperator: 0,
   *     queryFilters: [{ fieldName: 'status', operator: '=', value: 'active' }]
   *   },
   *   limit: 50
   * });
   *
   * // Cross-entity join query
   * const joinResult = await entities.query('Orders', {
   *   selectedFields: ['Orders.orderId', 'Customer.name'],
   *   joins: [{
   *     type: 'INNER',
   *     entity: 'Customer',
   *     on: { left: 'customerId', right: 'Id' }
   *   }],
   *   sortOptions: [{ fieldName: 'Orders.createdDate', isDescending: true }],
   *   limit: 100
   * });
   *
   * // Aggregate query with grouping
   * const stats = await entities.query('Orders', {
   *   aggregates: [
   *     { function: 'COUNT', field: 'Id', alias: 'totalOrders' },
   *     { function: 'SUM', field: 'amount', alias: 'totalAmount' }
   *   ],
   *   groupBy: ['status']
   * });
   * ```
   */
  @track('Entities.Query')
  async query(entityName: string, options: EntityQueryOptions = {}): Promise<EntityQueryResponse> {
    const body: Record<string, unknown> = {};

    if (options.selectedFields) body.selectedFields = options.selectedFields;
    if (options.aggregates) body.aggregates = options.aggregates;
    if (options.joins) body.joins = options.joins;
    if (options.filterGroup) body.filterGroup = options.filterGroup;
    if (options.groupBy) body.groupBy = options.groupBy;
    if (options.sortOptions) body.sortOptions = options.sortOptions;
    if (options.start !== undefined) body.start = options.start;
    if (options.limit !== undefined) body.limit = options.limit;

    const response = await this.post<EntityQueryResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.QUERY(entityName),
      body
    );

    const camelResponse = pascalToCamelCaseKeys(response.data);
    return camelResponse;
  }

    /**
   * @hidden
   * @deprecated Use {@link getAllRecords} instead.
   */
  async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
    entityId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  > {
    return this.getAllRecords(entityId, options);
  }

  /**
   * @hidden
   * @deprecated Use {@link insertRecordById} instead.
   */
  async insertById(id: string, data: Record<string, any>, options: EntityInsertOptions = {}): Promise<EntityInsertResponse> {
    return this.insertRecordById(id, data, options);
  }

  /**
   * @hidden
   * @deprecated Use {@link insertRecordsById} instead.
   */
  async batchInsertById(id: string, data: Record<string, any>[], options: EntityBatchInsertOptions = {}): Promise<EntityBatchInsertResponse> {
    return this.insertRecordsById(id, data, options);
  }

  /**
   * @hidden
   * @deprecated Use {@link updateRecordsById} instead.
   */
  async updateById(id: string, data: EntityRecord[], options: EntityUpdateOptions = {}): Promise<EntityUpdateResponse> {
    return this.updateRecordsById(id, data, options);
  }

  /**
   * @hidden
   * @deprecated Use {@link deleteRecordsById} instead.
   */
  async deleteById(id: string, recordIds: string[], options: EntityDeleteOptions = {}): Promise<EntityDeleteResponse> {
    return this.deleteRecordsById(id, recordIds, options);
  }

  /**
   * Orchestrates all field mapping transformations
   * 
   * @param metadata - Entity metadata to transform
   * @private
   */
  private applyFieldMappings(metadata: RawEntityGetResponse): void {
    this.mapFieldTypes(metadata);
    this.mapExternalFields(metadata);
  }

  /**
   * Maps SQL field types to friendly EntityFieldTypes
   * 
   * @param metadata - Entity metadata with fields
   * @private
   */
  private mapFieldTypes(metadata: RawEntityGetResponse): void {
    if (!metadata.fields?.length) return;
    
    metadata.fields = metadata.fields.map(field => {
      // Rename sqlType to fieldDataType
      let transformedField = transformData(field, EntityMap);
      
      // Map SQL field type to friendly name
      if (transformedField.fieldDataType?.name) {
        const sqlTypeName = transformedField.fieldDataType.name as unknown as SqlFieldType;
        if (EntityFieldTypeMap[sqlTypeName]) {
          transformedField.fieldDataType.name = EntityFieldTypeMap[sqlTypeName] as unknown as EntityFieldDataType;
        }
      }
      
      this.transformNestedReferences(transformedField);
      
      return transformedField;
    });
  }

  /**
   * Transforms nested reference objects in field metadata
   */
  private transformNestedReferences(field: any): void {
    if (field.referenceEntity) {
      field.referenceEntity = transformData(field.referenceEntity, EntityMap);
    }
    if (field.referenceChoiceSet) {
      field.referenceChoiceSet = transformData(field.referenceChoiceSet, EntityMap);
    }
    if (field.referenceField?.definition) {
      field.referenceField.definition = transformData(field.referenceField.definition, EntityMap);
    }
  }

  /**
   * Maps external field names to consistent naming
   * 
   * @param metadata - Entity metadata with externalFields
   * @private
   */
  private mapExternalFields(metadata: RawEntityGetResponse): void {
    if (!metadata.externalFields?.length) return;
    
    metadata.externalFields = metadata.externalFields.map(externalSource => {
      if (externalSource.fields?.length) {
        externalSource.fields = externalSource.fields.map(field => {
          const transformedField = transformData(field, EntityMap);
          if (transformedField.fieldMetaData) {
            transformedField.fieldMetaData = transformData(transformedField.fieldMetaData, EntityMap);
            this.transformNestedReferences(transformedField.fieldMetaData);
          }
          return transformedField;
        });
      }
      return externalSource;
    });
  }
}