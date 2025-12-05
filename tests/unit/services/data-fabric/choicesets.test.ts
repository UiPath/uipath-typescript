// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChoiceSetService } from '../../../../src/services/data-fabric/choicesets';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  createMockChoiceSetResponse,
  createMockChoiceSets
} from '../../../utils/mocks/choicesets';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { CHOICESET_TEST_CONSTANTS } from '../../../utils/constants/choicesets';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!

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
      expect(result[0].createdBy).toBe(CHOICESET_TEST_CONSTANTS.USER_ID);
      expect(result[0].updatedBy).toBe(CHOICESET_TEST_CONSTANTS.USER_ID);
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
});
