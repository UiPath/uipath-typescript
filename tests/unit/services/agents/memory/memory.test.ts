// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryService } from '../../../../../src/services/agents/memory/memory';
import { ApiClient } from '../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../utils/setup';
import { MEMORY_ENDPOINTS } from '../../../../../src/utils/constants/endpoints';
import { MEMORY_TEST_CONSTANTS } from '../../../../utils/constants';
import {
  createMockMemoryGetTimelineResponse,
  createMockMemoryGetCallsTimelineResponse,
  createMockMemoryGetTopSpacesResponse,
} from '../../../../utils/mocks/memory';
import {
  ExecutionType,
  MemoryGetTimelineOptions,
  MemoryGetCallsTimelineOptions,
  MemoryGetTopSpacesOptions,
} from '../../../../../src/models/agents/memory/memory.types';

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

  describe('getTimeline', () => {
    it('should retrieve the memory timeline successfully', async () => {
      const mockResponse = createMockMemoryGetTimelineResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await memoryService.getTimeline();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].timeSlice).toBe(MEMORY_TEST_CONSTANTS.TIME_SLICE_1);
      expect(result.data?.[0].inMemoryCount).toBe(3);
      expect(result.data?.[0].totalCount).toBe(4);
    });

    it('should call the endpoint with an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTimelineResponse());

      await memoryService.getTimeline();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_TIMELINE,
        {},
        expect.anything(),
      );
    });

    it('should pass all provided filters into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTimelineResponse());

      const options: MemoryGetTimelineOptions = {
        startTime: MEMORY_TEST_CONSTANTS.START_TIME,
        endTime: MEMORY_TEST_CONSTANTS.END_TIME,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
      };

      await memoryService.getTimeline(options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_TIMELINE,
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
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTimelineResponse());

      await memoryService.getTimeline({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });

      const sentBody = mockApiClient.post.mock.calls[0][1];
      expect(sentBody).toEqual({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });
      expect(sentBody).not.toHaveProperty('agentId');
      expect(sentBody).not.toHaveProperty('executionType');
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(MEMORY_TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(memoryService.getTimeline()).rejects.toThrow(
        MEMORY_TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });

  describe('getCallsTimeline', () => {
    it('should retrieve the memory calls timeline successfully', async () => {
      const mockResponse = createMockMemoryGetCallsTimelineResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await memoryService.getCallsTimeline();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].timeSlice).toBe(MEMORY_TEST_CONSTANTS.TIME_SLICE_1);
      expect(result.data?.[0].memoryCallsCount).toBe(7);
      expect(result.data?.[1].memoryCallsCount).toBe(12);
    });

    it('should call the endpoint with an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetCallsTimelineResponse());

      await memoryService.getCallsTimeline();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_CALLS_TIMELINE,
        {},
        expect.anything(),
      );
    });

    it('should pass all provided filters into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetCallsTimelineResponse());

      const options: MemoryGetCallsTimelineOptions = {
        startTime: MEMORY_TEST_CONSTANTS.START_TIME,
        endTime: MEMORY_TEST_CONSTANTS.END_TIME,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
      };

      await memoryService.getCallsTimeline(options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_CALLS_TIMELINE,
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
      mockApiClient.post.mockResolvedValue(createMockMemoryGetCallsTimelineResponse());

      await memoryService.getCallsTimeline({ endTime: MEMORY_TEST_CONSTANTS.END_TIME });

      const sentBody = mockApiClient.post.mock.calls[0][1];
      expect(sentBody).toEqual({ endTime: MEMORY_TEST_CONSTANTS.END_TIME });
      expect(sentBody).not.toHaveProperty('startTime');
      expect(sentBody).not.toHaveProperty('folderKeys');
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(MEMORY_TEST_CONSTANTS.ERROR_MESSAGE_CALLS));

      await expect(memoryService.getCallsTimeline()).rejects.toThrow(
        MEMORY_TEST_CONSTANTS.ERROR_MESSAGE_CALLS,
      );
    });
  });

  describe('getTopSpaces', () => {
    it('should retrieve the top memory spaces successfully', async () => {
      const mockResponse = createMockMemoryGetTopSpacesResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await memoryService.getTopSpaces();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].memorySpaceId).toBe(MEMORY_TEST_CONSTANTS.MEMORY_SPACE_ID);
      expect(result.data?.[0].memorySpaceName).toBe(MEMORY_TEST_CONSTANTS.MEMORY_SPACE_NAME);
      expect(result.data?.[0].memoryCount).toBe(9);
      expect(result.data?.[0].enabledMemoryCount).toBe(6);
      expect(result.data?.[0].disabledMemoryCount).toBe(3);
    });

    it('should call the endpoint with an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTopSpacesResponse());

      await memoryService.getTopSpaces();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_TOP_SPACES,
        {},
        expect.anything(),
      );
    });

    it('should pass all provided filters including limit into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTopSpacesResponse());

      const options: MemoryGetTopSpacesOptions = {
        startTime: MEMORY_TEST_CONSTANTS.START_TIME,
        endTime: MEMORY_TEST_CONSTANTS.END_TIME,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
        limit: MEMORY_TEST_CONSTANTS.LIMIT,
      };

      await memoryService.getTopSpaces(options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MEMORY_ENDPOINTS.GET_TOP_SPACES,
        {
          startTime: MEMORY_TEST_CONSTANTS.START_TIME,
          endTime: MEMORY_TEST_CONSTANTS.END_TIME,
          agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
          agentVersion: MEMORY_TEST_CONSTANTS.AGENT_VERSION,
          folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
          executionType: ExecutionType.Runtime,
          limit: MEMORY_TEST_CONSTANTS.LIMIT,
        },
        expect.anything(),
      );
    });

    it('should omit limit from the request body when not provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockMemoryGetTopSpacesResponse());

      await memoryService.getTopSpaces({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });

      const sentBody = mockApiClient.post.mock.calls[0][1];
      expect(sentBody).toEqual({ startTime: MEMORY_TEST_CONSTANTS.START_TIME });
      expect(sentBody).not.toHaveProperty('limit');
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(MEMORY_TEST_CONSTANTS.ERROR_MESSAGE_SPACES));

      await expect(memoryService.getTopSpaces()).rejects.toThrow(
        MEMORY_TEST_CONSTANTS.ERROR_MESSAGE_SPACES,
      );
    });
  });
});
