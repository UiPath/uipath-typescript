import { PaginationOptions, PaginatedResponse, PaginationMethodUnion } from './types';
import { RequestSpec } from '../../models/common/request-spec';
import { HTTP_METHODS } from '../constants/common';
import { FieldMapping } from '../transform';

/**
 * Type for HTTP methods derived from HTTP_METHODS constant
 */
export type HttpMethodType = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];

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
  OFFSET = 'offset',
  TOKEN = 'token'
}

/**
 * Interface for service access methods needed by pagination helpers
 */
export interface PaginationServiceAccess {
  get<T>(path: string, options?: any): Promise<{ data: T }>;
  post<T>(path: string, body?: any, options?: any): Promise<{ data: T }>;
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
  /** Pre-resolved request headers. Overrides the helper's auto-built folder header from `folderId`. */
  headers?: Record<string, string>;
  paginationParams: PaginationOptions;
  additionalParams: Record<string, any>;
  /** URL query params kept in the URL regardless of HTTP method. */
  queryParams?: Record<string, string | number | boolean>;
  /**
   * Optional function to transform API response items.
   */
  transformFn?: (item: T) => R;
  /** HTTP method to use for the request (default: 'GET') */
  method?: HttpMethodType;
  options?: {
    paginationType?: PaginationType;
    itemsField?: string;
    totalCountField?: string;
    continuationTokenField?: string;
    paginationParams?: {
      pageSizeParam?: string;
      offsetParam?: string;
      tokenParam?: string;
      countParam?: string;
      convertToSkip?: boolean;
      zeroBased?: boolean;
    };
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
  /** Pre-resolved request headers. Overrides the helper's auto-built folder header from `folderId`. */
  headers?: Record<string, string>;
  additionalParams: Record<string, any>;
  /** URL query params kept in the URL regardless of HTTP method. */
  queryParams?: Record<string, string | number | boolean>;
  /**
   * Optional function to transform API response items.
   */
  transformFn?: (item: T) => R;
  /** HTTP method to use for the request (default: 'GET') */
  method?: HttpMethodType;
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
    paginationParams?: {
      pageSizeParam?: string;
      offsetParam?: string;
      tokenParam?: string;
      countParam?: string;
      convertToSkip?: boolean;
      zeroBased?: boolean;
    };
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
  
  /** Parameter names for different pagination types */
  paginationParams?: {
    /** Parameter name for page size */
    pageSizeParam?: string;
    /** Parameter name for page offset/skip */
    offsetParam?: string;
    /** Parameter name for continuation token (TOKEN type only) */
    tokenParam?: string;
    /** Parameter name for count inclusion (ODATA type only) */
    countParam?: string;
    /** When true (default), converts pageNumber to a skip count: (pageNumber - 1) * pageSize.
     *  When false, sends the pageNumber directly as the offset param value.
     *  Only applies to OFFSET pagination type. */
    convertToSkip?: boolean;
    /** When true, sends `pageNumber - 1` as the offset param (for 0-based APIs).
     *  Default false (1-based). Only applies when `convertToSkip` is false. */
    zeroBased?: boolean;
  };
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

  /**
   * Optional response field map (API → SDK) used to rewrite SDK field names
   * back to API field names inside OData `filter`, `orderby`, `select`, and
   * `expand` string values before the request is sent. Enables consumers to
   * reference renamed fields by their SDK name end-to-end.
   */
  fieldMap?: FieldMapping;

  /**
   * Pre-built URL query parameters that always travel in the URL query string,
   * regardless of HTTP method. Use `createParams({ ... })` to build this.
   * Typical use: response-shape modifiers on POST endpoints (e.g. `expansionLevel`).
   */
  queryParams?: Record<string, string | number | boolean>;

  /** HTTP method to use for the request (default: 'GET') */
  method?: HttpMethodType;

  /** Pre-resolved request headers. Overrides the helper's auto-built folder header from `folderId`. */
  headers?: Record<string, string>;
}