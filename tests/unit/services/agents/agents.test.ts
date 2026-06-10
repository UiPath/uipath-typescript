// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AgentExecutionType, AgentListSortColumn } from '../../../../src/models/agents/agents.types';
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

// Spans-by-reference envelope: spans under `data`, total count under `pagination.totalCount`.
const buildSpansEnvelope = (spans: unknown[], totalCount: number, pageNumber = 0, pageSize = 10) => ({
  pagination: { totalCount, pageNumber, pageSize },
  data: spans,
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

  describe('getTraceErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should hit the Traceview errors endpoint with only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.TRACE_ERROR_NAME, value: 1, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: '', value: 0, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getTraceErrorsTimeline(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_ERRORS_TIMELINE,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await agentService.getTraceErrorsTimeline(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_ERRORS_TIMELINE,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await agentService.getTraceErrorsTimeline(startTime, endTime, { agentId: AGENT_TEST_CONSTANTS.AGENT_ID });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_ERRORS_TIMELINE,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString(), agentId: AGENT_TEST_CONSTANTS.AGENT_ID },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await agentService.getTraceErrorsTimeline(startTime, endTime);
      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        agentService.getTraceErrorsTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTraceLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should hit the Traceview latency endpoint with only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P50, value: 0.194, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P95, value: 8.78, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getTraceLatencyTimeline(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_LATENCY_TIMELINE,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await agentService.getTraceLatencyTimeline(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_LATENCY_TIMELINE,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await agentService.getTraceLatencyTimeline(startTime, endTime);
      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        agentService.getTraceLatencyTimeline(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getTraceUnitConsumption', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should hit the Traceview unit-consumption endpoint with only startTime and endTime when no options are provided', async () => {
      const mockResponse = {
        data: [
          {
            agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
            folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
            agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
            agentUnitsConsumed: AGENT_TEST_CONSTANTS.TRACE_AGENT_UNITS_CONSUMED,
            platformUnitsConsumed: AGENT_TEST_CONSTANTS.TRACE_PLATFORM_UNITS_CONSUMED,
          },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getTraceUnitConsumption(startTime, endTime);

      expect(result.data).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_UNIT_CONSUMPTION,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await agentService.getTraceUnitConsumption(startTime, endTime, {
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_TRACE_UNIT_CONSUMPTION,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should return response with absent data when API returns empty', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await agentService.getTraceUnitConsumption(startTime, endTime);
      expect(result.data).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        agentService.getTraceUnitConsumption(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getSpansByTraceId', () => {
    const mockSpan = {
      id: AGENT_TEST_CONSTANTS.SPAN_ID,
      traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
      parentId: AGENT_TEST_CONSTANTS.PARENT_SPAN_ID,
      name: AGENT_TEST_CONSTANTS.SPAN_NAME,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      attributes: AGENT_TEST_CONSTANTS.SPAN_ATTRIBUTES_JSON,
      status: AGENT_TEST_CONSTANTS.SPAN_STATUS,
      organizationId: AGENT_TEST_CONSTANTS.ORGANIZATION_ID,
      tenantId: null,
      expiryTimeUtc: null,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      source: null,
      spanType: null,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      referenceId: AGENT_TEST_CONSTANTS.REFERENCE_ID,
      verbosityLevel: null,
      updatedAt: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      isLargePayload: false,
      compressionType: null,
      agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
      context: AGENT_TEST_CONSTANTS.SPAN_CONTEXT_JSON,
    };

    it('should hit the spans-by-trace endpoint and return the flat span array', async () => {
      mockApiClient.get.mockResolvedValue([mockSpan]);

      const result = await agentService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

      expect(result).toEqual([mockSpan]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_SPANS_BY_TRACE_ID(AGENT_TEST_CONSTANTS.TRACE_ID),
        expect.any(Object),
      );
    });

    it('should return an empty array when the trace has no spans', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await agentService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        agentService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getSpansByReference', () => {
    const mockSpan = {
      id: AGENT_TEST_CONSTANTS.SPAN_ID,
      traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
      parentId: null,
      name: AGENT_TEST_CONSTANTS.SPAN_NAME,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      attributes: AGENT_TEST_CONSTANTS.SPAN_ATTRIBUTES_JSON,
      status: AGENT_TEST_CONSTANTS.SPAN_STATUS,
      organizationId: AGENT_TEST_CONSTANTS.ORGANIZATION_ID,
      tenantId: null,
      expiryTimeUtc: null,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      source: null,
      spanType: null,
      processKey: null,
      jobKey: null,
      referenceId: AGENT_TEST_CONSTANTS.REFERENCE_ID,
      verbosityLevel: null,
      updatedAt: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      isLargePayload: false,
      compressionType: null,
      agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
      context: AGENT_TEST_CONSTANTS.SPAN_CONTEXT_JSON,
    };

    it('should return a non-paginated response (items + totalCount) when no pagination options are provided', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([mockSpan], 1));

      const result = await agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID);

      expect(result.items).toEqual([mockSpan]);
      expect(result.totalCount).toBe(1);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();

      const [endpoint] = mockApiClient.get.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_SPANS_BY_REFERENCE(AGENT_TEST_CONSTANTS.REFERENCE_ID));
    });

    it('should send pageSize + 0-based pageNumber as query params when pageSize is provided', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0, 0, 25));

      await agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { pageSize: 25 });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.pageSize).toBe(25);
      expect(options.params.pageNumber).toBe(0);
    });

    it('should convert jumpToPage (1-based) to a 0-based pageNumber', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0, 2, 10));

      await agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { jumpToPage: 3, pageSize: 10 });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.pageNumber).toBe(2);
      expect(options.params.pageSize).toBe(10);
    });

    it('should pass hierarchy/time filters as query params without OData prefixing', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0));

      await agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, {
        pageSize: 10,
        traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
        serviceType: AGENT_TEST_CONSTANTS.SPAN_SERVICE_TYPE,
        version: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        startTime: new Date(AGENT_TEST_CONSTANTS.START_TIME),
        endTime: new Date(AGENT_TEST_CONSTANTS.END_TIME),
        executionType: AgentExecutionType.Runtime,
      });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.traceId).toBe(AGENT_TEST_CONSTANTS.TRACE_ID);
      expect(options.params.serviceType).toBe(AGENT_TEST_CONSTANTS.SPAN_SERVICE_TYPE);
      expect(options.params.version).toBe(AGENT_TEST_CONSTANTS.AGENT_VERSION);
      expect(options.params.startTime).toBe(new Date(AGENT_TEST_CONSTANTS.START_TIME).toISOString());
      expect(options.params.endTime).toBe(new Date(AGENT_TEST_CONSTANTS.END_TIME).toISOString());
      expect(options.params.executionType).toBe(AgentExecutionType.Runtime);
      expect(options.params['$traceId']).toBeUndefined();
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope(Array(10).fill(mockSpan), 25, 0, 10));

      const result = await agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(25);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        agentService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
