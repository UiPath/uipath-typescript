// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { PaginationServiceAccess, PaginationType } from '../../../../src/utils/pagination/internal-types';
import { PaginationCursor, PaginationOptions } from '../../../../src/utils/pagination/types';
import { encodeBase64 } from '../../../../src/utils/encoding/base64';
import { TEST_CONSTANTS, PAGINATION_TEST_CONSTANTS } from '../../../utils/constants';
import {
  createMockOffsetCursorData,
  createMockTokenCursorData,
  createMockEncodedCursor,
  createMockPaginationCursor,
  createMockRawItem,
  createMockTransformedItem,
  mockTransformFunction,
  createMockPaginatedResponse,
  createMockApiResponse,
  createMockPaginationServiceAccess,
  MOCK_RAW_ITEMS,
  MOCK_TRANSFORMED_ITEMS
} from '../../../utils/mocks/pagination';
import { DEFAULT_TOTAL_COUNT_FIELD, DEFAULT_ITEMS_FIELD } from '../../../../src/utils/pagination/constants';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== TEST SUITE =====
describe('PaginationHelpers Unit Tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPaginationParameters', () => {
    it('should return true when cursor is provided', () => {
      const options: PaginationOptions = {
        cursor: { value: PAGINATION_TEST_CONSTANTS.CURSOR_VALUE_TEST }
      };
      expect(PaginationHelpers.hasPaginationParameters(options)).toBe(true);
    });

    it('should return true when pageSize is provided', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };
      expect(PaginationHelpers.hasPaginationParameters(options)).toBe(true);
    });

    it('should return true when jumpToPage is provided', () => {
      const options: PaginationOptions = {
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2
      };
      expect(PaginationHelpers.hasPaginationParameters(options)).toBe(true);
    });

    it('should return true when multiple pagination parameters are provided', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2
      };
      expect(PaginationHelpers.hasPaginationParameters(options)).toBe(true);
    });

    it('should return false when options is empty object', () => {
      expect(PaginationHelpers.hasPaginationParameters({})).toBe(false);
    });

    it('should return false when options is undefined', () => {
      expect(PaginationHelpers.hasPaginationParameters()).toBe(false);
    });
  });

  describe('parseCursor', () => {
    it('should successfully parse a valid cursor with offset pagination', () => {
      const cursorData = createMockOffsetCursorData();
      const encodedCursor = createMockEncodedCursor(cursorData);

      const result = PaginationHelpers.parseCursor(encodedCursor);

      expect(result).toEqual(cursorData);
      expect(result.type).toBe(PaginationType.OFFSET);
      expect(result.pageNumber).toBe(PAGINATION_TEST_CONSTANTS.PAGE_NUMBER);
      expect(result.pageSize).toBe(PAGINATION_TEST_CONSTANTS.PAGE_SIZE);
    });

    it('should successfully parse a valid cursor with token pagination', () => {
      const cursorData = createMockTokenCursorData();
      const encodedCursor = createMockEncodedCursor(cursorData);

      const result = PaginationHelpers.parseCursor(encodedCursor);

      expect(result).toEqual(cursorData);
      expect(result.type).toBe(PaginationType.TOKEN);
      expect(result.continuationToken).toBe(PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN);
      expect(result.pageSize).toBe(PAGINATION_TEST_CONSTANTS.PAGE_SIZE);
    });

    it('should throw error for invalid base64 string', () => {
      const invalidCursor = PAGINATION_TEST_CONSTANTS.CURSOR_VALUE_INVALID_BASE64;

      expect(() => PaginationHelpers.parseCursor(invalidCursor))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_INVALID_CURSOR);
    });

    it('should throw error for valid base64 but invalid JSON', () => {
      const invalidJson = encodeBase64(PAGINATION_TEST_CONSTANTS.CURSOR_VALUE_INVALID_JSON);

      expect(() => PaginationHelpers.parseCursor(invalidJson))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_INVALID_CURSOR);
    });
  });

  describe('validateCursor', () => {
    it('should not throw error when no cursor is provided', () => {
      expect(() => PaginationHelpers.validateCursor({}))
        .not.toThrow();
    });

    it('should not throw error for valid cursor with matching pagination type', () => {
      const cursor = createMockPaginationCursor();
      const options: { cursor: PaginationCursor } = { cursor };

      expect(() => PaginationHelpers.validateCursor(
        options,
        PaginationType.OFFSET,
      )).not.toThrow();
    });

    it('should throw error when cursor is null', () => {
      const options = { cursor: null as any };

      expect(() => PaginationHelpers.validateCursor(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_CURSOR_MUST_BE_VALID);
    });

    it('should throw error when cursor value is undefined', () => {
      const options = { cursor: { value: undefined as any } };

      expect(() => PaginationHelpers.validateCursor(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_CURSOR_MUST_BE_VALID);
    });

    it('should throw error when cursor value is empty string', () => {
      const options: { cursor: PaginationCursor } = { cursor: { value: '' } };

      expect(() => PaginationHelpers.validateCursor(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_CURSOR_MUST_BE_VALID);
    });

    it('should throw error when cursor value is not a string', () => {
      const options = { cursor: { value: 123 as any } };

      expect(() => PaginationHelpers.validateCursor(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_CURSOR_MUST_BE_VALID);
    });

    it('should throw error for invalid cursor format', () => {
      const options: { cursor: PaginationCursor } = {
        cursor: { value: PAGINATION_TEST_CONSTANTS.CURSOR_VALUE_INVALID_BASE64 }
      };

      expect(() => PaginationHelpers.validateCursor(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_INVALID_CURSOR_FORMAT);
    });

    it('should throw error when cursor is missing pagination type but type validation is requested', () => {
      const cursorData = createMockOffsetCursorData({ type: undefined as any });
      const encodedCursor = createMockEncodedCursor(cursorData);
      const options: { cursor: PaginationCursor } = { cursor: { value: encodedCursor } };

      expect(() => PaginationHelpers.validateCursor(
        options,
        PaginationType.OFFSET
      )).toThrow(PAGINATION_TEST_CONSTANTS.ERROR_INVALID_CURSOR_MISSING_TYPE);
    });

    it('should throw error when cursor pagination type does not match expected type', () => {
      const cursor = createMockPaginationCursor(createMockTokenCursorData());
      const options: { cursor: PaginationCursor } = { cursor };

      expect(() => PaginationHelpers.validateCursor(
        options,
        PaginationType.OFFSET
      )).toThrow(PAGINATION_TEST_CONSTANTS.ERROR_PAGINATION_TYPE_MISMATCH);
    });
  });

  describe('validatePaginationOptions', () => {
    it('should successfully validate valid pagination options with pageSize', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.OFFSET
      );

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: 1
      });
    });

    it('should successfully validate valid pagination options with jumpToPage', () => {
      const options: PaginationOptions = {
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.OFFSET
      );

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2
      });
    });

    it('should successfully validate valid pagination options with cursor', () => {
      const cursorData = createMockOffsetCursorData({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });
      const cursor = createMockPaginationCursor(cursorData);
      const options: PaginationOptions = { cursor };

      const result = PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.OFFSET
      );

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER,
        type: PaginationType.OFFSET
      });
    });

    it('should throw error when pageSize is negative', () => {
      const options: PaginationOptions = { pageSize: -10 };

      expect(() => PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.OFFSET
      )).toThrow(PAGINATION_TEST_CONSTANTS.ERROR_PAGE_SIZE_POSITIVE);
    });

    it('should throw error when jumpToPage is negative', () => {
      const options: PaginationOptions = { jumpToPage: -5 };

      expect(() => PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.OFFSET
      )).toThrow(PAGINATION_TEST_CONSTANTS.ERROR_JUMP_TO_PAGE_POSITIVE);
    });

    it('should throw error when jumpToPage is used with token-based pagination', () => {
      const options: PaginationOptions = {
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      expect(() => PaginationHelpers.validatePaginationOptions(
        options,
        PaginationType.TOKEN
      )).toThrow(PAGINATION_TEST_CONSTANTS.ERROR_JUMP_TO_PAGE_NOT_SUPPORTED);
    });
  });

  describe('getRequestParameters', () => {
    it('should return parameters for jumpToPage request', () => {
      const options: PaginationOptions = {
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.getRequestParameters(options);

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2
      });
    });

    it('should return parameters for first page request without pagination type', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.getRequestParameters(options);

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });
    });

    it('should return parameters for first page request with OFFSET pagination', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.getRequestParameters(
        options,
        PaginationType.OFFSET
      );

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER_1
      });
    });

    it('should return parameters for first page request with TOKEN pagination', () => {
      const options: PaginationOptions = {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.getRequestParameters(
        options,
        PaginationType.TOKEN
      );

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        pageNumber: undefined
      });
    });

    it('should return parameters for cursor-based request with OFFSET type', () => {
      const cursorData = createMockOffsetCursorData({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20
      });
      const cursor = createMockPaginationCursor(cursorData);
      const options: PaginationOptions = {
        cursor,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      };

      const result = PaginationHelpers.getRequestParameters(options);

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE_20, // From cursor
        pageNumber: PAGINATION_TEST_CONSTANTS.PAGE_NUMBER,
        type: PaginationType.OFFSET
      });
    });

    it('should return parameters for cursor-based request with TOKEN type', () => {
      const cursorData = createMockTokenCursorData({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });
      const cursor = createMockPaginationCursor(cursorData);
      const options: PaginationOptions = { cursor };

      const result = PaginationHelpers.getRequestParameters(options);

      expect(result).toEqual({
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE,
        continuationToken: PAGINATION_TEST_CONSTANTS.CONTINUATION_TOKEN,
        type: PaginationType.TOKEN
      });
    });

    it('should throw error for invalid cursor', () => {
      const options: PaginationOptions = {
        cursor: { value: PAGINATION_TEST_CONSTANTS.CURSOR_VALUE_INVALID }
      };

      expect(() => PaginationHelpers.getRequestParameters(options))
        .toThrow(PAGINATION_TEST_CONSTANTS.ERROR_INVALID_CURSOR);
    });

    it('should return empty object when no options provided', () => {
      const result = PaginationHelpers.getRequestParameters({});

      expect(result).toEqual({});
    });
  });

  describe('getAllPaginated', () => {
    let mockServiceAccess: PaginationServiceAccess;

    beforeEach(() => {
      mockServiceAccess = createMockPaginationServiceAccess();
    });

    it('should make paginated request and return transformed items', async () => {
      const mockResponse = createMockPaginatedResponse(MOCK_RAW_ITEMS, {
        totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100,
        hasNextPage: true,
        nextCursor: { value: TEST_CONSTANTS.NEXT_CURSOR }
      });

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAllPaginated({
        serviceAccess: mockServiceAccess,
        getEndpoint: () => PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        paginationParams: { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        additionalParams: { filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST },
        transformFn: mockTransformFunction,
        options: {
          paginationType: PaginationType.OFFSET
        }
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalledWith(
        'GET',
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        expect.objectContaining({
          headers: {},
          params: { filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST },
          pagination: expect.objectContaining({
            paginationType: PaginationType.OFFSET,
            itemsField: DEFAULT_ITEMS_FIELD,
            totalCountField: DEFAULT_TOTAL_COUNT_FIELD
          })
        })
      );

      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEMS);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
      expect(result.hasNextPage).toBe(true);
    });

    it('should make paginated request with folder ID and include folder header', async () => {
      const mockResponse = createMockPaginatedResponse([]);

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      await PaginationHelpers.getAllPaginated({
        serviceAccess: mockServiceAccess,
        getEndpoint: (folderId) => `${PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS}/${folderId}`,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        paginationParams: { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        additionalParams: {},
        options: {}
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalledWith(
        'GET',
        `${PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS}/${TEST_CONSTANTS.FOLDER_ID}`,
        { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        expect.objectContaining({
          headers: { [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }
        })
      );
    });

    it('should return items without transformation when no transformFn provided', async () => {
      const mockResponse = createMockPaginatedResponse(MOCK_RAW_ITEMS);

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAllPaginated({
        serviceAccess: mockServiceAccess,
        getEndpoint: () => PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        paginationParams: { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        additionalParams: {},
        options: {}
      });

      expect(result.items).toEqual(MOCK_RAW_ITEMS);
    });

    it('should use custom field names when provided in options', async () => {
      const mockRawItems = [createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1)];
      const mockResponse = createMockPaginatedResponse(mockRawItems, {
        totalCount: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100,
        hasNextPage: false
      });

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAllPaginated({
        serviceAccess: mockServiceAccess,
        getEndpoint: () => PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        paginationParams: { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        additionalParams: {},
        options: {
          itemsField: PAGINATION_TEST_CONSTANTS.FIELD_RESULTS,
          totalCountField: PAGINATION_TEST_CONSTANTS.FIELD_TOTAL,
          continuationTokenField: PAGINATION_TEST_CONSTANTS.FIELD_NEXT_TOKEN
        }
      });

      // Verify custom field names are passed to requestWithPagination
      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalledWith(
        'GET',
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        { pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        expect.objectContaining({
          pagination: expect.objectContaining({
            itemsField: PAGINATION_TEST_CONSTANTS.FIELD_RESULTS,
            totalCountField: PAGINATION_TEST_CONSTANTS.FIELD_TOTAL,
            continuationTokenField: PAGINATION_TEST_CONSTANTS.FIELD_NEXT_TOKEN
          })
        })
      );

      // Verify the result contains the correct items and metadata
      expect(result.items).toEqual(mockRawItems);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
      expect(result.hasNextPage).toBe(false);
    });

    it('should handle cursor-based pagination params', async () => {
      const cursor = createMockPaginationCursor();
      const mockResponse = createMockPaginatedResponse([], { hasNextPage: true });

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      await PaginationHelpers.getAllPaginated({
        serviceAccess: mockServiceAccess,
        getEndpoint: () => PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        paginationParams: { cursor, pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        additionalParams: {},
        options: {}
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalledWith(
        'GET',
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        { cursor, pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE },
        expect.any(Object)
      );
    });
  });

  describe('getAllNonPaginated', () => {
    let mockServiceAccess: PaginationServiceAccess;

    beforeEach(() => {
      mockServiceAccess = createMockPaginationServiceAccess();
    });

    it('should fetch all items without pagination and return transformed items', async () => {
      const apiResponse = createMockApiResponse(
        MOCK_RAW_ITEMS,
        PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
      );

      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const result = await PaginationHelpers.getAllNonPaginated({
        serviceAccess: mockServiceAccess,
        getAllEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        additionalParams: { filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST },
        transformFn: mockTransformFunction,
        options: {}
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        expect.objectContaining({
          params: { filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST },
          headers: {}
        })
      );

      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEMS);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
    });

    it('should use folder endpoint when folderId is provided', async () => {
      const apiResponse = createMockApiResponse(
        [],
        PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_0
      );

      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      await PaginationHelpers.getAllNonPaginated({
        serviceAccess: mockServiceAccess,
        getAllEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        additionalParams: {},
        options: {}
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        expect.objectContaining({
          headers: { [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }
        })
      );
    });

    it('should return items without transformation when no transformFn provided', async () => {
      const apiResponse = createMockApiResponse(
        MOCK_RAW_ITEMS,
        PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
      );

      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const result = await PaginationHelpers.getAllNonPaginated({
        serviceAccess: mockServiceAccess,
        getAllEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        additionalParams: {},
        options: {}
      });

      expect(result.items).toEqual(MOCK_RAW_ITEMS);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
    });

    it('should use custom field names when provided', async () => {
      const SINGLE_RAW_ITEM = [createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1)];
      const customApiResponse = {
        data: {
          [PAGINATION_TEST_CONSTANTS.FIELD_RESULTS]: SINGLE_RAW_ITEM,
          [PAGINATION_TEST_CONSTANTS.FIELD_TOTAL]: PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_1
        }
      };

      vi.mocked(mockServiceAccess.get).mockResolvedValue(customApiResponse);

      const result = await PaginationHelpers.getAllNonPaginated({
        serviceAccess: mockServiceAccess,
        getAllEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        additionalParams: {},
        options: {
          itemsField: PAGINATION_TEST_CONSTANTS.FIELD_RESULTS,
          totalCountField: PAGINATION_TEST_CONSTANTS.FIELD_TOTAL
        }
      });

      expect(result.items).toEqual(SINGLE_RAW_ITEM);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_1);
    });

    it('should handle response with no data property', async () => {
      vi.mocked(mockServiceAccess.get).mockResolvedValue({ data: undefined } as any);

      const result = await PaginationHelpers.getAllNonPaginated({
        serviceAccess: mockServiceAccess,
        getAllEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        additionalParams: {},
        options: {}
      });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBeUndefined();
    });
  });

  describe('getAll', () => {
    let mockServiceAccess: PaginationServiceAccess;
    let mockConfig: any;

    // Common mock items used across multiple tests
    const MOCK_RAW_ITEM = [createMockRawItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1)];
    const MOCK_TRANSFORMED_ITEM = [createMockTransformedItem(PAGINATION_TEST_CONSTANTS.ITEM_ID_1, PAGINATION_TEST_CONSTANTS.ITEM_NAME_1)];

    beforeEach(() => {
      mockServiceAccess = createMockPaginationServiceAccess();

      mockConfig = {
        serviceAccess: mockServiceAccess,
        getEndpoint: (folderId?: number) =>
          folderId ? `${PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS}/${folderId}` : PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        getByFolderEndpoint: PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        transformFn: mockTransformFunction,
        pagination: {
          paginationType: PaginationType.OFFSET,
          itemsField: DEFAULT_ITEMS_FIELD,
          totalCountField: DEFAULT_TOTAL_COUNT_FIELD
        }
      };
    });

    it('should use non-paginated flow when no pagination parameters provided', async () => {
      const apiResponse = createMockApiResponse(
        MOCK_RAW_ITEM,
        PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100
      );

      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const result = await PaginationHelpers.getAll(mockConfig, {});

      expect(mockServiceAccess.get).toHaveBeenCalled();
      expect(mockServiceAccess.requestWithPagination).not.toHaveBeenCalled();
      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEM);
      expect(result.totalCount).toBe(PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
    });

    it('should use paginated flow when pageSize is provided', async () => {
      const mockResponse = createMockPaginatedResponse(MOCK_RAW_ITEM);

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAll(mockConfig, {
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalled();
      expect(mockServiceAccess.get).not.toHaveBeenCalled();
      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEM);
    });

    it('should use paginated flow when cursor is provided', async () => {
      const cursor = createMockPaginationCursor();
      const mockResponse = createMockPaginatedResponse(
        MOCK_RAW_ITEM,
        { hasNextPage: true }
      );

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAll(mockConfig, { cursor });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalled();
      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEM);
    });

    it('should use paginated flow when jumpToPage is provided', async () => {
      const mockResponse = createMockPaginatedResponse(MOCK_RAW_ITEM);

      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      const result = await PaginationHelpers.getAll(mockConfig, {
        jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalled();
      expect(result.items).toEqual(MOCK_TRANSFORMED_ITEM);
    });

    it('should apply ODATA prefix to option keys', async () => {
      const apiResponse = createMockApiResponse([], PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);

      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      await PaginationHelpers.getAll(mockConfig, {
        filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST,
        expand: PAGINATION_TEST_CONSTANTS.EXPAND_RELATIONS
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        expect.objectContaining({
          params: {
            '$filter': PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST,
            '$expand': PAGINATION_TEST_CONSTANTS.EXPAND_RELATIONS
          }
        })
      );
    });

    it('should exclude keys from ODATA prefix when specified', async () => {
      const apiResponse = createMockApiResponse([], PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_0);
      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const configWithExclusions = {
        ...mockConfig,
        excludeFromPrefix: ['customParam']
      };

      await PaginationHelpers.getAll(configWithExclusions, {
        filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST,
        customParam: 'value'
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS,
        expect.objectContaining({
          params: {
            '$filter': PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST,
            'customParam': 'value'
          }
        })
      );
    });

    it('should use custom processParametersFn when provided', async () => {
      const apiResponse = createMockApiResponse([], PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const configWithProcessor = {
        ...mockConfig,
        processParametersFn: (options: any, folderId?: number) => ({
          ...options,
          processed: true,
          folderId
        })
      };

      await PaginationHelpers.getAll(configWithProcessor, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': PAGINATION_TEST_CONSTANTS.FILTER_NAME_EQ_TEST,
            '$processed': true
          })
        })
      );
    });

    it('should handle folderId properly in non-paginated flow', async () => {
      const apiResponse = createMockApiResponse([], PAGINATION_TEST_CONSTANTS.TOTAL_COUNT_100);
      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      await PaginationHelpers.getAll(mockConfig, {
        folderId: TEST_CONSTANTS.FOLDER_ID
      });

      expect(mockServiceAccess.get).toHaveBeenCalledWith(
        PAGINATION_TEST_CONSTANTS.ENDPOINT_API_FOLDERS_ITEMS,
        expect.objectContaining({
          headers: { [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }
        })
      );
    });

    it('should handle folderId properly in paginated flow', async () => {
      const mockResponse = createMockPaginatedResponse([]);
      vi.mocked(mockServiceAccess.requestWithPagination).mockResolvedValue(mockResponse);

      await PaginationHelpers.getAll(mockConfig, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
      });

      expect(mockServiceAccess.requestWithPagination).toHaveBeenCalledWith(
        'GET',
        `${PAGINATION_TEST_CONSTANTS.ENDPOINT_API_ITEMS}/${TEST_CONSTANTS.FOLDER_ID}`,
        expect.objectContaining({
          pageSize: PAGINATION_TEST_CONSTANTS.PAGE_SIZE
        }),
        expect.objectContaining({
          headers: { [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }
        })
      );
    });

    it('should handle options being undefined', async () => {
      const apiResponse = createMockApiResponse([], undefined);
      vi.mocked(mockServiceAccess.get).mockResolvedValue(apiResponse);

      const result = await PaginationHelpers.getAll(mockConfig);

      expect(mockServiceAccess.get).toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });
  });
});
