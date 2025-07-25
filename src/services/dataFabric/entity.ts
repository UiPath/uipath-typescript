import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { BaseService } from '../baseService';
import {
  EntityData,
  EntityQueryResponse,
  EntityQueryOptions,
  FilterExpression,
  EntityDataQueryRequest,
  FilterOperator,
  FilterCondition,
  LogicalOperator,
  RawQueryResponseJson,
  transformQueryResponse,
  transformFilter,
  transformExpansion,
  EntityRecord
} from '../../models/dataFabric/entity';
import { QueryBuilder } from '../../utils/builders/queryBuilder';
import { QueryParams } from '../../models/common/requestSpec';
import { TokenManager } from '../../core/auth/tokenManager';

/**
 * Service for interacting with the Data Fabric Entity API.
 * Provides methods for retrieving and managing entities.
 */
export class EntityService extends BaseService {
  private static readonly BASE_PATH = '/datafabric_/api/EntityService';

  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Retrieves all choice sets
   * @internal
   */
  private async getChoiceSets(): Promise<EntityRecord[]> {
    const response = await this.request<EntityRecord[]>(
      'GET',
      '/api/Entity/choiceset'
    );
    return response.data;
  }

  /**
   * Retrieves a specific choice set by ID
   * 
   * @param id ID of the choice set to retrieve
   * @returns Promise resolving to a choice set entity record
   * 
   * @example
   * ```typescript
   * // Get a specific choice set by ID
   * const choiceSet = await sdk.entity.getChoiceSetById("123e4567-e89b-12d3-a456-426614174000");
   * ```
   */
  async getChoiceSetById(id: string): Promise<EntityRecord> {
    const response = await this.request<EntityRecord>(
      'GET',
      `/api/Entity/choiceset/${id}`
    );
    return response.data;
  }

  /**
   * Retrieves a specific choice set by name
   * 
   * @param name Name of the choice set to retrieve
   * @returns Promise resolving to a choice set entity record, or null if not found
   * 
   * @example
   * ```typescript
   * // Get a specific choice set by name
   * const choiceSet = await sdk.entity.getChoiceSetByName("StatusChoices");
   * ```
   */
  async getChoiceSetByName(name: string): Promise<EntityRecord | null> {
    const choiceSets = await this.getChoiceSets();
    const choiceSet = choiceSets.find(cs => cs.name === name);
    return choiceSet || null;
  }

  /**
   * Creates a query builder for retrieving entities by name
   * 
   * @param entityName Name of the entity to retrieve
   * @returns A query builder for configuring and executing the query
   * 
   * @example
   * ```typescript
   * // Simple usage with default limit (50)
   * const results = await entityService.getByName("Customer");
   * 
   * // With custom limit and expansion
   * const results = await entityService.getByName("Customer")
   *   .limit(20)
   *   .selectFields('expansionLevel', 1);
   * 
   * // With filtering
   * const results = await entityService.getByName("Customer")
   *   .filter({
   *     operator: LogicalOperator.And,
   *     conditions: [
   *       {
   *         field: 'age',
   *         operator: FilterOperator.GreaterThan,
   *         value: 18
   *       },
   *       {
   *         field: 'status',
   *         operator: FilterOperator.Equals,
   *         value: 'active'
   *       }
   *     ]
   *   });
   * 
   * // With filtering and expansions
   * const results = await entityService.getByName("Customer")
   *   .filter({
   *     operator: LogicalOperator.And,
   *     conditions: [
   *       {
   *         field: 'status',
   *         operator: FilterOperator.Equals,
   *         value: 'active'
   *       }
   *     ],
   *     expansions: [
   *       {
   *         field: 'orders',
   *         select: ['id', 'date', 'total']
   *       }
   *     ]
   *   });
   * ```
   */
  getByName<T = EntityData>(entityName: string): EntityQueryBuilder<T> {
    const defaultOptions: EntityQueryOptions = {
      limit: 50,
      start: 0,
      expansionLevel: 0
    };

    return new EntityQueryBuilder<T>(
      defaultOptions,
      async (options: EntityQueryOptions, filter?: FilterExpression) => {
        // If no filter is provided, use the simple read endpoint
        if (!filter) {
          const response = await this.request<RawQueryResponseJson>(
            'GET',
            `${EntityService.BASE_PATH}/${entityName}/read`,
            { params: options as QueryParams }
          );
          return transformQueryResponse<T>(response.data);
        }

        // With filter, use the query_expansion endpoint
        const queryRequest: EntityDataQueryRequest = {
          selectedFields: options.select,
          start: options.start,
          limit: options.limit,
          sortOptions: options.sort?.map(s => ({
            fieldName: s.field,
            isDescending: s.descending || false
          })),
          expansions: options.expand?.map(transformExpansion),
          filterGroup: transformFilter(filter)
        };

        const response = await this.request<RawQueryResponseJson>(
          'POST',
          `${EntityService.BASE_PATH}/${entityName}/query_expansion`,
          {
            params: { expansionLevel: options.expansionLevel },
            body: queryRequest
          }
        );
        return transformQueryResponse<T>(response.data);
      }
    );
  }

