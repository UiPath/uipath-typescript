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
    it('should get all choice sets successfully with all fields mapped correctly', async () => {
      const mockResponse = [createMockChoiceSetResponse()];
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await choiceSetService.getAll();

      // Verify the result
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);
      expect(result[0].name).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_NAME);
      expect(result[0].displayName).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_DISPLAY_NAME);
      expect(result[0].entityType).toBe('ChoiceSet');

      // Verify the API call has correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESET.GET_ALL,
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

      // Verify each choice set has required fields
      result.forEach((choiceSet) => {
        expect(choiceSet).toHaveProperty('id');
        expect(choiceSet).toHaveProperty('name');
        expect(choiceSet).toHaveProperty('displayName');
        expect(choiceSet).toHaveProperty('entityType');
        expect(choiceSet.entityType).toBe('ChoiceSet');
      });

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESET.GET_ALL,
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
        // Verify field transformations
        // createTime -> createdTime
        expect(choiceSet.createdTime).toBeDefined();
        expect(choiceSet.createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);
        expect((choiceSet as any).createTime).toBeUndefined(); // Raw field should not exist

        // updateTime -> updatedTime
        expect(choiceSet.updatedTime).toBeDefined();
        expect(choiceSet.updatedTime).toBe(CHOICESET_TEST_CONSTANTS.UPDATED_TIME);
        expect((choiceSet as any).updateTime).toBeUndefined(); // Raw field should not exist
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

    it('should preserve all choice set properties after transformation', async () => {
      const mockResponse = [createMockChoiceSetResponse()];
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await choiceSetService.getAll();

      expect(result).toBeDefined();
      expect(result.length).toBe(1);

      const choiceSet = result[0];

      // Verify all properties are preserved
      expect(choiceSet.name).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_NAME);
      expect(choiceSet.displayName).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_DISPLAY_NAME);
      expect(choiceSet.entityTypeId).toBe(1);
      expect(choiceSet.entityType).toBe('ChoiceSet');
      expect(choiceSet.description).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_DESCRIPTION);
      expect(choiceSet.folderId).toBe(CHOICESET_TEST_CONSTANTS.FOLDER_ID);
      expect(choiceSet.recordCount).toBe(4);
      expect(choiceSet.storageSizeInMB).toBe(0.210937);
      expect(choiceSet.usedStorageSizeInMB).toBe(0.046875);
      expect(choiceSet.isRbacEnabled).toBe(false);
      expect(Array.isArray(choiceSet.invalidIdentifiers)).toBe(true);
      expect(choiceSet.isModelReserved).toBe(false);
      expect(choiceSet.id).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);
      expect(choiceSet.createdBy).toBe(CHOICESET_TEST_CONSTANTS.USER_ID);
      expect(choiceSet.updatedBy).toBe(CHOICESET_TEST_CONSTANTS.USER_ID);

      // Verify field transformations
      // CreatedTime and UpdatedTime should be transformed, not the original fields
      expect((choiceSet as any).createTime).toBeUndefined(); // Original field should be removed
      expect((choiceSet as any).updateTime).toBeUndefined(); // Original field should be removed
    });
  });
});
