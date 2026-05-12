// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/agents/feedback/feedback';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { FEEDBACK_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { TEST_CONSTANTS, FEEDBACK_TEST_CONSTANTS, CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '../../../utils/constants';
import { createMockFeedback, createMockRawFeedbackCategory, createMockRawCategoryListResponse } from '../../../utils/mocks/feedback';
import { FeedbackSubmitOptions, FeedbackUpdateOptions } from '../../../../src/models/agents/feedback/feedback.types';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('FeedbackService Unit Tests', () => {
  let feedbackService: FeedbackService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    feedbackService = new FeedbackService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all feedback successfully', async () => {
      const mockResponse = [
        createMockFeedback(),
        createMockFeedback({ id: FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID_2, isPositive: false, comment: undefined }),
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        expect.objectContaining({ params: expect.objectContaining({}) })
      );
    });

    it('should get all feedback with filters', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await feedbackService.getAll({ agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        expect.objectContaining({ params: expect.objectContaining({ agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID }) })
      );
    });

    it('should transform createdAt and updatedAt to createdTime and updatedTime', async () => {
      mockApiClient.get.mockResolvedValue([createMockFeedback()]);

      const result = await feedbackService.getAll();
      const item = result.items[0];

      expect(item.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(item.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((item as any).createdAt).toBeUndefined();
      expect((item as any).updatedAt).toBeUndefined();
    });

    it('should throw error when API call fails', async () => {
      const error = new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(feedbackService.getAll()).rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });

    it('should get paginated feedback', async () => {
      const mockResponse = [createMockFeedback({ feedbackCategories: [] })];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        expect.objectContaining({ params: expect.objectContaining({ take: TEST_CONSTANTS.PAGE_SIZE }) })
      );
    });
  });

  describe('getById', () => {
    it('should get feedback by ID successfully', async () => {
      const mockResponse = createMockFeedback();
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY });

      expect(result).toBeDefined();
      expect(result.id).toBe(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_BY_ID(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID),
        expect.any(Object)
      );
    });

    it('should transform createdAt and updatedAt to createdTime and updatedTime', async () => {
      mockApiClient.get.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.getById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY });

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(feedbackService.getById('', { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY })).rejects.toThrow('Feedback ID is required');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.getById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: '' })).rejects.toThrow('folderKey is required');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw error when feedback not found', async () => {
      const error = new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(feedbackService.getById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY })).rejects.toThrow(
        FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND
      );
    });
  });

  describe('submit', () => {
    const submitOptions: FeedbackSubmitOptions = {
      spanId: FEEDBACK_TEST_CONSTANTS.SPAN_ID,
      comment: 'Great response!',
      folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY,
    };

    it('should submit feedback successfully', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.submit(FEEDBACK_TEST_CONSTANTS.TRACE_ID, true, submitOptions);

      expect(result).toBeDefined();
      expect(result.id).toBe(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.SUBMIT,
        expect.objectContaining({ traceId: FEEDBACK_TEST_CONSTANTS.TRACE_ID, isPositive: true }),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }) })
      );
      expect(mockApiClient.post.mock.calls[0][1]).not.toHaveProperty('folderKey');
    });

    it('should transform createdAt and updatedAt to createdTime and updatedTime', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.submit(FEEDBACK_TEST_CONSTANTS.TRACE_ID, true, submitOptions);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(feedbackService.submit('', true, submitOptions))
        .rejects.toThrow('traceId is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.submit(FEEDBACK_TEST_CONSTANTS.TRACE_ID, true, { ...submitOptions, folderKey: '' }))
        .rejects.toThrow('folderKey is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw error when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.submit(FEEDBACK_TEST_CONSTANTS.TRACE_ID, true, submitOptions))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });
  });

  describe('updateById', () => {
    const updateOptions: FeedbackUpdateOptions = {
      comment: 'On reflection, not great.',
      folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY,
    };

    it('should update feedback successfully', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback({ isPositive: false, comment: 'On reflection, not great.' }));

      const result = await feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, false, updateOptions);

      expect(result).toBeDefined();
      expect(result.id).toBe(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.UPDATE(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID),
        expect.objectContaining({ isPositive: false }),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }) })
      );
      expect(mockApiClient.post.mock.calls[0][1]).not.toHaveProperty('folderKey');
    });

    it('should transform createdAt and updatedAt to createdTime and updatedTime', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, false, updateOptions);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(feedbackService.updateById('', false, updateOptions))
        .rejects.toThrow('Feedback ID is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, false, { ...updateOptions, folderKey: '' }))
        .rejects.toThrow('folderKey is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw error when feedback not found', async () => {
      mockApiClient.post.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, false, updateOptions))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });
  });

  describe('deleteById', () => {
    it('should delete feedback successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await feedbackService.deleteById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY });

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.DELETE(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }) })
      );
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(feedbackService.deleteById('', { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }))
        .rejects.toThrow('Feedback ID is required');
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.deleteById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: '' }))
        .rejects.toThrow('folderKey is required');
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw error when feedback not found', async () => {
      mockApiClient.delete.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.deleteById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });
  });

  describe('createCategory', () => {
    it('should create a category with no options — only category name sent in body', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawFeedbackCategory({
        category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM,
        isDefault: false,
      }));

      const result = await feedbackService.createCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM);

      expect(result).toBeDefined();
      expect(result.category).toBe(FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.CREATE,
        { category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM },
        expect.any(Object)
      );
    });

    it('should create a category with explicit isPositive and isNegative', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawFeedbackCategory({
        category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM,
        isDefault: false,
        isPositive: false,
        isNegative: true,
      }));

      const result = await feedbackService.createCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM, {
        isPositive: false,
        isNegative: true,
      });

      expect(result).toBeDefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.CREATE,
        expect.objectContaining({
          category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM,
          isPositive: false,
          isNegative: true,
        }),
        expect.any(Object)
      );
    });

    it('should transform createdAt to createdTime', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawFeedbackCategory());

      const result = await feedbackService.createCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result as any).createdAt).toBeUndefined();
    });

    it('should throw ValidationError when category name is empty', async () => {
      await expect(feedbackService.createCategory('')).rejects.toThrow('category name is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw error when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_CATEGORY_NOT_FOUND));

      await expect(feedbackService.createCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME_CUSTOM))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_CATEGORY_NOT_FOUND);
    });
  });

  describe('getCategories', () => {
    it('should get all categories successfully', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCategoryListResponse());

      const result = await feedbackService.getCategories();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.GET_ALL,
        expect.any(Object)
      );
    });

    it('should transform createdAt to createdTime on each category', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCategoryListResponse());

      const result = await feedbackService.getCategories();

      expect(result.items[0].createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result.items[0] as any).createdAt).toBeUndefined();
    });

    it('should return empty items when no categories exist', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCategoryListResponse({ categories: [], totalCount: 0 }));

      const result = await feedbackService.getCategories();

      expect(result.items).toEqual([]);
    });

    it('should get paginated categories', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCategoryListResponse());

      const result = await feedbackService.getCategories({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(result.items).toBeDefined();
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.GET_ALL,
        expect.objectContaining({ params: expect.objectContaining({ take: TEST_CONSTANTS.PAGE_SIZE }) })
      );
    });

    it('should throw error when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.getCategories()).rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await feedbackService.deleteCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_ID);

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.DELETE(FEEDBACK_TEST_CONSTANTS.CATEGORY_ID),
        expect.objectContaining({ params: undefined })
      );
    });

    it('should pass forceDelete param when provided', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await feedbackService.deleteCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_ID, { forceDelete: true });

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CATEGORY.DELETE(FEEDBACK_TEST_CONSTANTS.CATEGORY_ID),
        expect.objectContaining({ params: { forceDelete: true } })
      );
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(feedbackService.deleteCategory('')).rejects.toThrow('Category ID is required');
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw error when category not found', async () => {
      mockApiClient.delete.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_CATEGORY_NOT_FOUND));

      await expect(feedbackService.deleteCategory(FEEDBACK_TEST_CONSTANTS.CATEGORY_ID))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_CATEGORY_NOT_FOUND);
    });
  });
});
