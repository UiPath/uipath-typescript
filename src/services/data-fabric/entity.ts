import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { EntityServiceModel, EntityGetByIdResponse, createEntityWithMethods } from '../../models/data-fabric/entity.models';
import {
  EntityGetRecordsByIdOptions,
  EntityInsertOptions,
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetByIdResponse,
  EntityFieldDataType
} from '../../models/data-fabric/entity.types';
import { PaginatedResponse, HasPaginationOptions } from '../../utils/pagination/pagination.types';
import { PaginationType } from '../../utils/pagination/pagination.internal-types';
import { PaginationHelpers } from '../../utils/pagination/pagination-helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS } from '../../utils/constants/common';
import { NonPaginatedResponse } from '../../models/common/common-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { createParams } from '../../utils/http/params';
import { pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { EntityFieldTypeMap, SqlFieldType, EntityMap } from '../../models/data-fabric/entity.constants';

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets entity metadata by entity ID with attached operation methods
   * 
   * @param id - UUID of the entity
   * @returns Promise resolving to entity metadata with schema information and operation methods
   * 
   * @example
   * ```typescript
   * // Get entity metadata with methods
   * const entity = await sdk.entity.getById("<entityId>");
   * 
   * // Call operations directly on the entity
   * const records = await entity.getRecords();
   * 
   * const insertResult = await entity.insert([
   *   { name: "John", age: 30 }
   * ]);
   * ```
   */
  async getById(id: string): Promise<EntityGetByIdResponse> {
    // Get entity metadata
    const response = await this.get<RawEntityGetByIdResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id)
    );
    
    // Convert PascalCase keys to camelCase and apply EntityMap transformations
    const metadata = transformData(pascalToCamelCaseKeys(response.data) as RawEntityGetByIdResponse, EntityMap)
    
    // Transform metadata with field mappers
    this.applyFieldMappings(metadata);
    
    // Return the entity metadata with methods attached
    return createEntityWithMethods(metadata, this);
  }

  /**
   * Orchestrates all field mapping transformations
   * 
   * @param metadata - Entity metadata to transform
   * @private
   */
  private applyFieldMappings(metadata: RawEntityGetByIdResponse): void {
    this.mapFieldTypes(metadata);
    this.mapExternalFields(metadata);
  }

  /**
   * Maps SQL field types to friendly EntityFieldTypes
   * 
   * @param metadata - Entity metadata with fields
   * @private
   */
  private mapFieldTypes(metadata: RawEntityGetByIdResponse): void {
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
  private mapExternalFields(metadata: RawEntityGetByIdResponse): void {
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

  /**
   * Gets entity records by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param options - Query options including expansionLevel and pagination options
   * @returns Promise resolving to an array of entity records or paginated response
   * 
   * @example
   * ```typescript
   * // Basic usage (non-paginated)
   * const records = await sdk.entity.getRecordsById(<entityId>);
   * 
   * // With expansion level
   * const records = await sdk.entity.getRecordsById(<entityId>, {
   *   expansionLevel: 1
   * });
   * 
   * // With pagination
   * const paginatedResponse = await sdk.entity.getRecordsById(<entityId>, {
   *   pageSize: 50,
   *   expansionLevel: 1
   * });
   * 
   * // Navigate to next page
   * const nextPage = await sdk.entity.getRecordsById(<entityId>, {
   *   cursor: paginatedResponse.nextCursor,
   *   expansionLevel: 1
   * });
   * ```
   */
  async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
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
      transformFn: (item: Record<string, unknown>) => pascalToCamelCaseKeys(item) as EntityRecord,
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
   * Inserts data into an entity by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param data - Array of records to insert
   * @param options - Insert options
   * @returns Promise resolving to insert response
   * 
   * @example
   * ```typescript
   * // Basic usage
   * const result = await sdk.entity.insertById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ]);
   * 
   * // With options
   * const result = await sdk.entity.insertById(<entityId>, [
   *   { name: "John", age: 30 },
   *   { name: "Jane", age: 25 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  async insertById(id: string, data: Record<string, any>[], options: EntityInsertOptions = {}): Promise<EntityInsertResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel,
      failOnFirst: options.failOnFirst
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
   * // Basic usage
   * const result = await sdk.entity.updateById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ]);
   * 
   * // With options
   * const result = await sdk.entity.updateById(<entityId>, [
   *   { Id: "123", name: "John Updated", age: 31 },
   *   { Id: "456", name: "Jane Updated", age: 26 }
   * ], {
   *   expansionLevel: 1,
   *   failOnFirst: true
   * });
   * ```
   */
  async updateById(id: string, data: EntityRecord[], options: EntityUpdateOptions = {}): Promise<EntityUpdateResponse> {
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
   * // Basic usage
   * const result = await sdk.entity.deleteById(<entityId>, [
   *   <recordId-1>, <recordId-2>
   * ]);
   * ```
   */
  async deleteById(id: string, recordIds: string[], options: EntityDeleteOptions = {}): Promise<EntityDeleteResponse> {
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
}