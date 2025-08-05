import { ApiClient } from '../core/http/api-client';
import { Config } from '../core/config/config';
import { ExecutionContext } from '../core/context/execution-context';
import { RequestSpec } from '../models/common/request-spec';
import { TokenManager } from '../core/auth/token-manager';
import { PaginatedResponse, PaginationOptions } from '../utils/pagination/pagination.types';
import { 
  InternalPaginationOptions, 
  PaginationType, 
  PaginationServiceAccess,
  PaginationFieldNames,
  PaginationDetectionInfo,
  RequestWithPaginationOptions 
} from '../utils/pagination/pagination.internal-types';
import { PaginationManager } from '../utils/pagination/pagination-manager';
import { PaginationHelpers } from '../utils/pagination/pagination-helpers';
import { DEFAULT_PAGE_SIZE, getLimitedPageSize } from '../utils/pagination/pagination.constants';

export interface ApiResponse<T> {
  data: T;
}

export class BaseService {
  protected readonly config: Config;
  protected readonly executionContext: ExecutionContext;
  protected readonly apiClient: ApiClient;

  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    this.config = config;
    this.executionContext = executionContext;
    this.apiClient = new ApiClient(config, executionContext, tokenManager);
  }

  /**
   * Creates a service accessor for pagination helpers
   * This allows pagination helpers to access protected methods without making them public
   */
  protected createPaginationServiceAccess(): PaginationServiceAccess {
    return {
      get: <T>(path: string, options?: RequestSpec) => this.get<T>(path, options || {}),
      requestWithPagination: <T>(method: string, path: string, paginationOptions: PaginationOptions, options: RequestWithPaginationOptions) => 
        this.requestWithPagination<T>(method, path, paginationOptions, options)
    };
  }

  protected async request<T>(method: string, path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    switch (method.toUpperCase()) {
      case 'GET':
        return this.get<T>(path, options);
      case 'POST':
        return this.post<T>(path, options.body, options);
      case 'PUT':
        return this.put<T>(path, options.body, options);
      case 'PATCH':
        return this.patch<T>(path, options.body, options);
      case 'DELETE':
        return this.delete<T>(path, options);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  protected async requestWithSpec<T>(spec: RequestSpec): Promise<ApiResponse<T>> {
    if (!spec.method || !spec.url) {
      throw new Error('Request spec must include method and url');
    }
    return this.request<T>(spec.method, spec.url, spec);
  }

  protected async get<T>(path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.get<T>(path, options);
    return { data: response };
  }

  protected async post<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.post<T>(path, data, options);
    return { data: response };
  }

  protected async put<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.put<T>(path, data, options);
    return { data: response };
  }

  protected async patch<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.patch<T>(path, data, options);
    return { data: response };
  }

  protected async delete<T>(path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.delete<T>(path, options);
    return { data: response };
  }

  /**
   * Execute a request with cursor-based pagination
   */
  protected async requestWithPagination<T>(
    method: string,
    path: string,
    paginationOptions: PaginationOptions,
    options: RequestWithPaginationOptions
  ): Promise<PaginatedResponse<T>> {
    const paginationType = options.pagination.paginationType;
    
    // Validate and prepare pagination parameters
    const params = this.validateAndPreparePaginationParams(paginationType, paginationOptions);
    
    // Prepare request parameters based on pagination type
    const requestParams = this.preparePaginationRequestParams(paginationType, params);
    
    // Merge pagination parameters with existing parameters
    options.params = {
      ...options.params,
      ...requestParams
    };
    
    // Make the request
    const response = await this.request<any>(method, path, options);
    
    // Extract data from the response and create page result
    return this.createPaginatedResponseFromResponse<T>(
      response, 
      params, 
      paginationType, 
      {
        itemsField: options.pagination.itemsField,
        totalCountField: options.pagination.totalCountField,
        continuationTokenField: options.pagination.continuationTokenField
      }
    );
  }

  /**
   * Validates and prepares pagination parameters from options
   */
  private validateAndPreparePaginationParams(
    paginationType: PaginationType,
    paginationOptions: PaginationOptions
  ): InternalPaginationOptions {
    return PaginationHelpers.validatePaginationOptions(paginationOptions, paginationType);
  }

  /**
   * Prepares request parameters for pagination based on pagination type
   */
  private preparePaginationRequestParams(
    paginationType: PaginationType,
    params: InternalPaginationOptions
  ): Record<string, any> {
    const requestParams: Record<string, any> = {};
    let limitedPageSize: number;
    
    switch (paginationType) {
      case PaginationType.ODATA:
        limitedPageSize = getLimitedPageSize(params.pageSize);
        requestParams.$top = limitedPageSize;
        if (params.pageNumber && params.pageNumber > 1) {
          requestParams.$skip = (params.pageNumber - 1) * limitedPageSize;
        }
        // Always include total count
        requestParams.$count = true;
        break;
        
      case PaginationType.ENTITY:
        limitedPageSize = getLimitedPageSize(params.pageSize);
        requestParams.limit = limitedPageSize;
        if (params.pageNumber && params.pageNumber > 1) {
          requestParams.start = (params.pageNumber - 1) * limitedPageSize;
        } else {
          requestParams.start = 0;
        }
        break;
        
      case PaginationType.TOKEN:
        if (params.pageSize) {
          requestParams.takeHint = getLimitedPageSize(params.pageSize);
        }
        if (params.continuationToken) {
          requestParams.continuationToken = params.continuationToken;
        }
        break;
    }

    return requestParams;
  }

  /**
   * Creates a paginated response from API response
   */
  private createPaginatedResponseFromResponse<T>(
    response: ApiResponse<any>, 
    params: InternalPaginationOptions,
    paginationType: PaginationType,
    fields: PaginationFieldNames
  ): PaginatedResponse<T> {
    // Extract fields from response
    const itemsField = fields.itemsField || 
      (paginationType === PaginationType.TOKEN ? 'items' : 'value');
    
    const totalCountField = fields.totalCountField || 'totalRecordCount';
    
    const continuationTokenField = fields.continuationTokenField || 'continuationToken';
    
    // Extract items and metadata
    const items = response.data[itemsField] || [];
    const totalCount = response.data[totalCountField];
    const continuationToken = response.data[continuationTokenField];
    
    // Determine if there are more pages
    const hasMore = this.determineHasMorePages(
      paginationType,
      {
        totalCount,
        pageSize: params.pageSize,
        currentPage: params.pageNumber || 1,
        itemsCount: items.length,
        continuationToken
      }
    );
    
    // Create and return the page result
    return PaginationManager.createPaginatedResponse<T>(
      {
        pageInfo: {
          hasMore,
          totalCount,
          currentPage: params.pageNumber || 1,
          pageSize: params.pageSize,
          continuationToken
        },
        type: paginationType,
      },
      items
    );
  }

  /**
   * Determines if there are more pages based on pagination type and metadata
   */
  private determineHasMorePages(
    paginationType: PaginationType,
    info: PaginationDetectionInfo
  ): boolean {
    switch (paginationType) {
      case PaginationType.ODATA:
      case PaginationType.ENTITY:
        const effectivePageSize = info.pageSize ?? DEFAULT_PAGE_SIZE;
        
        // If totalCount is available, use it for precise calculation
        if (info.totalCount !== undefined) {
          return (info.currentPage * effectivePageSize) < info.totalCount;
        }
        
        // Fallback when totalCount is not available
        // NOTE: This code path should rarely be executed as the APIs typically return totalCount
        return info.itemsCount === effectivePageSize;
        
      case PaginationType.TOKEN:
        return !!info.continuationToken;
        
      default:
        return false;
    }
  }
}
