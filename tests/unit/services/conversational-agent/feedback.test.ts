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
import {
  TEST_CONSTANTS,
  FEEDBACK_TEST_CONSTANTS,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
} from '../../../utils/constants';

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
          id: FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID,
          traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
          spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_SPAN_ID,
          agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID,
          isPositive: true,
          comment: 'Great!',
          feedbackCategories: [],
          status: FeedbackStatus.Pending,
          createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
          updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
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
        agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID,
      };

      await feedbackService.getAll(options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: { agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID } }
      );
    });

    it('should throw error when API call fails', async () => {
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(feedbackService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should get paginated feedback', async () => {
      const mockResponse: FeedbackResponse[] = [
        {
          id: FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID,
          traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
          spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_SPAN_ID,
          agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID,
          isPositive: true,
          feedbackCategories: [],
          status: FeedbackStatus.Pending,
          createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
          updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
        },
      ];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await feedbackService.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: { skip: 0, take: TEST_CONSTANTS.PAGE_SIZE } }
      );
    });
  });
});
