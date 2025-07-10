/**
 * State object for tracking pagination status
 */
export interface PaginationState {
  currentPage: number;
  hasMorePages: boolean;
  totalItems: number;
}
