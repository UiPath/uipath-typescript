/**
 * Simplified universal pagination cursor
 * Used to fetch next/previous pages without knowing the pagination mechanism
 */
export interface PaginationCursor {
  /** Opaque cursor string containing all information needed to fetch next page */
  cursor: string;
}

/**
 * Public pagination options that can be added to any options interface
 * to enable cursor-based pagination
 */
export interface PaginationOptions {
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  
  /** Whether to include the total count of items if available */
  includeTotal?: boolean;
  
  /** Pagination cursor for continuing from a previous page */
  cursor?: PaginationCursor;
}

/**
 * Internal pagination options used by the pagination implementation
 * @internal This interface is for internal use only
 */
export interface InternalPaginationOptions extends PaginationOptions {
  /** Current page number (1-based) - for internal use only */
  pageNumber?: number;
  
  /** Token for continuing pagination - for internal use only */
  continuationToken?: string;
  
  /** Pagination type - for internal use only */
  type?: any; // Will be properly typed in the pagination service
  
  /** Extra parameters to pass through - for internal use only */
  extras?: Record<string, any>;
}

/**
 * Page result containing items and navigation information
 */
export interface PageResult<T> {
  /** The items in the current page */
  items: T[];
  
  /** Total count of items across all pages (if available) */
  totalCount?: number;
  
  /** Whether more pages are available */
  hasNext: boolean;
  
  /** Cursor to fetch the next page (if available) */
  next?: PaginationCursor;
  
  /** Cursor to fetch the previous page (if available) */
  previous?: PaginationCursor;
  
  /** Whether total count is included in this result */
  hasTotalCount: boolean;
} 

/**
 * Pagination types supported by the SDK
 */
export enum PaginationType {
    ODATA = 'odata',
    ENTITY = 'entity',
    TOKEN = 'token'
  } 