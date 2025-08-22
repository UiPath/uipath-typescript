import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { EntityServiceModel, Entity } from '../../models/data-fabric/entity.models';
import {
  EntityGetByIdResponse,
  EntityGetByIdOptions,
  EntityFieldMetaData,
  EntityInsertOptions,
  EntityInsertResponse,
  EntityUpdateOptions,
  EntityUpdateResponse,
  EntityDeleteOptions,
  EntityDeleteResponse,
  EntityRecord
} from '../../models/data-fabric/entity.types';
import { EntityMetadataResponse } from '../../models/data-fabric/entity.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { createParams } from '../../utils/http/params';
import { transformData, pascalToCamelCaseKeys } from '../../utils/transform';
import { EntityMap, EntityFieldTypeMap, SqlFieldType } from '../../models/data-fabric/entity.constants';

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets entity data by entity ID
   * 
   * @param entityId - UUID of the entity
   * @param options - Query options including start, limit, and expansionLevel
   * @returns Promise resolving to an Entity instance
   * 
   * @example
   * ```typescript
   * // Basic usage
   * const entity = await sdk.entity.getById(<entityId>);
   * 
   * // With expansion level
   * const entity = await sdk.entity.getById(<entityId>, {
   *   expansionLevel: 1
   * });
   * ```
   */
  async getById(id: string, options: EntityGetByIdOptions = {}): Promise<Entity> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    // Get entity data
    const response = await this.get<Record<string, unknown>>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id),
      {
        params,
        ...options
      }
    );

    // Get entity fields
    const fields = await this._getEntityFields(id);

    // Convert PascalCase keys to camelCase
    const dataWithCamelCase = pascalToCamelCaseKeys(response.data);
    
    // Transform the response using EntityMap 
    const transformedData = transformData(dataWithCamelCase, EntityMap);

    const entityData = {
      ...transformedData,
      fields
    } as EntityGetByIdResponse;

    // Return a new Entity instance
    return new Entity(entityData, id, this);
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

  /**
   * Private method to get entity field information
   * @param entityId - UUID of the entity
   * @returns Promise resolving to array of field objects with name and type
   */
  private async _getEntityFields(entityId: string): Promise<EntityFieldMetaData[]> {
    try {
      const response = await this.get<EntityMetadataResponse>(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_METADATA(entityId)
      );

      // Extract field information from the response
      return this._mapEntityFields(response.data.fields || []);
    } catch (error) {
      console.warn(`Failed to fetch entity fields for ${entityId}:`, error);
      return [];
    }
  }

  /**
   * Maps raw field data to EntityFieldMetaData objects
   * @param rawFields - Array of raw field data from API response
   * @returns Array of structured EntityFieldMetaData objects
   */
  private _mapEntityFields(rawFields: EntityMetadataResponse['fields']): EntityFieldMetaData[] {
    const mappedFields = rawFields.map((field) => {
      const sqlTypeName = field.sqlType?.name;
      let fieldType: SqlFieldType;

      // Check if the sqlTypeName is a valid SqlFieldType
      if (sqlTypeName && Object.values(SqlFieldType).includes(sqlTypeName as SqlFieldType)) {
        fieldType = sqlTypeName as SqlFieldType;
      } else {
        // Log unknown type for monitoring
        console.warn(`Unknown SQL type encountered: ${sqlTypeName} for field ${field.name}`);
        fieldType = SqlFieldType.NVARCHAR; // fallback to NVARCHAR
      }

      // Map SQL type to entity type
      const entityType = EntityFieldTypeMap[fieldType];
      
      return {
        name: field.name,
        type: entityType
      };
    });

    // Filter out invalid field metadata
    return mappedFields.filter((field): field is EntityFieldMetaData => 
      typeof field.name === 'string'
    );
  }
}