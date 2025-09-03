import { PaginationOptions, PaginatedResponse, PaginationMethodUnion } from './pagination.types';
import { RequestSpec } from '../../models/common/request-spec';

/**
 * Cursor data structure for tracking pagination state
 */
export interface CursorData {
  /** The type of pagination used by this service */
  type: PaginationType;
  
  /** For OData and Entity pagination */
  pageNumber?: number;
  
  /** For token-based pagination */
  continuationToken?: string;
  
  /** Common parameters */
  pageSize?: number;
}

/**
 * Pagination options used by the pagination implementation
 */
export type InternalPaginationOptions = {
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  
  /** Current page number (1-based) */
  pageNumber?: number;
  
  /** Token for continuing pagination */
  continuationToken?: string;
  
  /** Pagination type */
  type?: any; // Will be properly typed in the pagination service
} & PaginationMethodUnion;

/**
 * Pagination types supported by the SDK
 */
export enum PaginationType {
  ODATA = 'odata',
  ENTITY = 'entity',
  TOKEN = 'token'
}

/**
 * Interface for service access methods needed by pagination helpers
 */
export interface PaginationServiceAccess {
  get<T>(path: string, options?: any): Promise<{ data: T }>;
  requestWithPagination<T>(
    method: string,
    path: string,
    paginationOptions: PaginationOptions,
    options: RequestWithPaginationOptions
  ): Promise<PaginatedResponse<T>>;
}

/**
 * Interface for getAllPaginated parameters
 */
export interface GetAllPaginatedParams<T, R = T> {
  serviceAccess: PaginationServiceAccess;
  getEndpoint: (folderId?: number) => string;
  folderId?: number; 
  paginationParams: PaginationOptions;
  additionalParams: Record<string, any>;
  /** 
   * Optional function to transform API response items.
   */
  transformFn?: (item: T) => R;
  options?: {
    paginationType?: PaginationType;
    itemsField?: string;
    totalCountField?: string;
    continuationTokenField?: string;
  };
}

/**
 * Interface for getAllNonPaginated parameters
 */
export interface GetAllNonPaginatedParams<T, R = T> {
  serviceAccess: PaginationServiceAccess;
  getAllEndpoint: string;
  getByFolderEndpoint: string;
  folderId?: number; 
  additionalParams: Record<string, any>;
  /** 
   * Optional function to transform API response items.
   */
  transformFn?: (item: T) => R;
  options?: {
    itemsField?: string;
    totalCountField?: string;
  };
}

/**
 * Information about a page of results
 */
export interface PageInfo {
  /** Whether there are more pages available */
  hasMore: boolean;
  /** Total count of items (if available) */
  totalCount?: number;
  /** Current page number (for page-based pagination) */
  currentPage?: number;
  /** Page size */
  pageSize?: number;
  /** Continuation token (for token-based pagination) */
  continuationToken?: string;
}

/**
 * Common parameters for creating pagination cursors and responses.
 */
export interface PaginationInfo {
  pageInfo: PageInfo;
  type: PaginationType;
}

/**
 * Field names for extracting data from paginated responses.
 */
export interface PaginationFieldNames {
  itemsField?: string;
  totalCountField?: string;
  continuationTokenField?: string;
}

/**
 * Options for the requestWithPagination method in BaseService.
 */
export interface RequestWithPaginationOptions extends RequestSpec {
  pagination: PaginationFieldNames & {
    paginationType: PaginationType;
  };
}

/**
 * Information needed to determine if more pages are available.
 */
export interface PaginationDetectionInfo {
  totalCount?: number;
  pageSize?: number;
  currentPage: number;
  itemsCount: number;
  continuationToken?: string;
}

/**
 * Configuration for pagination options
 */
export interface PaginationConfig {
  paginationType?: PaginationType;
  itemsField?: string;
  totalCountField?: string;
  continuationTokenField?: string;
}

/**
 * Configuration for centralized getAll implementations
 */
export interface GetAllConfig<TRaw, TTransformed = TRaw> {
  /** Service access for making API calls */
  serviceAccess: PaginationServiceAccess;
  
  /** Endpoint function for getting all items (takes optional folderId) */
  getEndpoint: (folderId?: number) => string;
  
  /** Alternative endpoint for folder-specific queries (optional) */
  getByFolderEndpoint?: string;
  
  /** 
   * Optional function to transform raw API items to client format.
   */
  transformFn?: (item: TRaw) => TTransformed;
  
  /** Pagination configuration */
  pagination?: PaginationConfig;
  
  /** Custom parameter processing function */
  processParametersFn?: (options: Record<string, any>, folderId?: number) => Record<string, any>;
  
  /** Keys to exclude from ODATA prefix transformation */
  excludeFromPrefix?: string[];
} 