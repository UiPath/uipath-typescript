// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryService } from '../../../../../src/services/agents/memory/memory';
import { ApiClient } from '../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../utils/setup';
import { MEMORY_ENDPOINTS } from '../../../../../src/utils/constants/endpoints';
import { MEMORY_TEST_CONSTANTS } from '../../../../utils/constants';
import { createMockMemoryTimelineResponse } from '../../../../utils/mocks/memory';
import { ExecutionType, MemoryTimelineGetOptions } from '../../../../../src/models/agents/memory/memory.types';

// ===== MOCKING =====
vi.mock('../../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('MemoryService Unit Tests', () => {
  let memoryService: MemoryService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as never);
    memoryService = new MemoryService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMemoryTimeline', () => {
    it('should retrieve the memory timeline successfully', async () => {
      const mockResponse = createMockMemoryTimelineResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await memoryService.getMemoryTimeline();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].timeSlice).toBe(MEMORY_TEST_CONSTANTS.TIME_SLICE_1);
      expect(result.data?.[0].inMemoryCount).toBe(3);
      expect(result.data?.[0].totalCount).toBe(4);
    });

    it('should call the endpoint with an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryTimelineResponse());

      await memoryService.getMemoryTimeline();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_MEMORY_TIMELINE,
        {},
        expect.anything(),
      );
    });

    it('should pass all provided filters into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryTimelineResponse());

      const options: MemoryTimelineGetOptions = {
        startTime: MEMORY_TEST_CONSTANTS.START_TIME,
        endTime: MEMORY_TEST_CONSTANTS.END_TIME,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
      };

      await memoryService.getMemoryTimeline(options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_MEMORY_TIMELINE,
        {
          startTime: MEMORY_TEST_CONSTANTS.START_TIME,
          endTime: MEMORY_TEST_CONSTANTS.END_TIME,
          agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
          agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
          folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
          executionType: ExecutionType.Runtime,
        },
        expect.anything(),
      );
    });

    it('should omit undefined filters from the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryTimelineResponse());

      await memoryService.getMemoryTimeline({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });

      const sentBody = mockApiClient.post.mock.calls[0][1];
      expect(sentBody).toEqual({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });
      expect(sentBody).not.toHaveProperty('agentId');
      expect(sentBody).not.toHaveProperty('executionType');
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(MEMORY_TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(memoryService.getMemoryTimeline()).rejects.toThrow(
        MEMORY_TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });
});
