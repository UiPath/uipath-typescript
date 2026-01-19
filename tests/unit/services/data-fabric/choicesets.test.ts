// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChoiceSetService } from '../../../../src/services/data-fabric/choicesets';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockChoiceSetResponse,
  createMockChoiceSets,
  createMockChoiceSetValueResponse,
  createMockChoiceSetValues
} from '../../../utils/mocks/choicesets';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { CHOICESET_TEST_CONSTANTS } from '../../../utils/constants/choicesets';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import type { PaginatedResponse } from '../../../../src/utils/pagination/types';
import type { ChoiceSetGetResponse } from '../../../../src/models/data-fabric/choicesets.types';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('ChoiceSetService Unit Tests', () => {
  let choiceSetService: ChoiceSetService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    choiceSetService = new ChoiceSetService(config, executionContext, tokenManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all choice sets successfully', async () => {
      const mockResponse = [createMockChoiceSetResponse()];
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await choiceSetService.getAll();

      // Verify the result
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);

      // Verify public fields are exposed
      expect(result[0].name).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_NAME);
      expect(result[0].displayName).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_DISPLAY_NAME);
      expect(result[0].description).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_DESCRIPTION);
      expect(result[0].folderId).toBe(String(TEST_CONSTANTS.FOLDER_ID));
      expect(result[0].createdBy).toBe(String(TEST_CONSTANTS.USER_ID));
      expect(result[0].updatedBy).toBe(String(TEST_CONSTANTS.USER_ID));
      expect(result[0].createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);
      expect(result[0].updatedTime).toBe(CHOICESET_TEST_CONSTANTS.UPDATED_TIME);

      // Verify the API call has correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL,
        {}
      );
    });

    it('should return multiple choice sets', async () => {
      const mockChoiceSets = createMockChoiceSets(3);
      mockApiClient.get.mockResolvedValue(mockChoiceSets);

      const result = await choiceSetService.getAll();

      // Verify the result
      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      // Verify each choice set has the public fields
      result.forEach((choiceSet) => {
        expect(choiceSet).toHaveProperty('name');
        expect(choiceSet).toHaveProperty('displayName');
        expect(choiceSet).toHaveProperty('description');
        expect(choiceSet).toHaveProperty('folderId');
        expect(choiceSet).toHaveProperty('createdBy');
        expect(choiceSet).toHaveProperty('updatedBy');
        expect(choiceSet).toHaveProperty('createdTime');
        expect(choiceSet).toHaveProperty('updatedTime');
      });

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL,
        {}
      );
    });

    it('should apply EntityMap transformations correctly (createTime -> createdTime, updateTime -> updatedTime)', async () => {
      const mockResponse = createMockChoiceSets(2);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await choiceSetService.getAll();

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      result.forEach(choiceSet => {
        // Verify transformed fields are exposed
        expect(choiceSet.createdTime).toBeDefined();
        expect(choiceSet.createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);
        expect(choiceSet.updatedTime).toBeDefined();
        expect(choiceSet.updatedTime).toBe(CHOICESET_TEST_CONSTANTS.UPDATED_TIME);

        // Verify raw fields from API are not exposed
        expect((choiceSet as any).createTime).toBeUndefined();
        expect((choiceSet as any).updateTime).toBeUndefined();
      });
    });

    it('should handle empty results gracefully', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await choiceSetService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(choiceSetService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

  });

  describe('getById', () => {
    it('should get choice set values by ID without pagination options', async () => {
      const mockValues = createMockChoiceSetValues(4);
      const mockResponse = {
        items: mockValues.map((v: any) => ({
          id: v.Id,
          name: v.Name,
          displayName: v.DisplayName,
          numberId: v.NumberId,
          createdTime: v.CreateTime,
          updatedTime: v.UpdateTime,
          createdBy: v.CreatedBy,
          updatedBy: v.UpdatedBy,
          recordOwner: v.RecordOwner
        })),
        totalCount: 4
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await choiceSetService.getById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      // Verify PaginationHelpers.getAll was called with correct config
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          method: 'POST',
          pagination: expect.objectContaining({
            itemsField: 'jsonValue',
            totalCountField: 'totalRecordCount'
          })
        }),
        undefined
      );

      // Verify the endpoint function returns correct URL
      const config = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0];
      expect(config.getEndpoint()).toBe(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_BY_ID(CHOICESET_TEST_CONSTANTS.CHOICESET_ID)
      );

      // Verify result structure
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(4);
      expect(result.totalCount).toBe(4);
    });

    it('should transform PascalCase API response to camelCase', async () => {
      const mockRawValue = createMockChoiceSetValueResponse();
      const mockResponse = {
        items: [{
          id: mockRawValue.Id,
          name: mockRawValue.Name,
          displayName: mockRawValue.DisplayName,
          numberId: mockRawValue.NumberId,
          createdTime: mockRawValue.CreateTime,
          updatedTime: mockRawValue.UpdateTime,
          createdBy: mockRawValue.CreatedBy,
          updatedBy: mockRawValue.UpdatedBy,
          recordOwner: mockRawValue.RecordOwner
        }],
        totalCount: 1
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await choiceSetService.getById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      // Verify transformFn is provided (it includes JSON parsing and transformation)
      const config = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0] as any;
      expect(config.transformFn).toBeDefined();

      // Test the transformFn function directly - it parses JSON and transforms items
      // Pass a JSON string array to simulate the raw API response
      const rawJsonString = JSON.stringify([mockRawValue]);
      const transformedItems = config.transformFn(rawJsonString) as ChoiceSetGetResponse[];

      expect(transformedItems).toHaveLength(1);
      const transformed = transformedItems[0];
      expect(transformed.id).toBe(CHOICESET_TEST_CONSTANTS.VALUE_ID);
      expect(transformed.name).toBe(CHOICESET_TEST_CONSTANTS.VALUE_NAME);
      expect(transformed.displayName).toBe(CHOICESET_TEST_CONSTANTS.VALUE_DISPLAY_NAME);
      expect(transformed.numberId).toBe(CHOICESET_TEST_CONSTANTS.VALUE_NUMBER_ID);
      expect(transformed.createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);
      expect(transformed.updatedTime).toBe(CHOICESET_TEST_CONSTANTS.UPDATED_TIME);
      expect(transformed.createdBy).toBe(String(TEST_CONSTANTS.USER_ID));
      expect(transformed.updatedBy).toBe(String(TEST_CONSTANTS.USER_ID));
      expect(transformed.recordOwner).toBe(String(TEST_CONSTANTS.USER_ID));

      // Verify raw PascalCase fields are not present
      expect((transformed as any).Id).toBeUndefined();
      expect((transformed as any).Name).toBeUndefined();
      expect((transformed as any).CreateTime).toBeUndefined();
      expect((transformed as any).UpdateTime).toBeUndefined();
    });

    it('should return paginated response when pagination options provided', async () => {
      const mockValues = createMockChoiceSetValues(2);
      const mockResponse: PaginatedResponse<ChoiceSetGetResponse> = {
        items: mockValues.map((v: any) => ({
          id: v.Id,
          name: v.Name,
          displayName: v.DisplayName,
          numberId: v.NumberId,
          createdTime: v.CreateTime,
          updatedTime: v.UpdateTime,
          createdBy: v.CreatedBy,
          updatedBy: v.UpdatedBy,
          recordOwner: v.RecordOwner
        })),
        totalCount: 10,
        hasNextPage: true,
        nextCursor: { value: TEST_CONSTANTS.NEXT_CURSOR },
        previousCursor: undefined,
        currentPage: 1,
        totalPages: 5,
        supportsPageJump: true
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await choiceSetService.getById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {
        pageSize: 2
      }) as PaginatedResponse<ChoiceSetGetResponse>;

      // Verify pagination options were passed
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: 2
        })
      );

      // Verify paginated response structure
      expect(result.items.length).toBe(2);
      expect(result.totalCount).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toEqual({ value: TEST_CONSTANTS.NEXT_CURSOR });
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(
        choiceSetService.getById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should handle empty results gracefully', async () => {
      const mockResponse = {
        items: [],
        totalCount: 0
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await choiceSetService.getById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });
});
