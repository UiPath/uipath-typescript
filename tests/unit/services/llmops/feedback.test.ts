// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/llmops/feedback';
import {
  FeedbackCreateOptions,
  FeedbackResponse,
  FeedbackStatus,
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
});
