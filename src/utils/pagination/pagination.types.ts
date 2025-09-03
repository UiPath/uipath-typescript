/**
 * Simplified universal pagination cursor
 * Used to fetch next/previous pages
 */
export interface PaginationCursor {
  /** Opaque string containing all information needed to fetch next page */
  value: string;
}

/**
 * Discriminated union for pagination methods - ensures cursor and jumpToPage are mutually exclusive
 */
export type PaginationMethodUnion = 
  | { cursor?: PaginationCursor; jumpToPage?: never }
  | { cursor?: never; jumpToPage?: number }
  | { cursor?: never; jumpToPage?: never };

/**
 * Pagination options. Users cannot specify both cursor and jumpToPage.
 */
export type PaginationOptions = {
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
} & PaginationMethodUnion;

/**
 * Paginated response containing items and navigation information
 */
export interface PaginatedResponse<T> {
  /** The items in the current page */
  items: T[];
  
  /** Total count of items across all pages (if available) */
  totalCount?: number;
  
  /** Whether more pages are available */
  hasNextPage: boolean;
  
  /** Cursor to fetch the next page (if available) */
  nextCursor?: PaginationCursor;
  
  /** Cursor to fetch the previous page (if available) */
  previousCursor?: PaginationCursor;
  
  /** Current page number (1-based, if available) */
  currentPage?: number;
  
  /** Total number of pages (if available) */
  totalPages?: number;
  
  /** Whether this pagination type supports jumping to arbitrary pages */
  supportsPageJump: boolean;
} 

/**
 * Response for non-paginated calls that includes both data and total count
 */
export interface NonPaginatedResponse<T> {
  items: T[];
  totalCount?: number;
}

/**
 * Helper type for defining paginated method overloads
 * Creates a union type of all ways pagination can be triggered
 */
export type HasPaginationOptions<T> = 
  | (T & { pageSize: number })
  | (T & { cursor: PaginationCursor })
  | (T & { jumpToPage: number }); 