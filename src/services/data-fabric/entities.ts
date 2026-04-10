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
  EntityQueryRecordsOptions,
  EntityQueryRecordsResponse,
  EntityBulkImportResponse,
  EntityFieldDefinition,
  EntityFieldType,
  EntityMetadataUpdateOptions,
  EntityUpdateFieldOptions,
} from '../../models/data-fabric/entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS } from '../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { RESPONSE_TYPES } from '../../utils/constants/headers';
import { createParams } from '../../utils/http/params';
import { transformData } from '../../utils/transform';
import { EntityFieldTypeMap, SqlFieldType, EntityMap, EntitySchemaFieldTypeMap } from '../../models/data-fabric/entities.constants';
import { EntitySchemaField, EntityQueryRawResponse } from '../../models/data-fabric/entities.internal-types';
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

    return response.data;
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

    return response.data;
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

    return response.data;
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

    return response.data;
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

    return response.data;
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

    return response.data;
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
   * Queries entity records with filters, sorting, and pagination
   *
   * @param entityId - UUID of the entity
   * @param options - Query options including filterGroup, selectedFields, sortOptions, start, and limit
   * @returns Promise resolving to matching records and total count
   *
   * @example
   * ```typescript
   * import { Entities, LogicalOperator } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Query with a filter
   * const result = await entities.queryRecords("<entityId>", {
   *   filterGroup: {
   *     logicalOperator: LogicalOperator.And,
   *     queryFilters: [
   *       { fieldName: "status", operator: "=", value: "active" }
   *     ]
   *   },
   *   sortOptions: [{ fieldName: "created_at", isDescending: true }],
   *   start: 0,
   *   limit: 50
   * });
   *
   * console.log(`Found ${result.totalCount} records`);
   * result.items.forEach(record => console.log(record));
   * ```
   */
  @track('Entities.QueryRecords')
  async queryRecords(entityId: string, options: EntityQueryRecordsOptions = {}): Promise<EntityQueryRecordsResponse> {
    const { expansionLevel, ...queryBody } = options;
    const params = createParams({ expansionLevel });

    const response = await this.post<EntityQueryRawResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(entityId),
      queryBody,
      { params }
    );

    const raw = response.data;
    const items = raw.value ?? [];

    return {
      items,
      totalCount: raw.totalRecordCount ?? 0
    };
  }

  /**
   * Imports records from a CSV file into an entity
   *
   * @param entityId - UUID of the entity
   * @param file - CSV file to import as a Blob or File
   * @returns Promise resolving to import result with record counts
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Browser: upload from file input
   * const fileInput = document.getElementById('csv-input') as HTMLInputElement;
   * const result = await entities.importRecordsById("<entityId>", fileInput.files[0]);
   *
   * // Node.js: read from disk
   * const fileBuffer = fs.readFileSync('records.csv');
   * const result = await entities.importRecordsById("<entityId>", new Blob([fileBuffer], { type: 'text/csv' }));
   *
   * console.log(`Inserted ${result.insertedRecords} of ${result.totalRecords} records`);
   * if (result.errorFileLink) {
   *   console.log(`Error file link: ${result.errorFileLink}`);
   * }
   * ```
   */
  @track('Entities.ImportRecordsById')
  async importRecordsById(entityId: string, file: Blob): Promise<EntityBulkImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.post<EntityBulkImportResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(entityId),
      formData
    );

    return response.data;
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
   * const recordId = records[0].Id;
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
   * const recordId = records[0].Id;
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

    return response.data;
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
   * const recordId = records[0].Id;
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
   * Creates a new Data Fabric entity with the given schema
   *
   * @param name - Technical entity name — must be lowercase, start with a letter, and contain
   *   only letters, numbers, and underscores (e.g., `"product_catalog"`).
   * @param description - Entity description
   * @param fields - Array of field definitions
   * @param displayName - Human-readable display name shown in the UI (defaults to `name`)
   * @returns Promise resolving to the ID of the created entity
   *
   * @example
   * ```typescript
   * const entityId = await entities.create("product_catalog", "Our product catalog", [
   *   { name: "product_name", type: EntityFieldType.Text, isRequired: true },
   *   { name: "price", type: EntityFieldType.Decimal },
   * ], "Product Catalog");
   * ```
   */
  @track('Entities.Create')
  async create(name: string, description: string, fields: EntityFieldDefinition[], displayName?: string): Promise<string> {
    EntityService.validateTechnicalName(name, 'entity');
    const payload = {
      description,
      displayName: displayName ?? name,
      entityDefinition: {
        name,
        fields: fields.map(f => this.buildSchemaFieldPayload(f)),
      },
    };
    const response = await this.post<string>(DATA_FABRIC_ENDPOINTS.ENTITY.CREATE_ENTITY, payload);
    return String(response.data);
  }

  /**
   * Deletes a Data Fabric entity and all its records
   *
   * @param entityId - UUID of the entity to delete
   * @returns Promise resolving when the entity is deleted
   *
   * @example
   * ```typescript
   * await entities.deleteEntityById("<entityId>");
   * ```
   */
  @track('Entities.DeleteEntityById')
  async deleteEntityById(entityId: string): Promise<void> {
    await this.post(DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ENTITY(entityId), {});
  }

  /**
   * Updates an existing Data Fabric entity's metadata (displayName and/or description)
   *
   * @param entityId - UUID of the entity to update
   * @param options - Fields to update (displayName, description)
   * @returns Promise resolving when the entity metadata is updated
   *
   * @example
   * ```typescript
   * await entities.updateEntity("<entityId>", { displayName: "Updated Name", description: "New description" });
   * ```
   */
  @track('Entities.UpdateEntity')
  async updateEntity(entityId: string, options: EntityMetadataUpdateOptions): Promise<EntityMetadataUpdateOptions> {
    await this.patch(DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_ENTITY_METADATA(entityId), options);
    return options;
  }

  /**
   * Updates an existing field's metadata on a Data Fabric entity
   *
   * @param entityId - UUID of the entity containing the field
   * @param fieldId - UUID of the field to update
   * @param options - Field properties to update (displayName, description, isRequired, etc.)
   * @returns Promise resolving when the field metadata is updated
   *
   * @example
   * ```typescript
   * await entities.updateField("<entityId>", "<fieldId>", { displayName: "Category Label", isRequired: true });
   * ```
   */
  @track('Entities.UpdateField')
  async updateField(entityId: string, fieldId: string, options: EntityUpdateFieldOptions): Promise<EntityUpdateFieldOptions> {
    await this.patch(DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_FIELD(entityId, fieldId), options);
    return options;
  }

  /**
   * Adds a new field to an existing Data Fabric entity
   *
   * @param entityId - UUID of the entity
   * @param field - Field definition to add
   * @returns Promise resolving when the field is added
   *
   * @example
   * ```typescript
   * const fieldId = await entities.insertFieldById("<entityId>", {
   *   name: "category",
   *   displayName: "Category",
   *   type: EntityFieldType.Text,
   * });
   * ```
   */
  @track('Entities.InsertFieldById')
  async insertFieldById(entityId: string, field: EntityFieldDefinition): Promise<string> {
    const payload = {
      entityId,
      fieldDefinition: this.buildSchemaFieldPayload(field),
    };
    const response = await this.post<string>(DATA_FABRIC_ENDPOINTS.ENTITY.ADD_FIELD(entityId), payload);
    return String(response.data);
  }

  /**
   * Removes a field from a Data Fabric entity by field name
   *
   * @param entityId - UUID of the entity
   * @param fieldName - Name of the field to remove (case-insensitive)
   * @returns Promise resolving when the field is removed
   *
   * @example
   * ```typescript
   * await entities.deleteFieldById("<entityId>", "category");
   * ```
   */
  @track('Entities.DeleteFieldById')
  async deleteFieldById(entityId: string, fieldName: string): Promise<void> {
    const response = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(entityId)
    );
    const fields = response.data.fields ?? [];
    const field = fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
    if (!field?.id) {
      throw new Error(`Field '${fieldName}' not found in entity ${entityId}`);
    }
    await this.post(DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_FIELD(entityId, field.id), {});
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

  /** Converts a user-facing EntityFieldDefinition to the raw API field payload */
  private buildSchemaFieldPayload(field: EntityFieldDefinition): EntitySchemaField {
    EntityService.validateTechnicalName(field.name, 'field');
    const mapping = EntitySchemaFieldTypeMap[field.type ?? EntityFieldType.Text];
    return {
      name: field.name,
      displayName: field.displayName ?? field.name,
      type: mapping.apiType,
      description: field.description ?? '',
      isRequired: field.isRequired ?? false,
      fieldDisplayType: mapping.fieldDisplayType,
      sqlType: mapping.sqlType,
      choiceSetId: null,
      defaultValue: null,
      isRbacEnabled: false,
      isUnique: false,
      isEncrypted: false,
    };
  }

  /**
   * Validates that a name is a valid technical identifier:
   * lowercase, starts with a letter, contains only letters, numbers, and underscores.
   * @throws Error if the name is invalid
   */
  private static validateTechnicalName(name: string, context: string): void {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new Error(
        `Invalid ${context} name '${name}'. Name must be lowercase, start with a letter, and contain only letters, numbers, and underscores (e.g., "${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}").`
      );
    }
  }

}