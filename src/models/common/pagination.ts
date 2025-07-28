/**
 * Pagination options for offset-based pagination
 */
export interface PaginationOptions {
  start?: number;
  limit?: number;
}

/**
 * State object for tracking pagination status
 */
export interface PaginationState {
  currentPage: number;
  hasMorePages: boolean;
  totalItems: number;
}
