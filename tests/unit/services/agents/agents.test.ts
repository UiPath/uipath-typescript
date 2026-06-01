// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import {
  AgentExecutionType,
  AgentIncidentSortColumn,
  AgentListSortColumn,
  AgentType,
} from '../../../../src/models/agents/agents.types';
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

  describe('getIncidents', () => {
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

    const mockIncident = {
      type: AGENT_TEST_CONSTANTS.INCIDENT_TYPE,
      description: AGENT_TEST_CONSTANTS.INCIDENT_DESCRIPTION,
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: null,
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      parentProcess: null,
      firstSeen: AGENT_TEST_CONSTANTS.INCIDENT_FIRST_SEEN,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      count: 21,
      firstSeenJob: mockJob,
      lastSeenJob: mockJob,
    };

    it('should return non-paginated response (items + totalErrorCount) when no pagination options are provided', async () => {
      const mockResponse = {
        totalErrorCount: 123,
        pagination: { totalCount: 39, pageNumber: 0, pageSize: 10 },
        data: [mockIncident],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getIncidents(startTime, endTime);

      expect(result.totalErrorCount).toBe(123);
      expect(result.totalCount).toBe(39);
      expect(result.items).toEqual([mockIncident]);
      // Non-paginated response: no pagination navigation fields
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENTS,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send pageSize + 0-indexed pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue({ totalErrorCount: 0, pagination: { totalCount: 0, pageNumber: 0, pageSize: 25 }, data: [] });

      await agentService.getIncidents(startTime, endTime, { pageSize: 25 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 25 },
        expect.any(Object),
      );
    });

    it('should convert jumpToPage (1-indexed) to API pageNumber (0-indexed)', async () => {
      mockApiClient.post.mockResolvedValue({ totalErrorCount: 0, pagination: { totalCount: 0, pageNumber: 2, pageSize: 10 }, data: [] });

      await agentService.getIncidents(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENTS,
        { startTime, endTime, pageNumber: 2, pageSize: 10 },
        expect.any(Object),
      );
    });

    it('should send orderBy and groupBy in camelCase body', async () => {
      mockApiClient.post.mockResolvedValue({ totalErrorCount: 0, pagination: { totalCount: 0, pageNumber: 0, pageSize: 10 }, data: [] });

      const orderBy = { column: AgentIncidentSortColumn.ExecutionCount, desc: true };
      const groupBy = [AgentIncidentSortColumn.AgentId, AgentIncidentSortColumn.ErrorTitle];

      await agentService.getIncidents(startTime, endTime, { pageSize: 10, orderBy, groupBy });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 10, orderBy, groupBy },
        expect.any(Object),
      );
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue({
        totalErrorCount: 123,
        pagination: { totalCount: 39, pageNumber: 0, pageSize: 10 },
        data: Array(10).fill(mockIncident),
      });

      const result = await agentService.getIncidents(startTime, endTime, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(39);
      expect(result.totalErrorCount).toBe(123);
      // Paginated: navigation fields present
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
      expect((result as { totalPages?: number }).totalPages).toBe(4);
    });

    it('should return paginated response without nextCursor on the last page', async () => {
      mockApiClient.post.mockResolvedValue({
        totalErrorCount: 123,
        pagination: { totalCount: 39, pageNumber: 3, pageSize: 10 },
        data: Array(9).fill(mockIncident),
      });

      const result = await agentService.getIncidents(startTime, endTime, { pageSize: 10, jumpToPage: 4 });

      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(false);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();
      expect((result as { previousCursor?: unknown }).previousCursor).toBeDefined();
    });

    it('should return response with absent fields when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getIncidents(startTime, endTime);

      expect(result.totalErrorCount).toBeUndefined();
      expect(result.totalCount).toBeUndefined();
      expect(result.items).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getIncidents(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTopConsumingAgents', () => {
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
    const mockAgentConsumption = {
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
      consumedQuantity: 27.0,
      consumedAGUQuantity: 27.0,
      consumedPLTUQuantity: 0.0,
      firstSeenJob: mockJob,
      lastSeenJob: mockJob,
    };

    it('should unwrap the data envelope when no options are provided', async () => {
      const mockEnvelope = {
        data: {
          startDate: AGENT_TEST_CONSTANTS.CONSUMPTION_START_DATE,
          endDate: AGENT_TEST_CONSTANTS.CONSUMPTION_END_DATE,
          totalConsumed: 282.0,
          totalAGUConsumed: 282.0,
          totalPLTUConsumed: 13.4,
          limit: 10,
          agents: [mockAgentConsumption],
        },
      };
      mockApiClient.post.mockResolvedValue(mockEnvelope);

      const result = await agentService.getTopConsumingAgents(startTime, endTime);

      // SDK unwraps the .data envelope — fields are flat at the top level
      expect(result.startDate).toBe(AGENT_TEST_CONSTANTS.CONSUMPTION_START_DATE);
      expect(result.totalConsumed).toBe(282.0);
      expect(result.agents).toEqual([mockAgentConsumption]);
      // Sanity: no nested `data` wrapper on the SDK response
      expect((result as { data?: unknown }).data).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body with all filter and health options', async () => {
      mockApiClient.post.mockResolvedValue({ data: { agents: [] } });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await agentService.getTopConsumingAgents(startTime, endTime, {
        folderKeys,
        projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        limit: 5,
        healthy: true,
        healthThreshold: 80,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
        {
          startTime,
          endTime,
          folderKeys,
          projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
          limit: 5,
          healthy: true,
          healthThreshold: 80,
        },
        expect.any(Object),
      );
    });

    it('should join agentTypes array into a comma-separated string for the API', async () => {
      mockApiClient.post.mockResolvedValue({ data: { agents: [] } });

      await agentService.getTopConsumingAgents(startTime, endTime, {
        agentTypes: [AgentType.Autonomous, AgentType.Coded],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
        { startTime, endTime, agentTypes: 'Autonomous,Coded' },
        expect.any(Object),
      );
    });

    it('should send a single agentTypes value as a one-element comma-separated string', async () => {
      mockApiClient.post.mockResolvedValue({ data: { agents: [] } });

      await agentService.getTopConsumingAgents(startTime, endTime, {
        agentTypes: [AgentType.Conversational],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
        { startTime, endTime, agentTypes: 'Conversational' },
        expect.any(Object),
      );
    });

    it('should distinguish healthy=false from healthy not set', async () => {
      mockApiClient.post.mockResolvedValue({ data: { agents: [] } });

      await agentService.getTopConsumingAgents(startTime, endTime, { healthy: false });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
        { startTime, endTime, healthy: false },
        expect.any(Object),
      );
    });

    it('should return an empty object when the API returns an empty envelope', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getTopConsumingAgents(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getTopConsumingAgents(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getConsumptionTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should send only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          { timeSlice: AGENT_TEST_CONSTANTS.TIMELINE_DATE, aguConsumption: 2.0 },
          { timeSlice: '2025-05-12T00:00:00Z', aguConsumption: 169.0 },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getConsumptionTimeline(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body with filter options', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      const agentNames = [AGENT_TEST_CONSTANTS.AGENT_NAME_1];

      await agentService.getConsumptionTimeline(startTime, endTime, {
        folderKeys,
        agentNames,
        projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
        {
          startTime,
          endTime,
          folderKeys,
          agentNames,
          projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getConsumptionTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
        { startTime, endTime, folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1] },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getConsumptionTimeline(startTime, endTime);

      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getConsumptionTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should send only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P50, value: 6.5, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P95, value: 8.75, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getLatencyTimeline(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body with filter options', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      const agentNames = [AGENT_TEST_CONSTANTS.AGENT_NAME_1];

      await agentService.getLatencyTimeline(startTime, endTime, {
        folderKeys,
        agentNames,
        projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
        {
          startTime,
          endTime,
          folderKeys,
          agentNames,
          projectKeys: [AGENT_TEST_CONSTANTS.PROJECT_KEY],
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getLatencyTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
        { startTime, endTime, folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1] },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getLatencyTimeline(startTime, endTime);

      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getLatencyTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getIncidentDistribution', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should unwrap data and drop the vestigial pagination wrapper', async () => {
      const mockEnvelope = {
        pagination: { totalCount: 0, pageNumber: 1, pageSize: 0 },
        data: { errorCount: 123, escalationCount: 5, policyCount: 2 },
      };
      mockApiClient.post.mockResolvedValue(mockEnvelope);

      const result = await agentService.getIncidentDistribution(startTime, endTime);

      // SDK returns the flat counts; pagination is dropped
      expect(result.errorCount).toBe(123);
      expect(result.escalationCount).toBe(5);
      expect(result.policyCount).toBe(2);
      expect((result as { pagination?: unknown }).pagination).toBeUndefined();
      expect((result as { data?: unknown }).data).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENT_DISTRIBUTION,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send camelCase body with filter options', async () => {
      mockApiClient.post.mockResolvedValue({ data: { errorCount: 0, escalationCount: 0, policyCount: 0 } });

      await agentService.getIncidentDistribution(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_INCIDENT_DISTRIBUTION,
        {
          startTime,
          endTime,
          folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        },
        expect.any(Object),
      );
    });

    it('should return an empty object when the API returns an empty envelope', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getIncidentDistribution(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getIncidentDistribution(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getAll', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;
    const mockAgent = {
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
      parentProcess: '',
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      lastRun: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
      processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      healthScore: 0,
      lastIncidentType: 'ERROR',
      unitsQuantity: 1.0,
      unitsName: null,
      quantityAGU: 1.0,
      quantityPLTU: 0.0,
    };

    it('should return non-paginated response (items + totals) when no pagination options are provided', async () => {
      const mockEnvelope = {
        pagination: { totalCount: 114, pageNumber: 0, pageSize: 10 },
        data: {
          agents: [mockAgent],
          totalUnitsConsumed: 282.0,
          totalAGUnitsConsumed: 282.0,
          totalPLTUnitsConsumed: 13.4,
        },
      };
      mockApiClient.post.mockResolvedValue(mockEnvelope);

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([mockAgent]);
      expect(result.totalCount).toBe(114);
      expect(result.totalUnitsConsumed).toBe(282.0);
      expect(result.totalAGUnitsConsumed).toBe(282.0);
      expect(result.totalPLTUnitsConsumed).toBe(13.4);
      // Non-paginated — no navigation fields
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send pageSize + 0-indexed pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 0, pageSize: 25 }, data: { agents: [] } });

      await agentService.getAll(startTime, endTime, { pageSize: 25 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 25 },
        expect.any(Object),
      );
    });

    it('should convert jumpToPage (1-indexed) to API pageNumber (0-indexed)', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 2, pageSize: 10 }, data: { agents: [] } });

      await agentService.getAll(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 2, pageSize: 10 },
        expect.any(Object),
      );
    });

    it('should send orderBy in the camelCase body', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 0, pageSize: 10 }, data: { agents: [] } });

      const orderBy = { column: AgentListSortColumn.HealthScore, desc: true };

      await agentService.getAll(startTime, endTime, { pageSize: 10, orderBy });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 10, orderBy },
        expect.any(Object),
      );
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue({
        pagination: { totalCount: 114, pageNumber: 0, pageSize: 10 },
        data: {
          agents: Array(10).fill(mockAgent),
          totalUnitsConsumed: 282.0,
          totalAGUnitsConsumed: 282.0,
          totalPLTUnitsConsumed: 13.4,
        },
      });

      const result = await agentService.getAll(startTime, endTime, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(114);
      expect(result.totalUnitsConsumed).toBe(282.0);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
      expect((result as { totalPages?: number }).totalPages).toBe(12);
    });

    it('should return response with empty items when API returns an empty envelope', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([]);
      expect(result.totalUnitsConsumed).toBeUndefined();
      expect(result.totalAGUnitsConsumed).toBeUndefined();
      expect(result.totalPLTUnitsConsumed).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getAll(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getSummary', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;
    const mockEntry = {
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      totalJobs: 5,
      successfulJobs: 2,
      successRate: 40.0,
      averageDurationSeconds: 4.03,
      firstJobFinished: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      lastJobFinished: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      lastJobStatus: AGENT_TEST_CONSTANTS.SUMMARY_LAST_JOB_STATUS,
    };
    const mockPeriod = {
      totalJobs: 74,
      successfulJobs: 30,
      successRate: 40.54,
      averageDurationSeconds: 217009.19,
      startTime,
      endTime,
      agents: [mockEntry],
    };

    it('should unwrap the data envelope and return currentPeriodSummary', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod } });

      const result = await agentService.getSummary(startTime, endTime);

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      // lookback omitted when not requested
      expect(result.lookbackPeriodSummary).toBeUndefined();
      // Sanity: SDK unwrapped the `data` wrapper
      expect((result as { data?: unknown }).data).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_SUMMARY,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send lookbackPeriodAnalysis, processKey, and folderKey when provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod, lookbackPeriodSummary: mockPeriod } });

      await agentService.getSummary(startTime, endTime, {
        lookbackPeriodAnalysis: true,
        processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
        folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_SUMMARY,
        {
          startTime,
          endTime,
          lookbackPeriodAnalysis: true,
          processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
          folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
        },
        expect.any(Object),
      );
    });

    it('should send executionType as a string enum value', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod } });

      await agentService.getSummary(startTime, endTime, {
        executionType: AgentExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_SUMMARY,
        { startTime, endTime, executionType: 'Runtime' },
        expect.any(Object),
      );
    });

    it('should return both periods when the API includes lookbackPeriodSummary', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { currentPeriodSummary: mockPeriod, lookbackPeriodSummary: mockPeriod },
      });

      const result = await agentService.getSummary(startTime, endTime, { lookbackPeriodAnalysis: true });

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      expect(result.lookbackPeriodSummary).toEqual(mockPeriod);
    });

    it('should distinguish folderKey (singular) from inherited folderKeys (plural)', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod } });

      await agentService.getSummary(startTime, endTime, {
        folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_2],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_SUMMARY,
        {
          startTime,
          endTime,
          folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
          folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_2],
        },
        expect.any(Object),
      );
    });

    it('should return an empty object when the API returns an empty envelope', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getSummary(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getSummary(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
