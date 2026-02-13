// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/llmops/feedback';
import {
  FeedbackCreateOptions,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackEditOptions,
  FeedbackCategoryCreateOptions,
  FeedbackCategoryResponse,
} from '../../../../src/models/llmops/feedback.types';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { FEEDBACK_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

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

  describe('create', () => {
    it('should create feedback successfully', async () => {
      const feedbackInput: FeedbackCreateOptions = {
        traceId: 'trace-123',
        spanId: 'span-456',
        agentId: 'agent-789',
        isPositive: true,
        comment: 'Great response!',
        categories: [{ category: 'Helpful' }],
      };

      const mockResponse: FeedbackResponse = {
        id: 'feedback-1',
        traceId: feedbackInput.traceId,
        spanId: feedbackInput.spanId,
        agentId: feedbackInput.agentId,
        isPositive: feedbackInput.isPositive,
        comment: feedbackInput.comment,
        feedbackCategories: [{ id: 'cat-1', category: 'Helpful', createdAt: '2024-01-01', isDefault: false }],
        status: FeedbackStatus.Active,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await feedbackService.create(feedbackInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('feedback-1');
      expect(result.traceId).toBe(feedbackInput.traceId);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CREATE,
        feedbackInput,
        {}
      );
    });

    it('should handle API errors during creation', async () => {
      const feedbackInput: FeedbackCreateOptions = {
        traceId: 'trace-123',
        spanId: 'span-456',
        agentId: 'agent-789',
        isPositive: true,
      };

      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      await expect(feedbackService.create(feedbackInput)).rejects.toThrow('API Error');
    });
  });

  describe('getAll', () => {
    it('should get all feedback successfully', async () => {
      const mockResponse: FeedbackResponse[] = [
        {
          id: 'feedback-1',
          traceId: 'trace-123',
          spanId: 'span-456',
          agentId: 'agent-789',
          isPositive: true,
          comment: 'Great!',
          feedbackCategories: [],
          status: FeedbackStatus.Active,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: undefined }
      );
    });

    it('should get all feedback with filters', async () => {
      const mockResponse: FeedbackResponse[] = [];
      mockApiClient.get.mockResolvedValue(mockResponse);

      const options = {
        skip: 0,
        take: 10,
        agentId: 'agent-789',
      };

      await feedbackService.getAll(options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: options }
      );
    });
  });

  describe('getById', () => {
    it('should get feedback by ID successfully', async () => {
      const mockResponse: FeedbackResponse = {
        id: 'feedback-1',
        traceId: 'trace-123',
        spanId: 'span-456',
        agentId: 'agent-789',
        isPositive: true,
        status: FeedbackStatus.Active,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getById('feedback-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('feedback-1');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_BY_ID('feedback-1'),
        {}
      );
    });

    it('should handle not found error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Not Found'));

      await expect(feedbackService.getById('invalid-id')).rejects.toThrow('Not Found');
    });
  });

  describe('update', () => {
    it('should update feedback successfully', async () => {
      const updateData: FeedbackEditOptions = {
        comment: 'Updated comment',
        isPositive: false,
      };

      const mockResponse: FeedbackResponse = {
        id: 'feedback-1',
        traceId: 'trace-123',
        spanId: 'span-456',
        agentId: 'agent-789',
        isPositive: false,
        comment: 'Updated comment',
        status: FeedbackStatus.Active,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await feedbackService.update('feedback-1', updateData);

      expect(result).toBeDefined();
      expect(result.comment).toBe('Updated comment');
      expect(result.isPositive).toBe(false);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.UPDATE('feedback-1'),
        updateData,
        {}
      );
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await feedbackService.deleteFeedback('feedback-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.DELETE('feedback-1'),
        {}
      );
    });

    it('should handle deletion errors', async () => {
      mockApiClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(feedbackService.deleteFeedback('feedback-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const categoryInput: FeedbackCategoryCreateOptions = {
        category: 'Helpful',
      };

      const mockResponse: FeedbackCategoryResponse = {
        id: 'category-1',
        category: 'Helpful',
        createdAt: '2024-01-01',
        isDefault: false,
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await feedbackService.createCategory(categoryInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('category-1');
      expect(result.category).toBe('Helpful');
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.CREATE_CATEGORY,
        categoryInput,
        {}
      );
    });
  });

  describe('getCategories', () => {
    it('should get all categories successfully', async () => {
      const mockResponse: FeedbackCategoryResponse[] = [
        {
          id: 'category-1',
          category: 'Helpful',
          createdAt: '2024-01-01',
          isDefault: false,
        },
        {
          id: 'category-2',
          category: 'Not Helpful',
          createdAt: '2024-01-01',
          isDefault: false,
        },
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getCategories();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_CATEGORIES,
        {}
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await feedbackService.deleteCategory('category-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.DELETE_CATEGORY('category-1'),
        {}
      );
    });
  });
});
