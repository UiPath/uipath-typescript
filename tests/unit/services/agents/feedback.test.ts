// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../../../../src/services/agents/feedback/feedback';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { FEEDBACK_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { TEST_CONSTANTS, FEEDBACK_TEST_CONSTANTS } from '../../../utils/constants';
import { createMockFeedback } from '../../../utils/mocks/feedback';

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
        expect.objectContaining({ params: expect.objectContaining({ skip: 0, take: TEST_CONSTANTS.PAGE_SIZE }) })
      );
    });
  });
});
