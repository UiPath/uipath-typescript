import {
  EntityGetRecordsByIdOptions,
  EntityGetRecordByIdOptions,
  EntityInsertOptions,
  EntityBatchInsertOptions,
  EntityInsertResponse,
  EntityBatchInsertResponse,
  EntityUpdateResponse,
  EntityUpdateRecordOptions,
  EntityUpdateRecordResponse,
  EntityDeleteResponse,
  EntityDeleteRecordResponse,
  EntityRecord,
  RawEntityGetResponse,
  EntityFileType,
  EntityUploadAttachmentOptions,
  EntityUploadAttachmentResponse,
  EntityDeleteAttachmentResponse,
  EntityInsertRecordsOptions,
  EntityUpdateRecordsOptions,
  EntityDeleteRecordsOptions,
  EntityGetAllRecordsOptions,
  EntityInsertRecordOptions,
  EntityQueryRecordsOptions,
  EntityImportRecordsResponse,
  EntityCreateOptions,
  EntityCreateFieldOptions,
  EntityUpdateByIdOptions,
} from './entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/**
 * Service for managing UiPath Data Fabric Entities.
 *
 * Entities are collections of records that can be used to store and manage data in the Data Fabric. [UiPath Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const entities = new Entities(sdk);
 * const allEntities = await entities.getAll();
 * ```
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
   * const allEntities = await entities.getAll();
   *
   * // Iterate through entities
   * allEntities.forEach(entity => {
   *   console.log(`Entity: ${entity.displayName} (${entity.name})`);
   *   console.log(`Type: ${entity.entityType}`);
   * });
   *
   * // Find a specific entity by name
   * const customerEntity = allEntities.find(e => e.name === 'Customer');
   *
   * // Use entity methods directly
   * if (customerEntity) {
   *   const records = await customerEntity.getAllRecords();
   *   console.log(`Customer records: ${records.items.length}`);
   *
   *   // Insert a single record
   *   const insertResult = await customerEntity.insertRecord({ name: "John", age: 30 });
   *
   *   // Or batch insert multiple records
   *   const batchResult = await customerEntity.insertRecords([
   *     { name: "Jane", age: 25 },
   *     { name: "Bob", age: 35 }
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
   * import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   * const choicesets = new ChoiceSets(sdk);
   *
   * // Get entity metadata with methods
   * const entity = await entities.getById("<entityId>");
   *
   * // Call operations directly on the entity
   * const records = await entity.getAllRecords();
   *
   * // If a field references a ChoiceSet, get the choiceSetId from records.fields
   * const choiceSetId = records.fields[0].referenceChoiceSet?.id;
   * if (choiceSetId) {
   *   const choiceSetValues = await choicesets.getById(choiceSetId);
   * }
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
   * const records = await entities.getAllRecords("<entityId>");
   *
   * // With expansion level
   * const records = await entities.getAllRecords(<entityId>, {
   *   expansionLevel: 1
   * });
   *
   * // With pagination
   * const paginatedResponse = await entities.getAllRecords(<entityId>, {
   *   pageSize: 50,
   *   expansionLevel: 1
   * });
   *
   * // Navigate to next page
   * const nextPage = await entities.getAllRecords(<entityId>, {
   *   cursor: paginatedResponse.nextCursor,
   *   expansionLevel: 1
   * });
   * ```
   */
  getAllRecords<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(entityId: string, options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * @deprecated Use {@link getAllRecords} instead.
   * @hidden
   */
  getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(entityId: string, options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * Gets a single entity record by entity ID and record ID
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record
   * @param options - Query options
   * @returns Promise resolving to a single entity record
   * {@link EntityRecord}
   * @example
   * ```typescript
   * // First, get records to obtain the record ID
   * const records = await entities.getAllRecords("<entityId>");
   * // Get the recordId for the record
   * const recordId = records.items[0].Id;
   * // Get the record
   * const record = await entities.getRecordById(<entityId>, recordId);
   * 
   * // With expansion level
   * const record = await entities.getRecordById(<entityId>, recordId, {
   *   expansionLevel: 1
   * });
   * ```
   */
  getRecordById(entityId: string, recordId: string, options?: EntityGetRecordByIdOptions): Promise<EntityRecord>;

  /**
   * Inserts a single record into an entity by entity ID
   *
   * Note: Data Fabric supports trigger events only on individual inserts, not on inserting multiple records.
   * Use this method if you need trigger events to fire for the inserted record.
   *
   * @param id - UUID of the entity
   * @param data - Record to insert
   * @param options - Insert options
   * @returns Promise resolving to the inserted record with generated record ID
   * {@link EntityInsertResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 });
   *
   * // With options
   * const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 }, {
   *   expansionLevel: 1
   * });
   * ```
   */
  insertRecordById(id: string, data: Record<string, any>, options?: EntityInsertRecordOptions): Promise<EntityInsertResponse>;

  /**
   * @deprecated Use {@link insertRecordById} instead.
   * @hidden
   */
  insertById(id: string, data: Record<string, any>, options?: EntityInsertOptions): Promise<EntityInsertResponse>;

  /**
   * Inserts one or more records into an entity by entity ID
   *
   * Note: Records inserted using insertRecordsById will not trigger Data Fabric trigger events. Use {@link insertRecordById} if you need
   * trigger events to fire for each inserted record.
   *
   * @param id - UUID of the entity
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   * {@link EntityBatchInsertResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await entities.insertRecordsById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ]);
   *
   * // With options
   * const result = await entities.insertRecordsById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  insertRecordsById(id: string, data: Record<string, any>[], options?: EntityInsertRecordsOptions): Promise<EntityBatchInsertResponse>;

  /**
   * @deprecated Use {@link insertRecordsById} instead.
   * @hidden
   */
  batchInsertById(id: string, data: Record<string, any>[], options?: EntityBatchInsertOptions): Promise<EntityBatchInsertResponse>;

  /**
   * Updates a single record in an entity by entity ID
   *
   * Note: Data Fabric supports trigger events only on individual updates, not on updating multiple records.
   * Use this method if you need trigger events to fire for the updated record.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to update
   * @param data - Key-value pairs of fields to update
   * @param options - Update options
   * @returns Promise resolving to the updated record
   * {@link EntityUpdateRecordResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await entities.updateRecordById(<entityId>, <recordId>, { name: "John Updated", age: 31 });
   *
   * // With options
   * const result = await entities.updateRecordById(<entityId>, <recordId>, { name: "John Updated", age: 31 }, {
   *   expansionLevel: 1
   * });
   * ```
   */
  updateRecordById(entityId: string, recordId: string, data: Record<string, any>, options?: EntityUpdateRecordOptions): Promise<EntityUpdateRecordResponse>;

  /**
   * Updates data in an entity by entity ID
   *
   * Note: Records updated using updateRecordsById will not trigger Data Fabric trigger events. Use {@link updateRecordById} if you need trigger events to fire for each updated record.
   *
   * @param id - UUID of the entity
   * @param data - Array of records to update. Each record MUST contain the record id.
   * @param options - Update options
   * @returns Promise resolving to update response
   * {@link EntityUpdateResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await entities.updateRecordsById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ]);
   *
   * // With options
   * const result = await entities.updateRecordsById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  updateRecordsById(id: string, data: EntityRecord[], options?: EntityUpdateRecordsOptions): Promise<EntityUpdateResponse>;


  /**
   * Deletes data from an entity by entity ID
   *
   * Note: Records deleted using deleteRecordsById will not trigger Data Fabric trigger events. Use {@link deleteRecordById} if you need trigger events to fire for the deleted record.
   *
   * @param id - UUID of the entity
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   * {@link EntityDeleteResponse}
   * @example
   * ```typescript
   * // Basic usage
   * const result = await entities.deleteRecordsById(<entityId>, [
   *   <recordId-1>, <recordId-2>
   * ]);
   * ```
   */
  deleteRecordsById(id: string, recordIds: string[], options?: EntityDeleteRecordsOptions): Promise<EntityDeleteResponse>;


  /**
   * Deletes a single record from an entity by entity ID and record ID
   *
   * Note: Data Fabric supports trigger events only on individual deletes, not on deleting multiple records.
   * Use this method if you need trigger events to fire for the deleted record.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to delete
   * @returns Promise resolving to {@link EntityDeleteRecordResponse}
   * @example
   * ```typescript
   * const result = await entities.deleteRecordById(<entityId>, <recordId>);
   * console.log(result.success); // true
   * ```
   */
  deleteRecordById(entityId: string, recordId: string): Promise<EntityDeleteRecordResponse>;

  /**
   * Queries entity records with filters, sorting, and SDK-managed pagination
   *
   * @param id - UUID of the entity
   * @param options - Query options including filterGroup, selectedFields, sortOptions, and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} without pagination options,
   *   or {@link PaginatedResponse} when `pageSize`, `cursor`, or `jumpToPage` are provided
   * @example
   * ```typescript
   * import { Entities, LogicalOperator, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // Non-paginated query with a filter
   * const result = await entities.queryRecordsById(<id>, {
   *   filterGroup: {
   *     logicalOperator: LogicalOperator.And,
   *     queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }]
   *   },
   *   sortOptions: [{ fieldName: "createdTime", isDescending: true }],
   * });
   * console.log(`Found ${result.totalCount} records`);
   *
   * // With pagination
   * const page1 = await entities.queryRecordsById(<id>, { pageSize: 25 });
   * if (page1.hasNextPage) {
   *   const page2 = await entities.queryRecordsById(<id>, { cursor: page1.nextCursor });
   * }
   * ```
   */
  queryRecordsById<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(id: string, options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * Imports records from a CSV file into an entity
   *
   * @param id - UUID of the entity
   * @param file - CSV file to import as a Blob or File or Uint8Array
   * @returns Promise resolving to {@link EntityImportRecordsResponse} with record counts
   * @example
   * ```typescript
   * // Browser: upload from file input
   * const fileInput = document.getElementById('csv-input') as HTMLInputElement;
   * const result = await entities.importRecordsById(<id>, fileInput.files[0]);
   * console.log(`Inserted ${result.insertedRecords} of ${result.totalRecords} records`);
   * ```
   * @internal
   */
  importRecordsById(id: string, file: EntityFileType): Promise<EntityImportRecordsResponse>;

  /**
   * Downloads an attachment stored in a File-type field of an entity record.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to Blob containing the file content
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * // First, get records to obtain the record ID
   * const records = await entities.getAllRecords("<entityId>");
   * // Get the recordId for the record that contains the attachment
   * const recordId = records.items[0].Id;
   *
   * // Get the entityId from getAll()
   * const allEntities = await entities.getAll();
   * const entityId = allEntities[0].id;
   *
   * // Get the recordId from getAllRecords()
   * const records = await entities.getAllRecords(entityId);
   * const recordId = records[0].Id;
   *
   * // Download attachment using service method
   * const response = await entities.downloadAttachment(entityId, recordId, 'Documents');
   *
   * // Or download using entity method (entityId is already known)
   * const entity = await entities.getById(entityId);
   * const blob = await entity.downloadAttachment(recordId, 'Documents');
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
  downloadAttachment(entityId: string, recordId: string, fieldName: string): Promise<Blob>;

  /**
   * Uploads an attachment to a File-type field of an entity record.
   *
   * Uses multipart/form-data to upload the file content to the specified field.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record to upload the attachment to
   * @param fieldName - Name of the File-type field
   * @param file - File to upload (Blob, File, or Uint8Array)
   * @param options - Optional {@link EntityUploadAttachmentOptions} (e.g. expansionLevel)
   * @returns Promise resolving to {@link EntityUploadAttachmentResponse}
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
   * // Browser: Upload a file from an input element
   * const fileInput = document.getElementById('file-input') as HTMLInputElement;
   * const file = fileInput.files[0];
   * const response = await entities.uploadAttachment(entityId, recordId, 'Documents', file);
   *
   * // Node.js: Upload a file from disk
   * const fileBuffer = fs.readFileSync('document.pdf');
   * const blob = new Blob([fileBuffer], { type: 'application/pdf' });
   * const response = await entities.uploadAttachment(entityId, recordId, 'Documents', blob);
   * ```
   */
  uploadAttachment(entityId: string, recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse>;

  /**
   * Removes an attachment from a File-type field of an entity record.
   *
   * @param entityId - UUID of the entity
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to {@link EntityDeleteAttachmentResponse}
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
   * // Or delete using entity method (entityId is already known)
   * const entity = await entities.getById(entityId);
   * await entity.deleteAttachment(recordId, 'Documents');
   * ```
   */
  deleteAttachment(entityId: string, recordId: string, fieldName: string): Promise<EntityDeleteAttachmentResponse>;

  /**
   * Creates a new Data Fabric entity with the given schema
   *
   * @param name - Entity name — must start with a letter, letters/numbers/underscores only
   *   (e.g., `"productCatalog"`).
   * @param fields - Array of field definitions
   * @param options - Optional entity-level settings ({@link EntityCreateOptions})
   * @returns Promise resolving to the ID of the created entity
   * @example
   * ```typescript
   * import { Entities } from '@uipath/uipath-typescript/entities';
   *
   * const entities = new Entities(sdk);
   *
   * const id = await entities.create("product_catalog", [
   *   { fieldName: "product_name", type: EntityFieldDataType.STRING, isRequired: true, isUnique: true },
   *   { fieldName: "price", type: EntityFieldDataType.INTEGER, defaultValue: "0" },
   * ], { displayName: "Product Catalog", description: "Our product catalog", isRbacEnabled: true });
   * ```
   * @internal
   */
  create(name: string, fields: EntityCreateFieldOptions[], options?: EntityCreateOptions): Promise<string>;

  /**
   * Deletes a Data Fabric entity and all its records
   *
   * @param id - UUID of the entity to delete
   * @returns Promise resolving when the entity is deleted
   * @example
   * ```typescript
   * await entities.deleteById(<id>);
   * ```
   * @internal
   */
  deleteById(id: string): Promise<void>;

  /**
   * Updates an existing Data Fabric entity — schema and/or metadata.
   *
   * Pass any combination of schema fields (`addFields`, `removeFields`, `updateFields`) and
   * metadata fields (`displayName`, `description`, `isRbacEnabled`). Each group is applied
   * only when the corresponding fields are provided.
   *
   * @param id - UUID of the entity to update
   * @param name - name of the entity (required by the API)
   * @param options - Changes to apply ({@link EntityUpdateByIdOptions})
   * @returns Promise resolving when the update is complete
   *
   * @example
   * ```typescript
   * // Schema-only: add a field and remove another
   * await entities.updateById(<id>, {
   *   addFields: [{ fieldName: "notes", type: EntityFieldDataType.MULTILINE_TEXT }],
   *   removeFields: [{ fieldName: "old_field" }],
   * });
   *
   * // Metadata-only: rename the entity
   * await entities.updateById(<id>, {
   *   displayName: "My Updated Entity",
   *   description: "Updated description",
   * });
   *
   * // Combined: update a field and rename at the same time
   * await entities.updateById(<id>, {
   *   updateFields: [{ id: <fieldId>, displayName: "Unit Price", isRequired: true }],
   *   displayName: "Price Catalog",
   * });
   * ```
   * @internal
   */
  updateById(id: string, options?: EntityUpdateByIdOptions): Promise<void>;

}

/**
 * Entity methods interface - defines operations that can be performed on an entity
 */
export interface EntityMethods {
  /**
   * Insert a single record into this entity
   *
   * Note: Data Fabric supports trigger events only on individual inserts, not on inserting multiple records.
   * Use this method if you need trigger events to fire for the inserted record.
   *
   * @param data - Record to insert
   * @param options - Insert options
   * @returns Promise resolving to the inserted record with generated record ID
   */
  insertRecord(data: Record<string, any>, options?: EntityInsertRecordOptions): Promise<EntityInsertResponse>;

  /**
   * Insert multiple records into this entity using insertRecords
   *
   * Note: Inserting multiple records do not trigger Data Fabric trigger events. Use {@link insertRecord} if you need
   * trigger events to fire for each inserted record.
   *
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to batch insert response
   */
  insertRecords(data: Record<string, any>[], options?: EntityInsertRecordsOptions): Promise<EntityBatchInsertResponse>;

  /**
   * Update a single record in this entity
   *
   * Note: Data Fabric supports trigger events only on individual updates, not on updating multiple records.
   * Use this method if you need trigger events to fire for the updated record.
   *
   * @param recordId - UUID of the record to update
   * @param data - Key-value pairs of fields to update
   * @param options - Update options
   * @returns Promise resolving to the updated record
   */
  updateRecord(recordId: string, data: Record<string, any>, options?: EntityUpdateRecordOptions): Promise<EntityUpdateRecordResponse>;

  /**
   * Update data in this entity
   *
   * Note: Records updated using updateRecords will not trigger Data Fabric trigger events. Use {@link updateRecord} if you need
   * trigger events to fire for each updated record.
   *
   * @param data - Array of records to update. Each record MUST contain the record Id,
   *               otherwise the update will fail.
   * @param options - Update options
   * @returns Promise resolving to update response
   */
  updateRecords(data: EntityRecord[], options?: EntityUpdateRecordsOptions): Promise<EntityUpdateResponse>;

  /**
   * Delete data from this entity
   *
   * @param recordIds - Array of record UUIDs to delete
   * @param options - Delete options
   * @returns Promise resolving to delete response
   */
  deleteRecords(recordIds: string[], options?: EntityDeleteRecordsOptions): Promise<EntityDeleteResponse>;

  /**
   * Delete a single record from this entity
   *
   * Note: Data Fabric supports trigger events only on individual deletes, not on deleting multiple records.
   * Use this method if you need trigger events to fire for the deleted record.
   *
   * @param recordId - UUID of the record to delete
   * @returns Promise resolving to delete response
   */
  deleteRecord(recordId: string): Promise<EntityDeleteRecordResponse>;

  /**
   * Get all records from this entity
   *
   * @param options - Query options
   * @returns Promise resolving to query response
   */
  getAllRecords<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * Gets a single record from this entity by record ID
   *
   * @param recordId - UUID of the record
   * @param options - Query options including expansionLevel
   * @returns Promise resolving to the entity record
   */
  getRecord(recordId: string, options?: EntityGetRecordByIdOptions): Promise<EntityRecord>;

  /**
   * Downloads an attachment stored in a File-type field of an entity record
   *
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to Blob containing the file content
   */
  downloadAttachment(recordId: string, fieldName: string): Promise<Blob>;

  /**
   * Uploads an attachment to a File-type field of an entity record
   *
   * @param recordId - UUID of the record to upload the attachment to
   * @param fieldName - Name of the File-type field
   * @param file - File to upload (Blob, File, or Uint8Array)
   * @param options - Optional {@link EntityUploadAttachmentOptions} (e.g. expansionLevel)
   * @returns Promise resolving to {@link EntityUploadAttachmentResponse}
   */
  uploadAttachment(recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse>;

  /**
   * Deletes an attachment from a File-type field of an entity record
   *
   * @param recordId - UUID of the record containing the attachment
   * @param fieldName - Name of the File-type field containing the attachment
   * @returns Promise resolving to {@link EntityDeleteAttachmentResponse}
   */
  deleteAttachment(recordId: string, fieldName: string): Promise<EntityDeleteAttachmentResponse>;

  /**
   * @deprecated Use {@link insertRecord} instead.
   * @hidden
   */
  insert(data: Record<string, any>, options?: EntityInsertOptions): Promise<EntityInsertResponse>;

  /**
   * @deprecated Use {@link insertRecords} instead.
   * @hidden
   */
  batchInsert(data: Record<string, any>[], options?: EntityBatchInsertOptions): Promise<EntityBatchInsertResponse>;

  /**
   * Queries records in this entity with filters, sorting, and SDK-managed pagination
   *
   * @param options - Query options including filterGroup, selectedFields, sortOptions, and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} without pagination options,
   *   or {@link PaginatedResponse} when `pageSize`, `cursor`, or `jumpToPage` are provided
   * @example
   * ```typescript
   * const entity = await entities.getById(<entityId>);
   * const result = await entity.queryRecords({
   *   filterGroup: {
   *     logicalOperator: LogicalOperator.And,
   *     queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }]
   *   },
   *   sortOptions: [{ fieldName: "createdTime", isDescending: true }],
   * });
   * console.log(`Found ${result.totalCount} records`);
   * ```
   */
  queryRecords<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * Imports records from a CSV file into this entity
   *
   * @param file - CSV file to import as a Blob, File, or Uint8Array
   * @returns Promise resolving to {@link EntityImportRecordsResponse} with record counts
   * @example
   * ```typescript
   * const entity = await entities.getById(<entityId>);
   * const fileInput = document.getElementById('csv-input') as HTMLInputElement;
   * const result = await entity.importRecords(fileInput.files[0]);
   * console.log(`Inserted ${result.insertedRecords} of ${result.totalRecords} records`);
   * ```
   */
  importRecords(file: EntityFileType): Promise<EntityImportRecordsResponse>;

  /**
   * @deprecated Use {@link getAllRecords} instead.
   * @hidden
   */
  getRecords<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  >;

  /**
   * Deletes this entity and all its records
   *
   * @returns Promise resolving when the entity is deleted
   * @example
   * ```typescript
   * const entity = await entities.getById(<id>);
   * await entity.delete();
   * ```
   * @internal
   */
  delete(): Promise<void>;

  /**
   * Updates this entity — schema and/or metadata.
   *
   * @param options - Changes to apply ({@link EntityUpdateByIdOptions})
   * @returns Promise resolving when the update is complete
   * @example
   * ```typescript
   * const entity = await entities.getById(<id>);
   * await entity.update({
   *   displayName: "Updated Name",
   *   addFields: [{ fieldName: "notes", type: EntityFieldDataType.MULTILINE_TEXT }],
   * });
   * ```
   * @internal
   */
  update(options?: EntityUpdateByIdOptions): Promise<void>;

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
    async insertRecord(data: Record<string, any>, options?: EntityInsertRecordOptions): Promise<EntityInsertResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.insertRecordById(entityData.id, data, options);
    },

    async insertRecords(data: Record<string, any>[], options?: EntityInsertRecordsOptions): Promise<EntityBatchInsertResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.insertRecordsById(entityData.id, data, options);
    },

    async updateRecord(recordId: string, data: Record<string, any>, options?: EntityUpdateRecordOptions): Promise<EntityUpdateRecordResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      if (!recordId) throw new Error('Record ID is undefined');
      return service.updateRecordById(entityData.id, recordId, data, options);
    },

    async updateRecords(data: EntityRecord[], options?: EntityUpdateRecordsOptions): Promise<EntityUpdateResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.updateRecordsById(entityData.id, data, options);
    },

    async deleteRecords(recordIds: string[], options?: EntityDeleteRecordsOptions): Promise<EntityDeleteResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.deleteRecordsById(entityData.id, recordIds, options);
    },

    async deleteRecord(recordId: string): Promise<EntityDeleteRecordResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      if (!recordId) throw new Error('Record ID is undefined');
      return service.deleteRecordById(entityData.id, recordId);
    },

    async getAllRecords<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<EntityRecord>
        : NonPaginatedResponse<EntityRecord>
    > {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.getAllRecords<T>(entityData.id, options);
    },

    async getRecord(recordId: string, options?: EntityGetRecordByIdOptions): Promise<EntityRecord> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      if (!recordId) throw new Error('Record ID is undefined');
      return service.getRecordById(entityData.id, recordId, options);
    },

    async downloadAttachment(recordId: string, fieldName: string): Promise<Blob> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.downloadAttachment(entityData.id, recordId, fieldName);
    },

    async uploadAttachment(recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.uploadAttachment(entityData.id, recordId, fieldName, file, options);
    },

    async deleteAttachment(recordId: string, fieldName: string): Promise<EntityDeleteAttachmentResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.deleteAttachment(entityData.id, recordId, fieldName);
    },

    async queryRecords<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<EntityRecord>
        : NonPaginatedResponse<EntityRecord>
    > {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.queryRecordsById(entityData.id, options);
    },

    async importRecords(file: EntityFileType): Promise<EntityImportRecordsResponse> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.importRecordsById(entityData.id, file);
    },

    async insert(data: Record<string, any>, options?: EntityInsertOptions): Promise<EntityInsertResponse> {
      return this.insertRecord(data, options);
    },

    async batchInsert(data: Record<string, any>[], options?: EntityBatchInsertOptions): Promise<EntityBatchInsertResponse> {
      return this.insertRecords(data, options);
    },


    async getRecords<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<EntityRecord>
        : NonPaginatedResponse<EntityRecord>
    > {
      return this.getAllRecords(options);
    },

    async delete(): Promise<void> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.deleteById(entityData.id);
    },

    async update(options: EntityUpdateByIdOptions): Promise<void> {
      if (!entityData.id) throw new Error('Entity ID is undefined');
      return service.updateById(entityData.id, options);
    },
  };
}

/**
 * Creates an actionable entity by combining entity metadata with data and management methods
 *
 * @param entityMetadata - Entity metadata
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
