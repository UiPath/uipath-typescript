/**
 * Pagination mock utilities - Mocks for pagination testing
 */
import { vi } from 'vitest';
import {
  PaginationType,
  CursorData,
  PaginationServiceAccess
} from '../../../src/utils/pagination/internal-types';
import {
  PaginatedResponse,
  PaginationCursor
} from '../../../src/utils/pagination/types';
import { encodeBase64 } from '../../../src/utils/encoding/base64';
import { PAGINATION_TEST_CONSTANTS } from '../constants/pagination';
import { DEFAULT_ITEMS_FIELD, DEFAULT_TOTAL_COUNT_FIELD } from '../../../src/utils/pagination/constants';

/**
 * Creates a mock CursorData object for offset-based pagination
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Mock CursorData object
 *
 * @example
 * ```typescript
 * const cursorData = createMockOffsetCursorData({ pageNumber: 3, pageSize: 20 });
 * ```
 */
export const createMockOffsetCursorData = (
  overrides?: Partial<CursorData>
): CursorData => {
  return {
    type: PaginationType.OFFSET,
    pageNumber: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER,
    pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
    ...overrides,
  };
};

/**
 * Creates a mock CursorData object for token-based pagination
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Mock CursorData object
 *
 * @example
 * ```typescript
 * const cursorData = createMockTokenCursorData({ continuationToken: 'custom-token' });
 * ```
 */
export const createMockTokenCursorData = (
  overrides?: Partial<CursorData>
): CursorData => {
  return {
    type: PaginationType.TOKEN,
    continuationToken: PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN,
    pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
    ...overrides,
  };
};

/**
 * Creates an encoded cursor string from cursor data
 *
 * @param cursorData - Cursor data to encode
 * @returns Encoded cursor string
 *
 * @example
 * ```typescript
 * const cursorData = createMockOffsetCursorData();
 * const encodedCursor = createMockEncodedCursor(cursorData);
 * ```
 */
export const createMockEncodedCursor = (cursorData: CursorData): string => {
  return encodeBase64(JSON.stringify(cursorData));
};

/**
 * Creates a mock PaginationCursor object
 *
 * @param cursorData - Cursor data to encode, or use default offset cursor
 * @returns Mock PaginationCursor object
 *
 * @example
 * ```typescript
 * const cursor = createMockPaginationCursor();
 * const customCursor = createMockPaginationCursor({ type: PaginationType.TOKEN, continuationToken: 'abc' });
 * ```
 */
export const createMockPaginationCursor = (
  cursorData?: CursorData
): PaginationCursor => {
  const data = cursorData || createMockOffsetCursorData();
  return {
    value: createMockEncodedCursor(data)
  };
};

/**
 * Creates a mock raw item for testing transformations
 *
 * @param id - Item ID
 * @param name - Item name
 * @returns Mock raw item with PascalCase properties
 *
 * @example
 * ```typescript
 * const rawItem = createMockRawItem(1, 'Item1');
 * ```
 */
export const createMockRawItem = (id: number, name: string) => ({
  Id: id,
  Name: name
});

/**
 * Creates a mock transformed item
 *
 * @param id - Item ID
 * @param name - Item name
 * @returns Mock transformed item with camelCase properties
 *
 * @example
 * ```typescript
 * const transformedItem = createMockTransformedItem(1, 'Item1');
 * ```
 */
export const createMockTransformedItem = (id: number, name: string) => ({
  id,
  name
});

/**
 * Default transform function for tests
 *
 * @param item - Raw item with PascalCase properties
 * @returns Transformed item with camelCase properties
 */
export const mockTransformFunction = (item: any) => ({
  id: item.Id,
  name: item.Name
});

/**
 * Creates a mock paginated response
 *
 * @param items - Array of items to include in the response
 * @param overrides - Optional overrides for pagination metadata
 * @returns Mock PaginatedResponse
 *
 * @example
 * ```typescript
 * const response = createMockPaginatedResponse(
 *   [{ id: 1, name: 'Item1' }],
 *   { hasNextPage: true, totalCount: 100 }
 * );
 * ```
 */
export const createMockPaginatedResponse = <T>(
  items: T[],
  overrides?: Partial<PaginatedResponse<T>>
): PaginatedResponse<T> => {
  return {
    items,
    hasNextPage: false,
    supportsPageJump: true,
    totalCount: undefined,
    nextCursor: undefined,
    previousCursor: undefined,
    currentPage: undefined,
    totalPages: undefined,
    ...overrides,
  };
};

/**
 * Creates a mock API response with value and @odata.count fields
 *
 * @param items - Array of items
 * @param totalCount - Total count
 * @returns Mock API response object
 *
 * @example
 * ```typescript
 * const apiResponse = createMockApiResponse([{ Id: 1 }], 10);
 * ```
 */
export const createMockApiResponse = (items: any[], totalCount?: number) => ({
  data: {
    [DEFAULT_ITEMS_FIELD]: items,
    [DEFAULT_TOTAL_COUNT_FIELD]: totalCount
  }
});

/**
 * Creates a mock PaginationServiceAccess object for testing
 *
 * @returns Mock PaginationServiceAccess with spy functions
 *
 * @example
 * ```typescript
 * const mockServiceAccess = createMockPaginationServiceAccess();
 * mockServiceAccess.get.mockResolvedValue({ data: { value: [] } });
 * ```
 */
export const createMockPaginationServiceAccess = (): PaginationServiceAccess => {
  return {
    get: vi.fn(),
    requestWithPagination: vi.fn()
  };
};

/**
 * Mock items for testing - raw format
 */
export const MOCK_RAW_ITEMS = [
  createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1),
  createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_2, PAGINATION_TEST_CONSTANTS.ITEM_NAME_2),
];

/**
 * Mock items for testing - transformed format
 */
export const MOCK_TRANSFORMED_ITEMS = [
  createMockTransformedItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1),
  createMockTransformedItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_2, PAGINATION_TEST_CONSTANTS.ITEM_NAME_2),
];
