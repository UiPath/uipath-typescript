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
import { DATA_FABRIC_ENDPOINTS, DATA_FABRIC_TENANT_FOLDER_ID } from '../../../../src/utils/constants/endpoints/data-fabric';
import type { PaginatedResponse } from '../../../../src/utils/pagination/types';
import type { ChoiceSetGetResponse } from '../../../../src/models/data-fabric/choicesets.types';
import { ValidationError, NotFoundError } from '../../../../src/core/errors';

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
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    choiceSetService = new ChoiceSetService(instance);
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

      // Verify transformFn is provided (JSON parsing is now handled automatically by helpers)
      const config = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0] as any;
      expect(config.transformFn).toBeDefined();

      // Test transformFn - transforms a single item from PascalCase to camelCase
      const transformed = config.transformFn(mockRawValue) as ChoiceSetGetResponse;
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

  describe('create', () => {
    it('should post choice-set payload and return created choice set ID', async () => {
      mockApiClient.post.mockResolvedValue(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      const result = await choiceSetService.create('expense_types', {
        displayName: 'Expense Types',
        description: 'Categories of expenses for reimbursement',
      });

      expect(result).toBe(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.CREATE,
        {
          description: 'Categories of expenses for reimbursement',
          displayName: 'Expense Types',
          entityDefinition: {
            name: 'expense_types',
            fields: [],
            folderId: DATA_FABRIC_TENANT_FOLDER_ID,
          },
        },
        {},
      );
    });

    it('should omit displayName from the payload when not provided (API decides default)', async () => {
      mockApiClient.post.mockResolvedValue('new-cs-id');

      await choiceSetService.create('expense_types');

      const call = mockApiClient.post.mock.calls[0][1];
      expect(call).not.toHaveProperty('displayName');
      expect(call.entityDefinition.name).toBe('expense_types');
      expect(call.description).toBeUndefined();
    });

    it('should pass custom folderKey to entityDefinition.folderId', async () => {
      mockApiClient.post.mockResolvedValue(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      await choiceSetService.create('expense_types', {
        folderKey: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      });

      const call = mockApiClient.post.mock.calls[0][1];
      expect(call.entityDefinition.folderId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(choiceSetService.create('expense_types')).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe('updateById', () => {
    it('should PATCH metadata with displayName and description', async () => {
      mockApiClient.patch.mockResolvedValue(true);

      await choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {
        displayName: 'Renamed Choice Set',
        description: 'Updated description',
      });

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE(CHOICESET_TEST_CONSTANTS.CHOICESET_ID),
        {
          displayName: 'Renamed Choice Set',
          description: 'Updated description',
        },
        {},
      );
    });

    it('should omit fields the caller did not provide', async () => {
      mockApiClient.patch.mockResolvedValue(true);

      await choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {
        displayName: 'Only Display Name',
      });

      const call = mockApiClient.patch.mock.calls[0][1];
      expect(call.displayName).toBe('Only Display Name');
      expect(call).not.toHaveProperty('description');
    });

    it('should send only description when displayName is omitted', async () => {
      mockApiClient.patch.mockResolvedValue(true);

      await choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {
        description: 'Only Description',
      });

      const call = mockApiClient.patch.mock.calls[0][1];
      expect(call.description).toBe('Only Description');
      expect(call).not.toHaveProperty('displayName');
    });

    it('should throw ValidationError when neither displayName nor description is provided', async () => {
      await expect(
        choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {}),
      ).rejects.toThrow(ValidationError);
      await expect(
        choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, {}),
      ).rejects.toThrow(/at least one of displayName or description/);

      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.patch.mockRejectedValue(error);

      await expect(
        choiceSetService.updateById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, { displayName: 'x' }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('deleteById', () => {
    it('should POST to the delete endpoint with empty body', async () => {
      mockApiClient.post.mockResolvedValue(true);

      await choiceSetService.deleteById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE(CHOICESET_TEST_CONSTANTS.CHOICESET_ID),
        {},
        {},
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        choiceSetService.deleteById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('insertValueById', () => {
    it('should resolve choice-set name from id then POST to insert endpoint and transform response', async () => {
      // getAll() is used internally to resolve the choice-set name from id
      mockApiClient.get.mockResolvedValue([createMockChoiceSetResponse()]);

      const rawValue = createMockChoiceSetValueResponse();
      mockApiClient.post.mockResolvedValue(rawValue);

      const result = await choiceSetService.insertValueById(
        CHOICESET_TEST_CONSTANTS.CHOICESET_ID,
        'NEW_VAL',
        { displayName: 'New Value' },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.INSERT_BY_NAME(CHOICESET_TEST_CONSTANTS.CHOICESET_NAME),
        { Name: 'NEW_VAL', DisplayName: 'New Value' },
        {},
      );

      expect(result.id).toBe(CHOICESET_TEST_CONSTANTS.VALUE_ID);
      expect(result.name).toBe(CHOICESET_TEST_CONSTANTS.VALUE_NAME);
      expect(result.displayName).toBe(CHOICESET_TEST_CONSTANTS.VALUE_DISPLAY_NAME);
      expect(result.createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);

      // Raw PascalCase fields absent
      expect((result as any).Id).toBeUndefined();
      expect((result as any).Name).toBeUndefined();
      expect((result as any).CreateTime).toBeUndefined();
    });

    it('should omit DisplayName from the body when options.displayName is omitted', async () => {
      mockApiClient.get.mockResolvedValue([createMockChoiceSetResponse()]);
      mockApiClient.post.mockResolvedValue(createMockChoiceSetValueResponse());

      await choiceSetService.insertValueById(
        CHOICESET_TEST_CONSTANTS.CHOICESET_ID,
        'NEW_VAL',
      );

      const body = mockApiClient.post.mock.calls[0][1];
      expect(body.Name).toBe('NEW_VAL');
      expect(body.DisplayName).toBeUndefined();
    });

    it('should throw NotFoundError when the choice-set id is not found', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await expect(
        choiceSetService.insertValueById('does-not-exist', 'X'),
      ).rejects.toThrow(NotFoundError);
      await expect(
        choiceSetService.insertValueById('does-not-exist', 'X'),
      ).rejects.toThrow("Choice set with id 'does-not-exist' not found");
    });

    it('should handle API errors from the insert call', async () => {
      mockApiClient.get.mockResolvedValue([createMockChoiceSetResponse()]);
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        choiceSetService.insertValueById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, 'NEW_VAL'),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateValueById', () => {
    it('should resolve name from id then POST PascalCase DisplayName body and transform response', async () => {
      mockApiClient.get.mockResolvedValue([createMockChoiceSetResponse()]);
      const rawValue = createMockChoiceSetValueResponse({ DisplayName: 'Updated' });
      mockApiClient.post.mockResolvedValue(rawValue);

      const result = await choiceSetService.updateValueById(
        CHOICESET_TEST_CONSTANTS.CHOICESET_ID,
        CHOICESET_TEST_CONSTANTS.VALUE_ID,
        'Updated',
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE_BY_NAME(
          CHOICESET_TEST_CONSTANTS.CHOICESET_NAME,
          CHOICESET_TEST_CONSTANTS.VALUE_ID,
        ),
        { DisplayName: 'Updated' },
        {},
      );

      expect(result.id).toBe(CHOICESET_TEST_CONSTANTS.VALUE_ID);
      expect(result.name).toBe(CHOICESET_TEST_CONSTANTS.VALUE_NAME);
      expect(result.displayName).toBe('Updated');
      expect(result.createdTime).toBe(CHOICESET_TEST_CONSTANTS.CREATED_TIME);

      // Raw PascalCase fields absent
      expect((result as any).Id).toBeUndefined();
      expect((result as any).Name).toBeUndefined();
      expect((result as any).DisplayName).toBeUndefined();
      expect((result as any).CreateTime).toBeUndefined();
      expect((result as any).UpdateTime).toBeUndefined();
    });

    it('should throw NotFoundError when the choice-set id is not found', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await expect(
        choiceSetService.updateValueById('does-not-exist', CHOICESET_TEST_CONSTANTS.VALUE_ID, 'x'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle API errors from the update call', async () => {
      mockApiClient.get.mockResolvedValue([createMockChoiceSetResponse()]);
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        choiceSetService.updateValueById(
          CHOICESET_TEST_CONSTANTS.CHOICESET_ID,
          CHOICESET_TEST_CONSTANTS.VALUE_ID,
          'x',
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('deleteValuesById', () => {
    it('should POST the array of value ids to the value-delete endpoint', async () => {
      mockApiClient.post.mockResolvedValue(true);
      const valueIds = [
        CHOICESET_TEST_CONSTANTS.VALUE_ID,
        `${CHOICESET_TEST_CONSTANTS.VALUE_ID.slice(0, -1)}9`,
      ];

      await choiceSetService.deleteValuesById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, valueIds);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE_BY_ID(CHOICESET_TEST_CONSTANTS.CHOICESET_ID),
        valueIds,
        {},
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        choiceSetService.deleteValuesById(CHOICESET_TEST_CONSTANTS.CHOICESET_ID, [
          CHOICESET_TEST_CONSTANTS.VALUE_ID,
        ]),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
