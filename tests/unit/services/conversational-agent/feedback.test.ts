// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/conversational-agent/feedback/feedback';
import {
  FeedbackResponse,
  FeedbackStatus,
} from '../../../../src/models/conversational-agent/feedback/feedback.types';
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
          status: FeedbackStatus.Pending,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: {} }
      );
    });

    it('should get all feedback with filters', async () => {
      const mockResponse: FeedbackResponse[] = [];
      mockApiClient.get.mockResolvedValue(mockResponse);

      const options = {
        agentId: 'agent-789',
      };

      await feedbackService.getAll(options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: { agentId: 'agent-789' } }
      );
    });

    it('should get paginated feedback', async () => {
      const mockResponse: FeedbackResponse[] = [
        {
          id: 'feedback-1',
          traceId: 'trace-123',
          spanId: 'span-456',
          agentId: 'agent-789',
          isPositive: true,
          feedbackCategories: [],
          status: FeedbackStatus.Pending,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll({ pageSize: 10 });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: { skip: 0, take: 10 } }
      );
    });
  });
});
