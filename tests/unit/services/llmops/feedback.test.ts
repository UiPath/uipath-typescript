// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/llmops/feedback';
import {
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
});
