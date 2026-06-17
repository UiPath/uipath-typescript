// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AgentErrorSortColumn, AgentListSortColumn, AgentType, AgentExecutionType } from '../../../../src/models/agents/agents.types';
import { AGENT_TEST_CONSTANTS } from '../../../utils/constants';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// Mirrors the live API envelope: items nested under data.agents, total count under
// pagination.totalCount. (The API also returns aggregate consumption totals alongside
// the items, but the SDK does not surface them, so they are omitted here.)
const buildEnvelope = (agents: unknown[], totalCount: number, pageNumber = 0, pageSize = 10) => ({
  pagination: { totalCount, pageNumber, pageSize },
  data: { agents },
});

// Errors envelope: the items array is the `data` field directly (vs nested
// under data.agents for the agents list).
const buildErrorsEnvelope = (errors: unknown[], totalCount: number, pageNumber = 0, pageSize = 10) => ({
  pagination: { totalCount, pageNumber, pageSize },
  data: errors,
});

// ===== TEST SUITE =====
describe('AgentService Unit Tests', () => {
  let agentService: AgentService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    agentService = new AgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
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

    it('should return non-paginated response (items + totalCount) when no pagination options are provided', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([mockAgent], 114));

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([mockAgent]);
      expect(result.totalCount).toBe(114);
      // Non-paginated — no navigation fields
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();

      // Non-paginated body carries no pagination params
      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_AGENTS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.pageNumber).toBeUndefined();
      expect(body.pageSize).toBeUndefined();
    });

    it('should send pageSize + 0-based pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 25));

      await agentService.getAll(startTime, endTime, { pageSize: 25 });

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_AGENTS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(25);
    });

    it('should convert jumpToPage (1-based) to a 0-based pageNumber', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 2, 10));

      await agentService.getAll(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(2);
      expect(body.pageSize).toBe(10);
    });

    it('should send orderBy in the camelCase body', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 10));

      const orderBy = { column: AgentListSortColumn.HealthScore, desc: true };

      await agentService.getAll(startTime, endTime, { pageSize: 10, orderBy });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.orderBy).toEqual(orderBy);
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(10);
    });

    it('should pass array filters through the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 10));

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      await agentService.getAll(startTime, endTime, { pageSize: 10, folderKeys });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope(Array(10).fill(mockAgent), 114, 0, 10));

      const result = await agentService.getAll(startTime, endTime, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(114);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
      expect((result as { totalPages?: number }).totalPages).toBe(12);
    });

    it('should return empty items when no agents match the window', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0));

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getAll(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getErrors', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockJob = {
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
    };
    const mockError = {
      type: AGENT_TEST_CONSTANTS.ERROR_TYPE,
      description: AGENT_TEST_CONSTANTS.ERROR_DESCRIPTION,
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      parentProcess: null,
      firstSeen: AGENT_TEST_CONSTANTS.ERROR_FIRST_SEEN,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      count: 3,
      firstSeenJob: mockJob,
      lastSeenJob: mockJob,
    };
    it('should return non-paginated response (items + totalCount) when no pagination options are provided', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([mockError], 39));

      const result = await agentService.getErrors(startTime, endTime);

      expect(result.items).toEqual([mockError]);
      expect(result.totalCount).toBe(39);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_INCIDENTS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.pageNumber).toBeUndefined();
      expect(body.pageSize).toBeUndefined();
    });

    it('should send pageSize + 0-based pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([], 0, 0, 2));

      await agentService.getErrors(startTime, endTime, { pageSize: 2 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(2);
    });

    it('should convert jumpToPage (1-based) to a 0-based pageNumber', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([], 0, 2, 10));

      await agentService.getErrors(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(2);
      expect(body.pageSize).toBe(10);
    });

    it('should send orderBy and groupBy in the camelCase body', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([], 0, 0, 10));

      const orderBy = { column: AgentErrorSortColumn.ExecutionCount, desc: true };
      const groupBy = [AgentErrorSortColumn.Type];

      await agentService.getErrors(startTime, endTime, { pageSize: 10, orderBy, groupBy });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.orderBy).toEqual(orderBy);
      expect(body.groupBy).toEqual(groupBy);
    });

    it('should pass array filters through the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([], 0, 0, 10));

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      await agentService.getErrors(startTime, endTime, { pageSize: 10, folderKeys });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope(Array(2).fill(mockError), 39, 0, 2));

      const result = await agentService.getErrors(startTime, endTime, { pageSize: 2 });

      expect(result.items.length).toBe(2);
      expect(result.totalCount).toBe(39);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
    });

    it('should return empty items when no errors match the window', async () => {
      mockApiClient.post.mockResolvedValue(buildErrorsEnvelope([], 0));

      const result = await agentService.getErrors(startTime, endTime);

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getErrors(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockPoint = {
      name: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
      value: 4,
      date: AGENT_TEST_CONSTANTS.TIMELINE_DATE,
    };

    it('should return the timeline points with only the window in the body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: [mockPoint] });

      const result = await agentService.getErrorsTimeline(startTime, endTime);

      expect(result).toEqual([mockPoint]);

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.folderKeys).toBeUndefined();
      expect(body.limit).toBeUndefined();
    });

    it('should include all filters in the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      const agentNames = [AGENT_TEST_CONSTANTS.AGENT_NAME_1, AGENT_TEST_CONSTANTS.AGENT_NAME_2];
      const projectKeys = [AGENT_TEST_CONSTANTS.PROJECT_KEY];

      await agentService.getErrorsTimeline(startTime, endTime, {
        folderKeys,
        agentNames,
        projectKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        limit: 5,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body.agentNames).toEqual(agentNames);
      expect(body.projectKeys).toEqual(projectKeys);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(body.processVersion).toBe(AGENT_TEST_CONSTANTS.PROCESS_VERSION);
      expect(body.limit).toBe(5);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should omit undefined options from the body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getErrorsTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual([AGENT_TEST_CONSTANTS.FOLDER_KEY_1]);
      expect('agentNames' in body).toBe(false);
      expect('agentId' in body).toBe(false);
      expect('limit' in body).toBe(false);
    });

    it('should return an empty array when the timeline has no points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const result = await agentService.getErrorsTimeline(startTime, endTime, {});

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getErrorsTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getConsumptionTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockPoint = {
      timeSlice: AGENT_TEST_CONSTANTS.TIMELINE_DATE,
      aguConsumption: 1.4,
    };

    it('should return the timeline points with only the window in the body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: [mockPoint] });

      const result = await agentService.getConsumptionTimeline(startTime, endTime);

      expect(result).toEqual([mockPoint]);

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.folderKeys).toBeUndefined();
    });

    it('should include all filters in the body without OData prefixing', async () => {
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

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body.agentNames).toEqual(agentNames);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(body['$folderKeys']).toBeUndefined();
      // consumption timeline has no limit option
      expect('limit' in body).toBe(false);
    });

    it('should omit undefined options from the body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getConsumptionTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual([AGENT_TEST_CONSTANTS.FOLDER_KEY_1]);
      expect('agentNames' in body).toBe(false);
      expect('agentId' in body).toBe(false);
      expect('projectKeys' in body).toBe(false);
      expect('processVersion' in body).toBe(false);
    });

    it('should return an empty array when the timeline has no points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const result = await agentService.getConsumptionTimeline(startTime, endTime, {});

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getConsumptionTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockPoints = [
      {
        name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P50,
        value: 120,
        date: AGENT_TEST_CONSTANTS.TIMELINE_DATE,
      },
      {
        name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P95,
        value: 480,
        date: AGENT_TEST_CONSTANTS.TIMELINE_DATE,
      },
    ];

    it('should return the per-percentile timeline points with only the window in the body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPoints });

      const result = await agentService.getLatencyTimeline(startTime, endTime);

      expect(result).toEqual(mockPoints);

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.folderKeys).toBeUndefined();
    });

    it('should include all filters in the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await agentService.getLatencyTimeline(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(body.processVersion).toBe(AGENT_TEST_CONSTANTS.PROCESS_VERSION);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should omit undefined options from the body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getLatencyTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual([AGENT_TEST_CONSTANTS.FOLDER_KEY_1]);
      expect('agentNames' in body).toBe(false);
      expect('agentId' in body).toBe(false);
      expect('projectKeys' in body).toBe(false);
      expect('processVersion' in body).toBe(false);
    });

    it('should return an empty array when the timeline has no points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      const result = await agentService.getLatencyTimeline(startTime, endTime, {});

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getLatencyTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTopErroredAgents', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockJob = {
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
    };
    const mockResponse = {
      totalErrors: 68,
      data: [
        {
          name: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
          count: 12,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          firstSeenJob: mockJob,
          lastSeenJob: mockJob,
        },
      ],
    };

    it('should return the object with only the window in the body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getTopErroredAgents(startTime, endTime);

      expect(result.totalErrors).toBe(68);
      expect(result.data).toEqual(mockResponse.data);

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect('limit' in body).toBe(false);
    });

    it('should include all filters in the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue({});

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      await agentService.getTopErroredAgents(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
        limit: 5,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(body.processVersion).toBe(AGENT_TEST_CONSTANTS.PROCESS_VERSION);
      expect(body.limit).toBe(5);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should omit undefined fields when the API returns an empty object', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getTopErroredAgents(startTime, endTime);

      expect(result.totalErrors).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getTopErroredAgents(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTopConsumingAgents', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockJob = {
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
    };
    const mockPayload = {
      startDate: AGENT_TEST_CONSTANTS.CONSUMPTION_START_DATE,
      endDate: AGENT_TEST_CONSTANTS.CONSUMPTION_END_DATE,
      totalConsumed: 42.5,
      totalAGUConsumed: 30,
      totalPLTUConsumed: 12.5,
      limit: 10,
      agents: [
        {
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentName: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
          consumedQuantity: 5,
          consumedAGUQuantity: 3,
          consumedPLTUQuantity: 2,
          firstSeenJob: mockJob,
          lastSeenJob: mockJob,
        },
      ],
    };

    it('should unwrap the data envelope and return the flat payload', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPayload });

      const result = await agentService.getTopConsumingAgents(startTime, endTime);

      expect(result.totalConsumed).toBe(42.5);
      expect(result.agents).toEqual(mockPayload.agents);
      // envelope is unwrapped — no nested data field
      expect((result as { data?: unknown }).data).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
    });

    it('should send health filters and join agentTypes into a comma-separated string', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await agentService.getTopConsumingAgents(startTime, endTime, {
        limit: 5,
        healthy: true,
        healthThreshold: 80,
        agentTypes: [AgentType.Autonomous, AgentType.Coded],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.limit).toBe(5);
      expect(body.healthy).toBe(true);
      expect(body.healthThreshold).toBe(80);
      expect(body.agentTypes).toBe('Autonomous,Coded');
    });

    it('should send healthy:false distinct from unset', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await agentService.getTopConsumingAgents(startTime, endTime, { healthy: false });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.healthy).toBe(false);
    });

    it('should return an empty object when the envelope data is absent', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getTopConsumingAgents(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getTopConsumingAgents(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getIncidentDistribution', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockPayload = {
      errorCount: 10,
      escalationCount: 3,
      policyCount: 1,
    };

    it('should unwrap the data envelope and drop the vestigial pagination sibling', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 14 }, data: mockPayload });

      const result = await agentService.getIncidentDistribution(startTime, endTime);

      expect(result.errorCount).toBe(10);
      expect(result.escalationCount).toBe(3);
      expect(result.policyCount).toBe(1);
      expect((result as { pagination?: unknown }).pagination).toBeUndefined();
      expect((result as { data?: unknown }).data).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_INCIDENT_DISTRIBUTION);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
    });

    it('should include filters in the body', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      await agentService.getIncidentDistribution(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
    });

    it('should return an empty object when the envelope data is absent', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getIncidentDistribution(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getIncidentDistribution(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockPeriod = {
      totalJobs: 100,
      successfulJobs: 95,
      successRate: 95,
      averageDurationSeconds: 12.3,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      agents: [
        {
          processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
          folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
          totalJobs: 100,
          successfulJobs: 95,
          successRate: 95,
          averageDurationSeconds: 12.3,
          firstJobFinished: AGENT_TEST_CONSTANTS.JOB_START_TIME,
          lastJobFinished: AGENT_TEST_CONSTANTS.JOB_END_TIME,
          lastJobStatus: AGENT_TEST_CONSTANTS.SUMMARY_LAST_JOB_STATUS,
        },
      ],
    };

    it('should unwrap the data envelope; lookback is undefined when not requested', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod } });

      const result = await agentService.getSummary(startTime, endTime);

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      expect(result.lookbackPeriodSummary).toBeUndefined();
      expect((result as { data?: unknown }).data).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_SUMMARY);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
    });

    it('should send lookbackPeriodAnalysis, processKey and folderKey (singular, distinct from folderKeys)', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await agentService.getSummary(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        lookbackPeriodAnalysis: true,
        processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
        folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_2,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.lookbackPeriodAnalysis).toBe(true);
      expect(body.processKey).toBe(AGENT_TEST_CONSTANTS.PROCESS_KEY);
      expect(body.folderKey).toBe(AGENT_TEST_CONSTANTS.FOLDER_KEY_2);
      expect(body.folderKeys).toEqual([AGENT_TEST_CONSTANTS.FOLDER_KEY_1]);
    });

    it('should send executionType as its string name', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await agentService.getSummary(startTime, endTime, {
        executionType: AgentExecutionType.Runtime,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.executionType).toBe('Runtime');
    });

    it('should return both periods when the API includes a lookback summary', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { currentPeriodSummary: mockPeriod, lookbackPeriodSummary: mockPeriod },
      });

      const result = await agentService.getSummary(startTime, endTime, { lookbackPeriodAnalysis: true });

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      expect(result.lookbackPeriodSummary).toEqual(mockPeriod);
    });

    it('should return an empty object when the envelope data is absent', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getSummary(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getSummary(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getUnitConsumptionSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const mockConsumption = { completeJobs: 8, incompleteJobs: 2 };
    const mockPeriod = {
      totalAgentUnitConsumption: mockConsumption,
      totalPlatformUnitConsumption: mockConsumption,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      agentConsumption: [
        {
          folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
          processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
          processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
          firstJobFinished: AGENT_TEST_CONSTANTS.JOB_START_TIME,
          lastJobFinished: AGENT_TEST_CONSTANTS.JOB_END_TIME,
          agentUnitConsumption: mockConsumption,
          platformUnitConsumption: mockConsumption,
        },
      ],
    };

    it('should unwrap the data envelope; lookback is undefined when not requested', async () => {
      mockApiClient.post.mockResolvedValue({ data: { currentPeriodSummary: mockPeriod } });

      const result = await agentService.getUnitConsumptionSummary(startTime, endTime);

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      expect(result.lookbackPeriodSummary).toBeUndefined();
      expect((result as { data?: unknown }).data).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_UNIT_CONSUMPTION_SUMMARY);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
    });

    it('should send lookbackPeriodAnalysis, processKey, folderKey and executionType', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await agentService.getUnitConsumptionSummary(startTime, endTime, {
        lookbackPeriodAnalysis: true,
        processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
        folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
        executionType: AgentExecutionType.Runtime,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.lookbackPeriodAnalysis).toBe(true);
      expect(body.processKey).toBe(AGENT_TEST_CONSTANTS.PROCESS_KEY);
      expect(body.folderKey).toBe(AGENT_TEST_CONSTANTS.FOLDER_KEY_1);
      expect(body.executionType).toBe('Runtime');
    });

    it('should return both periods when the API includes a lookback summary', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { currentPeriodSummary: mockPeriod, lookbackPeriodSummary: mockPeriod },
      });

      const result = await agentService.getUnitConsumptionSummary(startTime, endTime, {
        lookbackPeriodAnalysis: true,
      });

      expect(result.currentPeriodSummary).toEqual(mockPeriod);
      expect(result.lookbackPeriodSummary).toEqual(mockPeriod);
    });

    it('should return an empty object when the envelope data is absent', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getUnitConsumptionSummary(startTime, endTime);

      expect(result).toEqual({});
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getUnitConsumptionSummary(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
