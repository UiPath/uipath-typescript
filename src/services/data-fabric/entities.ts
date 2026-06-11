import { ValidationError } from '../../core/errors';
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
  EntityUpdateRecordOptions,
  EntityUpdateRecordResponse,
  EntityUpdateRecordsOptions,
  EntityUpdateResponse,
  EntityDeleteRecordsOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetResponse,
  FieldMetaData,
  EntityFileType,
  EntityUploadAttachmentOptions,
  EntityUploadAttachmentResponse,
  EntityDownloadAttachmentOptions,
  EntityDeleteAttachmentOptions,
  EntityDeleteAttachmentResponse,
  EntityQueryRecordsOptions,
  EntityImportRecordsResponse,
  EntityImportRecordsByIdOptions,
  EntityCreateOptions,
  EntityCreateFieldOptions,
  EntityFieldDataType,
  EntityGetAllOptions,
  EntityGetByIdOptions,
  EntityDeleteByIdOptions,
  EntityDeleteRecordByIdOptions,
  EntityUpdateByIdOptions,
  SqlType,
  FieldDisplayType,
  ReferenceType,
} from '../../models/data-fabric/entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS, DATA_FABRIC_TENANT_FOLDER_ID } from '../../utils/constants/endpoints/data-fabric';
import { FOLDER_KEY, RESPONSE_TYPES } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { createParams } from '../../utils/http/params';
import { transformData } from '../../utils/transform';
import {
  EntityFieldTypeMap,
  EntityMap,
  EntitySchemaFieldTypeMap,
  FieldDisplayTypeToDataType,
  ENTITY_FIELD_CONSTRAINT_DEFAULTS,
  ENTITY_FIELD_CONSTRAINT_SPEC,
} from '../../models/data-fabric/entities.constants';
import { FieldSchemaPayload, SqlFieldType, EntityFieldConstraint } from '../../models/data-fabric/entities.internal-types';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  /**
   * Gets entity metadata by entity ID with attached operation methods
   *
   * @param id - UUID of the entity
   * @param options - Optional {@link EntityGetByIdOptions} (e.g. `folderKey` for folder-scoped entities)
   * @returns Promise resolving to entity metadata with schema information and operation methods
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   * const entity = await entities.getById("<entityId>");
   *
   * // Folder-scoped: pass the entity's folder key
   * const folderEntity = await entities.getById("<entityId>", { folderKey: "<folderKey>" });
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
  async getById(id: string, options?: EntityGetByIdOptions): Promise<EntityGetResponse> {
    // Get entity metadata
    const response = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * const records = await entities.getAllRecords("<entityId>", { folderKey: "<folderKey>" });
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
    // folderKey is header-only — destructure it out so PaginationHelpers doesn't serialise it
    // into the query string as $folderKey.
    const { folderKey, ...rest } = options ?? {} as T;
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_RECORDS(entityId),
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
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
    }, downstreamOptions);
  }

  /**
   * Gets a single entity record by entity ID and record ID
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record
   * @param options - Query options including `expansionLevel` and `folderKey`
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * const record = await sdk.entities.getRecordById(<entityId>, <recordId>, {
   *   folderKey: "<folderKey>"
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
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.insertRecordById("<entityId>", { name: "John", age: 30 }, {
   *   folderKey: "<folderKey>"
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
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.insertRecordsById("<entityId>", [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ], { folderKey: "<folderKey>" });
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
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.updateRecordById("<entityId>", "<recordId>", { name: "John Updated" }, {
   *   folderKey: "<folderKey>"
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
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.updateRecordsById("<entityId>", [
   *   { Id: "123", name: "John Updated" }
   * ], { folderKey: "<folderKey>" });
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
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  /**
   * Deletes data from an entity by entity ID
   *
   * Note: Records deleted using deleteRecordsById will not trigger Data Fabric trigger events. Use {@link deleteRecordById} if you need trigger events to fire for the deleted record.
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.deleteRecordsById("<entityId>", [
   *   "<recordId-1>", "<recordId-2>"
   * ], { folderKey: "<folderKey>" });
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
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  /**
   * Deletes a single record from an entity by entity ID and record ID
   *
   * Note: Data Fabric supports trigger events only on individual deletes, not on deleting multiple records.
   * Use this method if you need trigger events to fire for the deleted record.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to delete
   * @param options - Optional {@link EntityDeleteRecordByIdOptions} (e.g. `folderKey` for folder-scoped entities)
   * @returns Promise resolving to void on success
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * await entities.deleteRecordById("<entityId>", "<recordId>");
   *
   * // Folder-scoped: pass the entity's folder key
   * await entities.deleteRecordById("<entityId>", "<recordId>", { folderKey: "<folderKey>" });
   * ```
   */
  @track('Entities.DeleteRecordById')
  async deleteRecordById(entityId: string, recordId: string, options?: EntityDeleteRecordByIdOptions): Promise<void> {
    await this.delete(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_RECORD_BY_ID(entityId, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  /**
   * Gets all entities in the system
   *
   * By default the entity list is scoped exclusively: omitting `folderKey`
   * returns only tenant-level entities; passing `folderKey` returns only
   * entities in that folder. To list tenant-level and folder-level entities
   * together in a single call, pass `includeAllFolders: true` (with no
   * `folderKey`). When `folderKey` is provided it always wins, scoping the
   * result to that single folder and ignoring `includeAllFolders`.
   *
   * @param options - Optional {@link EntityGetAllOptions} (`folderKey` to list a single folder's entities, `includeAllFolders` to list tenant and folder entities together)
   * @returns Promise resolving to an array of entity metadata
   *
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Get tenant-level entities
   * const tenantEntities = await entities.getAll();
   *
   * // Get tenant-level and folder-level entities together
   * const allEntities = await entities.getAll({ includeAllFolders: true });
   *
   * // Get a single folder's entities
   * const folderEntities = await entities.getAll({ folderKey: "<folderKey>" });
   *
   * // Call operations on an entity
   * const records = await tenantEntities[0].getAllRecords();
   * ```
   */
  @track('Entities.GetAll')
  async getAll(options?: EntityGetAllOptions): Promise<EntityGetResponse[]> {
    // folderKey always wins: when present, scope to that folder via the v1 endpoint + header.
    // Only when no folderKey is given does includeAllFolders switch to the v2 endpoint,
    // which returns tenant-level and folder-level entities together.
    const endpoint = !options?.folderKey && options?.includeAllFolders
      ? DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL_V2
      : DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL;

    const response = await this.get<RawEntityGetResponse[]>(
      endpoint,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
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
   * Queries entity records with filters, sorting, aggregates, and pagination
   *
   * @param id - UUID of the entity
   * @param options - Query options including filterGroup, selectedFields, sortOptions, aggregates, groupBy, and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} without pagination options,
   *   or {@link PaginatedResponse} when `pageSize`, `cursor`, or `jumpToPage` are provided
   *
   * @example
   * ```typescript
   * import { Entities, LogicalOperator, QueryFilterOperator, EntityAggregateFunction } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Non-paginated query with a filter
   * const result = await entities.queryRecordsById("<entityId>", {
   *   filterGroup: {
   *     logicalOperator: LogicalOperator.And,
   *     queryFilters: [
   *       { fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }
   *     ]
   *   },
   *   sortOptions: [{ fieldName: "created_at", isDescending: true }],
   * });
   * console.log(`Found ${result.totalCount} records`);
   *
   * // With pagination
   * const page1 = await entities.queryRecordsById("<entityId>", {
   *   filterGroup: { queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }] },
   *   pageSize: 25,
   * });
   * if (page1.hasNextPage) {
   *   const page2 = await entities.queryRecordsById("<entityId>", { cursor: page1.nextCursor });
   * }
   *
   * // Aggregate: count of records per status
   * await entities.queryRecordsById("<entityId>", {
   *   selectedFields: ["status"],
   *   groupBy: ["status"],
   *   aggregates: [
   *     { function: EntityAggregateFunction.Count, field: "Id", alias: "total" },
   *   ],
   * });
   *
   * // Aggregate: total sum and average across all records (no grouping)
   * await entities.queryRecordsById("<entityId>", {
   *   aggregates: [
   *     { function: EntityAggregateFunction.Sum, field: "amount", alias: "totalAmount" },
   *     { function: EntityAggregateFunction.Avg, field: "amount", alias: "avgAmount" },
   *   ],
   * });
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.queryRecordsById("<entityId>", {
   *   filterGroup: { queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }] },
   *   folderKey: "<folderKey>",
   * });
   * ```
   */
  @track('Entities.QueryRecordsById')
  async queryRecordsById<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(
    id: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityRecord> : NonPaginatedResponse<EntityRecord>> {
    // folderKey is header-only — destructure it out so PaginationHelpers doesn't include
    // it in the POST body alongside the query filters.
    const { folderKey, ...rest } = options ?? {} as T;
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(id),
      method: HTTP_METHODS.POST,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
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
      excludeFromPrefix: ['expansionLevel', 'filterGroup', 'selectedFields', 'sortOptions', 'aggregates', 'groupBy']
    }, downstreamOptions);
  }

  /**
   * Imports records from a CSV file into an entity
   *
   * @param id - UUID of the entity
   * @param file - CSV file to import (Blob, File, or Uint8Array)
   * @param options - Optional {@link EntityImportRecordsByIdOptions} (e.g. `folderKey` for folder-scoped entities)
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.importRecordsById("<entityId>", fileInput.files[0], { folderKey: "<folderKey>" });
   * ```
   * @internal
   */
  @track('Entities.ImportRecordsById')
  async importRecordsById(id: string, file: EntityFileType, options?: EntityImportRecordsByIdOptions): Promise<EntityImportRecordsResponse> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const response = await this.post<EntityImportRecordsResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(id),
      formData,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );

    return response.data;
  }

  /**
   * Downloads an attachment from an entity record field
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @param options - Optional {@link EntityDownloadAttachmentOptions} (e.g. `folderKey` for folder-scoped entities)
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
   *
   * // Folder-scoped: pass the entity's folder key
   * const blob = await entities.downloadAttachment(entityId, recordId, 'Documents', { folderKey: "<folderKey>" });
   * ```
   */
  @track('Entities.DownloadAttachment')
  async downloadAttachment(entityId: string, recordId: string, fieldName: string, options?: EntityDownloadAttachmentOptions): Promise<Blob> {
    const response = await this.get<Blob>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DOWNLOAD_ATTACHMENT(entityId, recordId, fieldName),
      {
        responseType: RESPONSE_TYPES.BLOB,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
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
   * @param options - Optional {@link EntityUploadAttachmentOptions} (e.g. `expansionLevel`, `folderKey` for folder-scoped entities)
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
   *
   * // Folder-scoped entity: pass the entity's folder key
   * await entities.uploadAttachment(entityId, recordId, 'Documents', file, { folderKey: "<folderKey>" });
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
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );

    return response.data;
  }

  /**
   * Removes an attachment from a File-type field of an entity record
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @param options - Optional {@link EntityDeleteAttachmentOptions} (e.g. `folderKey` for folder-scoped entities)
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
   *
   * // Folder-scoped: pass the entity's folder key
   * await entities.deleteAttachment(entityId, recordId, 'Documents', { folderKey: "<folderKey>" });
   * ```
   */
  @track('Entities.DeleteAttachment')
  async deleteAttachment(entityId: string, recordId: string, fieldName: string, options?: EntityDeleteAttachmentOptions): Promise<EntityDeleteAttachmentResponse> {
    const response = await this.delete<EntityDeleteAttachmentResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ATTACHMENT(entityId, recordId, fieldName),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
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
   * Creates a new Data Fabric entity with the given schema
   *
   * @param name - Entity name — must start with a letter and contain
   *   only letters, numbers, and underscores (e.g., `"productCatalog"`).
   * @param fields - Array of field definitions
   * @param options - Optional entity-level settings ({@link EntityCreateOptions})
   * @returns Promise resolving to the ID of the created entity
   *
   * @example
   * ```typescript
   * const entityId = await entities.create("product_catalog", [
   *   { fieldName: "product_name", type: EntityFieldDataType.STRING, isRequired: true, isUnique: true },
   *   { fieldName: "price", type: EntityFieldDataType.INTEGER, defaultValue: "0" },
   * ], { displayName: "Product Catalog", description: "Our product catalog", isRbacEnabled: true });
   *
   * // With advanced sqlType constraints (lengthLimit, decimalPrecision, maxValue, minValue) and defaultValue
   * const ordersId = await entities.create("orders", [
   *   { fieldName: "product_name", type: EntityFieldDataType.STRING, isRequired: true, isUnique: true, lengthLimit: 500 },
   *   { fieldName: "price", type: EntityFieldDataType.DECIMAL, decimalPrecision: 4, maxValue: 999999, minValue: 0 },
   *   { fieldName: "quantity", type: EntityFieldDataType.INTEGER, maxValue: 10000, minValue: 1, defaultValue: "0" },
   * ]);
   * ```
   * @internal
   */
  @track('Entities.Create')
  async create(name: string, fields: EntityCreateFieldOptions[], options?: EntityCreateOptions): Promise<string> {
    const opts = options ?? {};
    const payload = {
      ...(opts.description !== undefined && { description: opts.description }),
      displayName: opts.displayName ?? name,
      entityDefinition: {
        name,
        fields: fields.map(f => this.buildSchemaFieldPayload(f)),
        folderId: opts.folderKey ?? DATA_FABRIC_TENANT_FOLDER_ID,
        isRbacEnabled: opts.isRbacEnabled ?? false,
        isInsightsEnabled: opts.isAnalyticsEnabled ?? false,
        externalFields: opts.externalFields ?? [],
      },
    };
    const response = await this.post<string>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT,
      payload,
      { headers: createHeaders({ [FOLDER_KEY]: opts.folderKey }) },
    );
    return response.data;
  }

  /**
   * Deletes a Data Fabric entity and all its records
   *
   * @param id - UUID of the entity to delete
   * @param options - Optional {@link EntityDeleteByIdOptions} (e.g. `folderKey` for folder-scoped entities)
   * @returns Promise resolving when the entity is deleted
   *
   * @example
   * ```typescript
   * await entities.deleteById("<entityId>");
   *
   * // Folder-scoped: pass the entity's folder key
   * await entities.deleteById("<entityId>", { folderKey: "<folderKey>" });
   * ```
   * @internal
   */
  @track('Entities.DeleteById')
  async deleteById(id: string, options?: EntityDeleteByIdOptions): Promise<void> {
    await this.delete(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  /**
   * Updates an existing Data Fabric entity — schema and/or metadata.
   *
   * Provide any combination of schema fields (`addFields`, `removeFields`, `updateFields`) and
   * metadata fields (`displayName`, `description`, `isRbacEnabled`). Each group is applied
   * only when the corresponding fields are present.
   *
   * **Warning:** Schema changes (`addFields`, `removeFields`, `updateFields`) use a
   * read-modify-write pattern — concurrent calls on the same entity may silently
   * overwrite each other's changes.
   *
   * @param id - UUID of the entity to update
   * @param options - Changes to apply ({@link EntityUpdateByIdOptions})
   * @returns Promise resolving when the update is complete
   *
   * @example
   * ```typescript
   * // Schema-only
   * await entities.updateById("<entityId>", {
   *   addFields: [{ fieldName: "notes", type: EntityFieldDataType.MULTILINE_TEXT }],
   *   removeFields: [{ fieldName: "old_field" }],
   * });
   *
   * // Metadata-only
   * await entities.updateById("<entityId>", {
   *   displayName: "My Updated Entity",
   *   description: "Updated description",
   * });
   *
   * // Combined
   * await entities.updateById("<entityId>", {
   *   updateFields: [{ id: "<fieldId>", displayName: "Unit Price", isRequired: true }],
   *   displayName: "Price Catalog",
   * });
   *
   * // Add a STRING/DECIMAL field with explicit advanced sqlType constraints and defaultValue
   * await entities.updateById("<entityId>", {
   *   addFields: [
   *     { fieldName: "summary", type: EntityFieldDataType.STRING, lengthLimit: 500, defaultValue: "summary" },
   *     { fieldName: "amount", type: EntityFieldDataType.DECIMAL, decimalPrecision: 4, maxValue: 999999, minValue: 0 },
   *   ],
   *   updateFields: [
   *     { id: "<fieldId>", lengthLimit: 1000 },
   *   ],
   * });
   *
   * // Folder-scoped entity: add a field to an entity that lives in a non-tenant folder
   * await entities.updateById("<entityId>", {
   *   folderKey: "<folderKey>",
   *   addFields: [{ fieldName: "notes", type: EntityFieldDataType.MULTILINE_TEXT }],
   * });
   * ```
   * @internal
   */
  @track('Entities.UpdateById')
  async updateById(id: string, options?: EntityUpdateByIdOptions): Promise<void> {
    const opts = options ?? {};
    const hasSchemaChanges = !!(opts.addFields?.length || opts.removeFields?.length || opts.updateFields?.length);
    const hasMetadataChanges = opts.displayName !== undefined || opts.description !== undefined || opts.isRbacEnabled !== undefined;

    if (hasSchemaChanges) {
      await this.applySchemaUpdate(id, opts);
    }
    if (hasMetadataChanges) {
      await this.patch(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_METADATA(id),
        {
          ...(opts.displayName !== undefined && { displayName: opts.displayName }),
          ...(opts.description !== undefined && { description: opts.description }),
          ...(opts.isRbacEnabled !== undefined && { isRbacEnabled: opts.isRbacEnabled }),
        },
        { headers: createHeaders({ [FOLDER_KEY]: opts.folderKey }) },
      );
    }
  }

  /**
   * Fetches the current entity schema, applies the field delta, then posts the full updated schema.
   *
   * @param entityId - UUID of the entity to update
   * @param options - Field changes to apply
   * @private
   */
  private async applySchemaUpdate(entityId: string, options: Pick<EntityUpdateByIdOptions, 'addFields' | 'removeFields' | 'updateFields' | 'folderKey'>): Promise<void> {
    const folderHeaders = createHeaders({ [FOLDER_KEY]: options.folderKey });
    const entityResponse = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(entityId),
      { headers: folderHeaders },
    );
    const raw = entityResponse.data;

    // Carry forward existing non-system fields from GET response (skip system/primary-key fields)
    let fields: FieldMetaData[] = (raw.fields ?? [])
      .filter(f => !f.isSystemField && !f.isPrimaryKey);

    // Filter out removed fields
    if (options.removeFields?.length) {
      const removeSet = new Set(options.removeFields.map(r => r.fieldName));
      fields = fields.filter(f => !removeSet.has(f.name));
    }

    // Apply per-field metadata updates (matched by field ID)
    if (options.updateFields?.length) {
      const updateMap = new Map(options.updateFields.map(u => [u.id, u]));
      fields = fields.map(f => {
        const update = updateMap.get(f.id ?? '');
        if (!update) return f;
        const constraintUpdate = {
          ...(update.lengthLimit !== undefined && { lengthLimit: update.lengthLimit }),
          ...(update.maxValue !== undefined && { maxValue: update.maxValue }),
          ...(update.minValue !== undefined && { minValue: update.minValue }),
          ...(update.decimalPrecision !== undefined && { decimalPrecision: update.decimalPrecision }),
        };
        const hasConstraintUpdate = Object.keys(constraintUpdate).length > 0;
        if (hasConstraintUpdate) {
          if (!f.sqlType) {
            throw new ValidationError({
              message: `Cannot update constraints on field '${f.name}' (id: ${f.id}) — the field is missing sqlType metadata in the entity definition.`,
            });
          }
          this.validateFieldConstraints(this.resolveFieldDataType(f), update, f.name);
        }
        return {
          ...f,
          ...(update.displayName !== undefined && { displayName: update.displayName }),
          ...(update.description !== undefined && { description: update.description }),
          ...(update.isRequired !== undefined && { isRequired: update.isRequired }),
          ...(update.isUnique !== undefined && { isUnique: update.isUnique }),
          ...(update.isRbacEnabled !== undefined && { isRbacEnabled: update.isRbacEnabled }),
          ...(update.isEncrypted !== undefined && { isEncrypted: update.isEncrypted }),
          ...(update.isHiddenField !== undefined && { isHiddenField: update.isHiddenField }),
          ...(update.defaultValue !== undefined && { defaultValue: update.defaultValue }),
          ...(hasConstraintUpdate && f.sqlType && { sqlType: { ...f.sqlType, ...constraintUpdate } }),
        };
      });
    }

    // Build and append new fields
    const newFields: FieldSchemaPayload[] = [];
    if (options.addFields?.length) {
      newFields.push(...options.addFields.map(f => this.buildSchemaFieldPayload(f)));
    }

    await this.post(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT,
      {
        displayName: raw.displayName,
        description: raw.description,
        entityDefinition: {
          id: entityId,
          name: raw.name,
          fields: [...fields, ...newFields],
          folderId: raw.folderId ?? DATA_FABRIC_TENANT_FOLDER_ID,
          isRbacEnabled: raw.isRbacEnabled ?? false,
          isInsightsEnabled: raw.isInsightsEnabled ?? false,
          externalFields: raw.externalFields ?? [],
        },
      },
      { headers: folderHeaders },
    );
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

      // Map field type: prefer fieldDisplayType for types that share SQL types (File, ChoiceSet, AutoNumber)
      if (transformedField.fieldDataType?.name) {
        const mapped = this.tryResolveFieldDataType(transformedField.fieldDisplayType, field.sqlType?.name);
        if (mapped) {
          transformedField.fieldDataType.name = mapped;
        }
      }

      this.transformNestedReferences(transformedField);

      return transformedField;
    });
  }

  /**
   * Resolves an {@link EntityFieldDataType} from a field's `fieldDisplayType` and
   * raw SQL type name. Prefers `fieldDisplayType` to disambiguate types that
   * share a SQL type (FILE, CHOICE_SET_*, AUTO_NUMBER, RELATIONSHIP); falls back
   * to the SQL-type-name mapping. Returns `undefined` if neither resolves.
   */
  private tryResolveFieldDataType(
    fieldDisplayType: FieldDisplayType | undefined,
    sqlTypeName: string | undefined,
  ): EntityFieldDataType | undefined {
    const displayMapped = fieldDisplayType ? FieldDisplayTypeToDataType[fieldDisplayType] : undefined;
    if (displayMapped) return displayMapped;
    return sqlTypeName ? EntityFieldTypeMap[sqlTypeName as SqlFieldType] : undefined;
  }

  /**
   * Transforms nested reference objects in field metadata
   */
  private transformNestedReferences(field: FieldMetaData): void {
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

  /** Converts a user-facing EntityCreateFieldOptions to the raw API field payload */
  private buildSchemaFieldPayload(field: EntityCreateFieldOptions): FieldSchemaPayload {
    const fieldType = field.type ?? EntityFieldDataType.STRING;
    this.validateFieldConstraints(fieldType, field, field.fieldName);
    const isRelationship = fieldType === EntityFieldDataType.RELATIONSHIP;
    const isFile = fieldType === EntityFieldDataType.FILE;
    if ((isRelationship || isFile) && (!field.referenceEntityId || !field.referenceFieldId)) {
      throw new ValidationError({
        message: `Field '${field.fieldName}' of type ${fieldType} requires both referenceEntityId and referenceFieldId (UUIDs of the target entity and field).`,
      });
    }
    const mapping = EntitySchemaFieldTypeMap[fieldType];
    return {
      name: field.fieldName,
      displayName: field.displayName ?? field.fieldName,
      sqlType: {
        name: mapping.sqlTypeName,
        ...this.buildSqlTypeConstraints(fieldType, field),
      },
      fieldDisplayType: mapping.fieldDisplayType,
      description: field.description ?? '',
      isRequired: field.isRequired ?? false,
      isUnique: field.isUnique ?? false,
      isRbacEnabled: field.isRbacEnabled ?? false,
      isEncrypted: field.isEncrypted ?? false,
      isHiddenField: field.isHiddenField ?? false,
      ...(field.defaultValue !== undefined && { defaultValue: field.defaultValue }),
      ...(field.choiceSetId !== undefined && { choiceSetId: field.choiceSetId }),
      ...((isRelationship || isFile) && { isForeignKey: true }),
      ...(isRelationship && { referenceType: ReferenceType.ManyToOne }),
      ...(field.referenceEntityId !== undefined && { referenceEntity: { id: field.referenceEntityId } }),
      ...(field.referenceFieldId !== undefined && { referenceField: { id: field.referenceFieldId } }),
    };
  }

  /**
   * Derives the user-facing {@link EntityFieldDataType} for a field on the raw
   * API response. Throws if the field's `fieldDisplayType` and `sqlType.name`
   * are both unmappable.
   */
  private resolveFieldDataType(f: FieldMetaData): EntityFieldDataType {
    const mapped = this.tryResolveFieldDataType(f.fieldDisplayType, f.sqlType?.name);
    if (!mapped) {
      throw new ValidationError({
        message: `Cannot determine field type for '${f.name}' (id: ${f.id}) — sqlType '${f.sqlType?.name ?? '(missing)'}' and fieldDisplayType '${f.fieldDisplayType ?? '(missing)'}' are both unrecognized.`,
      });
    }
    return mapped;
  }

  /**
   * Validates that the user-supplied constraint properties on a field are
   * supported by the field's data type. Throws a `ValidationError` listing
   * any unsupported properties.
   */
  private validateFieldConstraints(
    type: EntityFieldDataType,
    field: Pick<EntityCreateFieldOptions, EntityFieldConstraint>,
    fieldName: string,
  ): void {
    const spec = ENTITY_FIELD_CONSTRAINT_SPEC[type] ?? {};
    const supported = Object.keys(spec) as EntityFieldConstraint[];
    const provided = Object.values(EntityFieldConstraint).filter(name => field[name] !== undefined);

    const unsupported = provided.filter(p => !(p in spec));
    if (unsupported.length > 0) {
      const allowedDesc = supported.length > 0 ? supported.join(', ') : 'none';
      throw new ValidationError({
        message: `Field '${fieldName}' of type ${type} does not accept ${unsupported.join(', ')}. Allowed constraints for this type: ${allowedDesc}.`,
      });
    }

    // Range check: each user-supplied constraint must be within its allowed bounds.
    for (const name of provided) {
      const range = spec[name];
      const value = field[name];
      if (range && value !== undefined && (value < range.min || value > range.max)) {
        throw new ValidationError({
          message: `Field '${fieldName}' of type ${type} has ${name} ${value} out of range [${range.min}, ${range.max}].`,
        });
      }
    }

    // Cross-field check: when both bounds are user-supplied in the same call,
    // minValue must be strictly less than maxValue.
    if (field.minValue !== undefined && field.maxValue !== undefined && field.minValue >= field.maxValue) {
      throw new ValidationError({
        message: `Field '${fieldName}' of type ${type} has minValue ${field.minValue} >= maxValue ${field.maxValue}. minValue must be strictly less than maxValue.`,
      });
    }
  }

  /**
   * Returns the sqlType constraint fields for a given field type.
   *
   * The API requires specific constraint properties to be set per SQL type;
   * without them the field is stored in an incomplete state, causing
   * "Field type cannot be changed" errors when the UI later tries to edit
   * advanced options. User-supplied values from `EntityCreateFieldOptions`
   * override the defaults where the type accepts overrides.
   */
  private buildSqlTypeConstraints(type: EntityFieldDataType, field: EntityCreateFieldOptions): Omit<SqlType, 'name'> {
    const defaults = ENTITY_FIELD_CONSTRAINT_DEFAULTS;
    switch (type) {
      case EntityFieldDataType.STRING:
        return { lengthLimit: field.lengthLimit ?? defaults.STRING_LENGTH_LIMIT };
      case EntityFieldDataType.MULTILINE_TEXT:
        return { lengthLimit: field.lengthLimit ?? defaults.MULTILINE_TEXT_LENGTH_LIMIT };
      case EntityFieldDataType.DECIMAL:
        return {
          lengthLimit: defaults.DECIMAL_LENGTH_LIMIT,
          decimalPrecision: field.decimalPrecision ?? defaults.DECIMAL_PRECISION,
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.BOOLEAN:
        return { lengthLimit: defaults.BOOLEAN_LENGTH_LIMIT };
      case EntityFieldDataType.DATE:
      case EntityFieldDataType.DATETIME_WITH_TZ:
        return { lengthLimit: defaults.DATE_LENGTH_LIMIT };
      case EntityFieldDataType.INTEGER:
      case EntityFieldDataType.BIG_INTEGER:
        return {
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.FLOAT:
      case EntityFieldDataType.DOUBLE:
        return {
          decimalPrecision: field.decimalPrecision ?? defaults.DECIMAL_PRECISION,
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.FILE:
      case EntityFieldDataType.RELATIONSHIP:
        // UNIQUEIDENTIFIER fixed lengthLimit (300)
        return { lengthLimit: defaults.UNIQUEIDENTIFIER_LENGTH_LIMIT };
      case EntityFieldDataType.CHOICE_SET_MULTIPLE:
        // CHOICE_SET_MULTIPLE fixed lengthLimit (4000)
        return { lengthLimit: defaults.CHOICE_SET_MULTIPLE_LENGTH_LIMIT };
      default:
        // UUID, CHOICE_SET_SINGLE, AUTO_NUMBER, DATETIME — (sqlType: { name })
        return {};
    }
  }

}
