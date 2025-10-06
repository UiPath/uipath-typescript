import { ApiClient } from '../core/http/api-client';
import { Config } from '../core/config/config';
import { ExecutionContext } from '../core/context/execution';
import { RequestSpec } from '../models/common/request-spec';
import { TokenManager } from '../core/auth/token-manager';
import { PaginatedResponse, PaginationOptions } from '../utils/pagination/types';
import { 
  InternalPaginationOptions, 
  PaginationType, 
  PaginationServiceAccess,
  PaginationFieldNames,
  PaginationDetectionInfo,
  RequestWithPaginationOptions 
} from '../utils/pagination/internal-types';
import { PaginationManager } from '../utils/pagination/pagination-manager';
import { PaginationHelpers } from '../utils/pagination/helpers';
import { DEFAULT_PAGE_SIZE, getLimitedPageSize } from '../utils/pagination/constants';
import { ODATA_OFFSET_PARAMS, BUCKET_TOKEN_PARAMS } from '../utils/constants/common';

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
    const requestParams = this.preparePaginationRequestParams(paginationType, params, options.pagination);
    
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
    params: InternalPaginationOptions,
    paginationConfig?: RequestWithPaginationOptions['pagination']
  ): Record<string, any> {
    const requestParams: Record<string, any> = {};
    let limitedPageSize: number;
    
    const paginationParams = paginationConfig?.paginationParams;
    
    switch (paginationType) {
      case PaginationType.OFFSET:
        limitedPageSize = getLimitedPageSize(params.pageSize);
        const pageSizeParam = paginationParams?.pageSizeParam || ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM;
        const offsetParam = paginationParams?.offsetParam || ODATA_OFFSET_PARAMS.OFFSET_PARAM;
        const countParam = paginationParams?.countParam || ODATA_OFFSET_PARAMS.COUNT_PARAM;
        
        requestParams[pageSizeParam] = limitedPageSize;
        if (params.pageNumber && params.pageNumber > 1) {
          requestParams[offsetParam] = (params.pageNumber - 1) * limitedPageSize;
        }
        // Include total count for ODATA APIs
        if (countParam) {
          requestParams[countParam] = true;
        }
        break;
        
      case PaginationType.TOKEN:
        const tokenPageSizeParam = paginationParams?.pageSizeParam || BUCKET_TOKEN_PARAMS.PAGE_SIZE_PARAM;
        const tokenParam = paginationParams?.tokenParam || BUCKET_TOKEN_PARAMS.TOKEN_PARAM;
        
        if (params.pageSize) {
          requestParams[tokenPageSizeParam] = getLimitedPageSize(params.pageSize);
        }
        if (params.continuationToken) {
          requestParams[tokenParam] = params.continuationToken;
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
          currentPage: params.pageNumber,
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
      case PaginationType.OFFSET:
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
