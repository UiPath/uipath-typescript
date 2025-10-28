// ===== IMPORTS =====
import { describe, it, expect } from 'vitest';
import { PaginationManager } from '../../../../src/utils/pagination/pagination-manager';
import { PaginationType, PaginationInfo } from '../../../../src/utils/pagination/internal-types';
import { PAGINATION_TEST_CONSTANTS } from '../../../utils/constants';
import {
  createMockRawItem
} from '../../../utils/mocks/pagination';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';

// ===== TEST SUITE =====
describe('PaginationManager Unit Tests', () => {
  describe('createCursor', () => {
    describe('OFFSET pagination', () => {
      it('should create cursor for next page when hasMore is true', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.OFFSET
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeDefined();
        expect(cursor?.value).toBeDefined();

        // Parse the cursor to verify its contents
        const parsedCursor = PaginationHelpers.parseCursor(cursor!.value);
        expect(parsedCursor.type).toBe(PaginationType.OFFSET);
        expect(parsedCursor.pageNumber).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER); // currentPage + 1
        expect(parsedCursor.pageSize).toBe(PAGINATION_TEST_CONSTANTS.PAGE_SIZE);
      });

      it('should return undefined when hasMore is false', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.OFFSET
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeUndefined();
      });

      it('should create cursor without pageNumber when currentPage is not provided', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.OFFSET
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeDefined();
        const parsedCursor = PaginationHelpers.parseCursor(cursor!.value);
        expect(parsedCursor.pageNumber).toBeUndefined();
        expect(parsedCursor.pageSize).toBe(PAGINATION_TEST_CONSTANTS.PAGE_SIZE);
      });
    });

    describe('TOKEN pagination', () => {
      it('should create cursor with continuation token when hasMore is true', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            continuationToken: PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.TOKEN
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeDefined();
        const parsedCursor = PaginationHelpers.parseCursor(cursor!.value);
        expect(parsedCursor.type).toBe(PaginationType.TOKEN);
        expect(parsedCursor.continuationToken).toBe(PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN);
        expect(parsedCursor.pageSize).toBe(PAGINATION_TEST_CONSTANTS.PAGE_SIZE);
      });

      it('should return undefined when hasMore is false', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            continuationToken: PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.TOKEN
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeUndefined();
      });

      it('should return undefined when continuationToken is missing despite hasMore being true', () => {
        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.TOKEN
        };

        const cursor = PaginationManager.createCursor(paginationInfo);

        expect(cursor).toBeUndefined();
      });
    });
  });

  describe('createPaginatedResponse', () => {
    describe('OFFSET pagination', () => {
      // Mock items - creates an array of 10 items
      const MOCK_PAGE_ITEMS = Array.from({ length: PAGINATION_TEST_CONSTANTS.PAGE_SIZE }, (_, i) =>
        createMockRawItem(i + 1, `Item${i + 1}`)
      );
      const MOCK_SINGLE_ITEM = [createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1)];

      it('should create paginated response with all fields for middle page', () => {
        const items = MOCK_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
        expect(response.hasNextPage).toBe(true);
        expect(response.currentPage).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER);
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_PAGES);
        expect(response.supportsPageJump).toBe(true);
        expect(response.nextCursor).toBeDefined();
        expect(response.previousCursor).toBeDefined();

        // Verify next cursor points to page 3
        const nextCursor = PaginationHelpers.parseCursor(response.nextCursor!.value);
        expect(nextCursor.pageNumber).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_3);

        // Verify previous cursor points to page 1
        const prevCursor = PaginationHelpers.parseCursor(response.previousCursor!.value);
        expect(prevCursor.pageNumber).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1);
      });

      it('should create paginated response for first page', () => {
        const items = MOCK_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.currentPage).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1);
        expect(response.hasNextPage).toBe(true);
        expect(response.nextCursor).toBeDefined();
        expect(response.previousCursor).toBeUndefined(); // No previous page
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_PAGES); // 100 / 10 = 10
      });

      it('should create paginated response for last page', () => {
        const items = MOCK_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            currentPage: PAGINATION_TEST_CONSTANTS.TOTAL_PAGES,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type:  PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.hasNextPage).toBe(false);
        expect(response.nextCursor).toBeUndefined(); // No next page
        expect(response.previousCursor).toBeDefined(); // Has previous page
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_PAGES);
      });

      it('should handle single page result', () => {
        const items = MOCK_SINGLE_ITEM;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_1
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.hasNextPage).toBe(false);
        expect(response.nextCursor).toBeUndefined();
        expect(response.previousCursor).toBeUndefined();
        expect(response.currentPage).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1);
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_PAGES_1);
      });

      it('should calculate total pages with remainder', () => {
        // Create 15 items to match the page size
        const items = Array.from({ length: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_15 }, (_, i) =>
          createMockRawItem(i + 1, `Item${i + 1}`)
        );

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_15,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toHaveLength(PAGINATION_TEST_CONSTANTS.PAGE_SIZE_15);
        expect(response.totalPages).toBe(7); // ceil(100 / 15) = 7
      });

      it('should not include totalPages when totalCount is undefined', () => {
        const items = MOCK_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.totalPages).toBeUndefined();
        expect(response.totalCount).toBeUndefined();
      });

      it('should not include totalPages when pageSize is undefined', () => {
        const items = MOCK_SINGLE_ITEM;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.totalPages).toBeUndefined();
      });

      it('should handle empty results (no data matched query)', () => {
        const items: any[] = [];

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            currentPage: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_0
          },
          type: PaginationType.OFFSET
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual([]);
        expect(response.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_0);
        expect(response.hasNextPage).toBe(false);
        expect(response.nextCursor).toBeUndefined();
        expect(response.previousCursor).toBeUndefined();
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_0);
        expect(response.currentPage).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1);
      });
    });

    describe('TOKEN pagination', () => {
      // Mock items for token pagination - creates 20 items
      const MOCK_TOKEN_PAGE_ITEMS = Array.from({ length: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20 }, (_, i) =>
        createMockRawItem(i + 1, `Item${i + 1}`)
      );

      it('should create paginated response with token pagination', () => {
        const items = MOCK_TOKEN_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            continuationToken: PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.TOKEN
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        expect(response.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
        expect(response.hasNextPage).toBe(true);
        expect(response.supportsPageJump).toBe(false); // Token-based doesn't support jumping
        expect(response.nextCursor).toBeDefined();
        expect(response.previousCursor).toBeUndefined(); // Token-based doesn't support previous
        expect(response.currentPage).toBeUndefined(); // Token-based doesn't track page numbers
        expect(response.totalPages).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_PAGES_5); // 100 / 20 = 5

        // Verify next cursor contains continuation token
        const nextCursor = PaginationHelpers.parseCursor(response.nextCursor!.value);
        expect(nextCursor.continuationToken).toBe(PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN);
      });

      it('should create response without next cursor when hasMore is false', () => {
        const items = MOCK_TOKEN_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: false,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20,
            totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
          },
          type: PaginationType.TOKEN
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toHaveLength(PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20);
        expect(response.hasNextPage).toBe(false);
        expect(response.nextCursor).toBeUndefined();
        expect(response.supportsPageJump).toBe(false);
      });

      it('should create response without next cursor when continuation token is missing', () => {
        const items = MOCK_TOKEN_PAGE_ITEMS;

        const paginationInfo: PaginationInfo = {
          pageInfo: {
            hasMore: true,
            pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20
          },
          type: PaginationType.TOKEN
        };

        const response = PaginationManager.createPaginatedResponse(paginationInfo, items);

        expect(response.items).toEqual(items);
        // Should not have next cursor since continuation token is missing
        expect(response.nextCursor).toBeUndefined();
      });
    });
  });
});
