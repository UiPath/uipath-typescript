// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/agents/feedback/feedback';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { FEEDBACK_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { TEST_CONSTANTS, FEEDBACK_TEST_CONSTANTS, CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '../../../utils/constants';
import { createMockFeedback } from '../../../utils/mocks/feedback';
import { FeedbackCreateOptions, FeedbackUpdateOptions } from '../../../../src/models/agents/feedback/feedback.types';

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
    const createOptions: FeedbackCreateOptions = {
      traceId: FEEDBACK_TEST_CONSTANTS.TRACE_ID,
      spanId: FEEDBACK_TEST_CONSTANTS.SPAN_ID,
      isPositive: true,
      comment: 'Great response!',
      folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY,
    };

    it('should create feedback successfully', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.submit(createOptions);

      expect(result).toBeDefined();
      expect(result.id).toBe(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.SUBMIT,
        expect.objectContaining({ traceId: FEEDBACK_TEST_CONSTANTS.TRACE_ID }),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': FEEDBACK_TEST_CONSTANTS.FOLDER_KEY }) })
      );
      expect(mockApiClient.post.mock.calls[0][1]).not.toHaveProperty('folderKey');
    });

    it('should transform createdAt and updatedAt to createdTime and updatedTime', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback());

      const result = await feedbackService.submit(createOptions);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(feedbackService.submit({ ...createOptions, traceId: '' }))
        .rejects.toThrow('traceId is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.submit({ ...createOptions, folderKey: '' }))
        .rejects.toThrow('folderKey is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw error when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.submit(createOptions))
        .rejects.toThrow(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND);
    });
  });

  describe('updateById', () => {
    const updateOptions: FeedbackUpdateOptions = {
      isPositive: false,
      comment: 'On reflection, not great.',
      folderKey: FEEDBACK_TEST_CONSTANTS.FOLDER_KEY,
    };

    it('should update feedback successfully', async () => {
      mockApiClient.post.mockResolvedValue(createMockFeedback({ isPositive: false, comment: 'On reflection, not great.' }));

      const result = await feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, updateOptions);

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

      const result = await feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, updateOptions);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(feedbackService.updateById('', updateOptions))
        .rejects.toThrow('Feedback ID is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is empty', async () => {
      await expect(feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, { ...updateOptions, folderKey: '' }))
        .rejects.toThrow('folderKey is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw error when feedback not found', async () => {
      mockApiClient.post.mockRejectedValue(new Error(FEEDBACK_TEST_CONSTANTS.ERROR_FEEDBACK_NOT_FOUND));

      await expect(feedbackService.updateById(FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID, updateOptions))
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
});
