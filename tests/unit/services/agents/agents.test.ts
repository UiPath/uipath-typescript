// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AGENT_TEST_CONSTANTS } from '../../../utils/constants';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('AgentService Unit Tests', () => {
  let agentService: AgentService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    agentService = new AgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNames', () => {
    it('should get all agent names successfully', async () => {
      const mockResponse = {
        agents: [
          AGENT_TEST_CONSTANTS.AGENT_NAME_1,
          AGENT_TEST_CONSTANTS.AGENT_NAME_2,
          AGENT_TEST_CONSTANTS.AGENT_NAME_3,
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getNames();

      expect(result).toBeDefined();
      expect(result.agents).toEqual(mockResponse.agents);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_NAMES,
        {},
        expect.any(Object)
      );
    });

    it('should send FolderKeys when folderKeys option is provided', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const folderKeys = [
        AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
        AGENT_TEST_CONSTANTS.FOLDER_KEY_2,
      ];

      await agentService.getNames({ folderKeys });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_NAMES,
        { FolderKeys: folderKeys },
        expect.any(Object)
      );
    });

    it('should return an empty array when no agent names are found', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const result = await agentService.getNames();

      expect(result.agents).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(agentService.getNames()).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getErrorsTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should send only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.AGENT_NAME_1, value: 3, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: AGENT_TEST_CONSTANTS.AGENT_NAME_2, value: 0, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getErrorsTimeline(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body fields (no PascalCase transform)', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      const agentNames = [AGENT_TEST_CONSTANTS.AGENT_NAME_1, AGENT_TEST_CONSTANTS.AGENT_NAME_2];

      await agentService.getErrorsTimeline(startTime, endTime, {
        folderKeys,
        agentNames,
        projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        limit: 5,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
        {
          startTime,
          endTime,
          folderKeys,
          agentNames,
          projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
          limit: 5,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getErrorsTimeline(startTime, endTime, { limit: 10 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
        { startTime, endTime, limit: 10 },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getErrorsTimeline(startTime, endTime);

      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getErrorsTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTopErroredAgents', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;
    const mockJob = {
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
    };

    it('should send only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        totalErrors: 68,
        data: [
          {
            name: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
            count: 27,
            agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
            firstSeenJob: mockJob,
            lastSeenJob: mockJob,
          },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getTopErroredAgents(startTime, endTime);

      expect(result.totalErrors).toBe(68);
      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body fields with all options', async () => {
      mockApiClient.post.mockResolvedValue({ totalErrors: 0, data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      const agentNames = [AGENT_TEST_CONSTANTS.AGENT_NAME_1];

      await agentService.getTopErroredAgents(startTime, endTime, {
        folderKeys,
        agentNames,
        projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        limit: 5,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS,
        {
          startTime,
          endTime,
          folderKeys,
          agentNames,
          projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
          limit: 5,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ totalErrors: 0, data: [] });

      await agentService.getTopErroredAgents(startTime, endTime, { limit: 5 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS,
        { startTime, endTime, limit: 5 },
        expect.any(Object),
      );
    });

    it('should return response with absent fields when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getTopErroredAgents(startTime, endTime);

      expect(result.totalErrors).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getTopErroredAgents(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
