import { ApiClient } from '../core/http/api-client';
import { Config } from '../core/config/config';
import { ExecutionContext } from '../core/context/execution-context';
import { RequestSpec } from '../models/common/request-spec';
import { TokenManager } from '../core/auth/token-manager';
import { PageResult, PaginationOptions, InternalPaginationOptions, PaginationType } from '../utils/pagination/pagination.types';
import { PaginationManager } from '../utils/pagination/pagination-manager';

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
    options: RequestSpec & { 
      pagination: { 
        paginationType: 'odata' | 'entity' | 'token';
        itemsField?: string; 
        totalCountField?: string;
        continuationTokenField?: string;
      } 
    }
  ): Promise<PageResult<T>> {
    const paginationType = this.getPaginationType(options.pagination.paginationType);
    
    // Extract pagination parameters from options or cursor, or use first page defaults
    const params = paginationOptions.cursor
      ? PaginationManager.getRequestParameters(paginationOptions)
      : {
          pageNumber: 1,
          pageSize: paginationOptions.pageSize,
          includeTotal: paginationOptions.includeTotal
        } as InternalPaginationOptions;
    
    // Validate pagination type if from cursor
    if (params.type && params.type !== paginationType) {
      throw new Error(`Pagination type mismatch: cursor is for ${params.type} but service uses ${paginationType}`);
    }
    
    // Prepare request parameters based on pagination type
    const requestParams: Record<string, any> = {};
    
    switch (paginationType) {
      case PaginationType.ODATA:
        if (params.pageSize) {
          requestParams.$top = Math.min(params.pageSize, 1000); // Respect 1000 max limit
        }
        if (params.pageNumber && params.pageNumber > 1 && params.pageSize) {
          requestParams.$skip = (params.pageNumber - 1) * params.pageSize;
        }
        if (params.includeTotal) {
          requestParams.$count = params.includeTotal;
        }
        break;
        
      case PaginationType.ENTITY:
        if (params.pageSize) {
          requestParams.limit = params.pageSize;
        }
        if (params.pageNumber && params.pageNumber > 1 && params.pageSize) {
          requestParams.start = (params.pageNumber - 1) * params.pageSize;
        } else {
          requestParams.start = 0;
        }
        break;
        
      case PaginationType.TOKEN:
        if (params.pageSize) {
          requestParams.takeHint = Math.min(params.pageSize, 1000);
        }
        if (params.continuationToken) {
          requestParams.continuationToken = params.continuationToken;
        }
        break;
    }
    
    // Merge pagination parameters with existing parameters
    options.params = {
      ...options.params,
      ...requestParams
    };
    
    // Make the request
    const response = await this.request<any>(method, path, options);
    
    // Extract items and metadata from response
    const itemsField = options.pagination.itemsField || 
      (paginationType === PaginationType.TOKEN ? 'items' : 'value');
    
    const totalCountField = options.pagination.totalCountField || 'totalRecordCount';
    
    const continuationTokenField = options.pagination.continuationTokenField || 'continuationToken';
    
    // Extract items
    const items = response.data[itemsField] || [];
    
    // Extract metadata
    const totalCount = response.data[totalCountField];
    const continuationToken = response.data[continuationTokenField];
    
    // Determine if there are more pages
    let hasMore = false;
    const currentPage = params.pageNumber || 1;
    const pageSize = params.pageSize;
    
    switch (paginationType) {
      case PaginationType.ODATA:
      case PaginationType.ENTITY:
        if (totalCount && pageSize) {
          hasMore = (currentPage * pageSize) < totalCount;
        } else {
          hasMore = items.length === pageSize;
        }
        break;
        
      case PaginationType.TOKEN:
        hasMore = !!continuationToken;
        break;
    }
    
    // Create and return the page result
    return PaginationManager.createPageResult<T>(
      items,
      {
        hasMore,
        totalCount,
        currentPage,
        pageSize,
        continuationToken,
        includeTotal: params.includeTotal
      },
      paginationType,
      params.extras || {}
    );
  }
  
  /**
   * Convert string pagination type to enum
   */
  private getPaginationType(type: 'odata' | 'entity' | 'token'): PaginationType {
    switch (type) {
      case 'odata':
        return PaginationType.ODATA;
      case 'entity':
        return PaginationType.ENTITY;
      case 'token':
        return PaginationType.TOKEN;
      default:
        throw new Error(`Unsupported pagination type: ${type}`);
    }
  }
}
