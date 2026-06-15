// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AgentErrorSortColumn, AgentListSortColumn } from '../../../../src/models/agents/agents.types';
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

      expect(result.data).toEqual([mockPoint]);

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

    it('should return undefined data when the envelope omits it', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getErrorsTimeline(startTime, endTime, {});

      expect(result.data).toBeUndefined();
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

      expect(result.data).toEqual([mockPoint]);

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

    it('should return undefined data when the envelope omits it', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getConsumptionTimeline(startTime, endTime, {});

      expect(result.data).toBeUndefined();
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

      expect(result.data).toEqual(mockPoints);

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

    it('should return undefined data when the envelope omits it', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getLatencyTimeline(startTime, endTime, {});

      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(
        agentService.getLatencyTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
