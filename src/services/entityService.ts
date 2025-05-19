import { EntityDataQueryRequest, QueryResponse } from '../models/entity';
import { BaseService } from './baseService';

export class EntityService extends BaseService {
  /**
   * Query entities by entity name with expansion support
   * @param entityId - Name of the entity to query
   * @param queryRequest - Query parameters for filtering, ordering, and pagination
   * @param expansionLevel - Level of related entity expansion (default: 0)
   * @returns Promise<QueryResponse>
   */
  async queryByEntityId(
    entityId: string,
    queryRequest: EntityDataQueryRequest,
    expansionLevel: number = 0
  ): Promise<QueryResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (expansionLevel > 0) {
        queryParams.append('expansionLevel', expansionLevel.toString());
      }

      const url = `dataservice_/api/EntityService/entity/${entityId}/query_expansion${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await this.request<QueryResponse>('POST', url, {
        data: queryRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Read entities by entity name with pagination and expansion support
   * @param entityName - Name of the entity to read
   * @param start - Starting index for pagination
   * @param limit - Number of records to return
   * @param expansionLevel - Level of related entity expansion (default: 0)
   * @returns Promise<QueryResponse>
   */
  async readByEntityName(
    entityName: string,
    start?: number,
    limit?: number,
    expansionLevel: number = 0
  ): Promise<QueryResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (typeof start !== 'undefined') queryParams.append('start', start.toString());
      if (typeof limit !== 'undefined') queryParams.append('limit', limit.toString());
      if (expansionLevel > 0) queryParams.append('expansionLevel', expansionLevel.toString());

      const queryString = queryParams.toString();
      const url = `dataservice_/api/EntityService/${entityName}/read${queryString ? `?${queryString}` : ''}`;

      const response = await this.request<QueryResponse>('GET', url);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Insert a new entity record
   * @param entityName - Name of the entity to insert into
   * @param data - The entity data to insert
   * @param expansionLevel - Level of related entity expansion in the response (default: 0)
   * @returns Promise<Record<string, any>> - The inserted entity data
   */
  async insertByEntityName(
    entityName: string,
    data: Record<string, any>,
    expansionLevel: number = 0
  ): Promise<Record<string, any>> {
    try {
      const queryParams = new URLSearchParams();
      if (expansionLevel > 0) {
        queryParams.append('expansionLevel', expansionLevel.toString());
      }

      const url = `dataservice_/api/EntityService/${entityName}/insert${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await this.request<Record<string, any>>('POST', url, {
        data,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
} 
