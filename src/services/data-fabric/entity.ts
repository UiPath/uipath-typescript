import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { EntityServiceModel } from '../../models/data-fabric/entity.models';
import {
  EntityGetByIdResponse,
  EntityGetByIdOptions,
  EntityFieldMetaData
} from '../../models/data-fabric/entity.types';
import { EntityMetadataResponse } from '../../models/data-fabric/entity.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints';
import { createParams } from '../../utils/http/params';
import { transformData } from '../../utils/transform';
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
   * @returns Promise resolving to query response
   * 
   * @example
   * ```typescript
   * // Basic usage
   * const result = await sdk.entity.getById("123e4567-e89b-12d3-a456-426614174000");
   * 
   * // With expansion level
   * const result = await sdk.entity.getById("123e4567-e89b-12d3-a456-426614174000", {
   *   expansionLevel: 1
   * });
   * ```
   */
  async getById(id: string, options: EntityGetByIdOptions = {}): Promise<EntityGetByIdResponse> {
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

    // Transform the response using EntityMap 
    const transformedData = transformData(response.data, EntityMap);

    return {
      ...transformedData,
      fields
    } as EntityGetByIdResponse;
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