  /**
   * Creates a query builder for retrieving an entity by ID
   * 
   * @param entityId Unique identifier of the entity
   * @returns A query builder for configuring and executing the query
   * 
   * @example
   * ```typescript
   * // Simple usage
   * const result = await entityService.getById("123");
   * 
   * // With expansion and filtering
   * const result = await entityService.getById("123")
   *   .selectFields('expansionLevel', 2)
   *   .filter({
   *     operator: LogicalOperator.Or,
   *     conditions: [
   *       {
   *         field: 'type',
   *         operator: FilterOperator.Equals,
   *         value: 'premium'
   *       }
   *     ]
   *   });
   * 
   * // With filtering and expansions in one call
   * const result = await entityService.getById("123")
   *   .filter({
   *     operator: LogicalOperator.And,
   *     conditions: [
   *       {
   *         field: 'status',
   *         operator: FilterOperator.Equals,
   *         value: 'active'
   *       }
   *     ],
   *     expansions: [
   *       {
   *         field: 'relatedEntity',
   *         select: ['id', 'name', 'description']
   *       }
   *     ]
   *   });
   * ```
   */
  getById<T = EntityData>(entityId: string): EntityQueryBuilder<T> {
    const defaultOptions: EntityQueryOptions = {
      limit: 50,
      start: 0,
      expansionLevel: 0
    };

    return new EntityQueryBuilder<T>(
      defaultOptions,
      async (options: EntityQueryOptions, filter?: FilterExpression) => {
        // If no filter is provided, use the simple read endpoint
        if (!filter) {
          const response = await this.request<RawQueryResponseJson>(
            'GET',
            `${EntityService.BASE_PATH}/entity/${entityId}/read`,
            { params: options as QueryParams }
          );
          return transformQueryResponse<T>(response.data);
        }

        // With filter, use the query_expansion endpoint
        const queryRequest: EntityDataQueryRequest = {
          selectedFields: options.select,
          start: options.start,
          limit: options.limit,
          sortOptions: options.sort?.map(s => ({
            fieldName: s.field,
            isDescending: s.descending || false
          })),
          expansions: options.expand?.map(transformExpansion),
          filterGroup: transformFilter(filter)
        };

        const response = await this.request<RawQueryResponseJson>(
          'POST',
          `${EntityService.BASE_PATH}/entity/${entityId}/query_expansion`,
          {
            params: { expansionLevel: options.expansionLevel },
            body: queryRequest
          }
        );
        return transformQueryResponse<T>(response.data);
      }
    );
  }
}

/**
 * Extended query builder with filtering support
 */
class EntityQueryBuilder<T> extends QueryBuilder<EntityQueryOptions, T> {
  private filterExpression?: FilterExpression;

  /**
   * Add a filter to the query
   * 
   * @param expression Filter expression with conditions and optional expansions
   */
  filter(expression: FilterExpression): this {
    this.filterExpression = expression;
    
    // If expansions are provided in the filter, add them to the options
    if (expression.expansions && expression.expansions.length > 0) {
      this.options.expand = expression.expansions;
    }
    
    return this;
  }

  /**
   * Implementation of PromiseLike interface
   */
  then<TResult1 = EntityQueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: EntityQueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.executeQuery(this.options, this.filterExpression).then(onfulfilled, onrejected);
  }
} 