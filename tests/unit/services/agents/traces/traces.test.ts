// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTracesService } from '../../../../../src/services/agents/traces/traces';
import { ApiClient } from '../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../utils/setup';
import { AGENT_TRACES_ENDPOINTS } from '../../../../../src/utils/constants/endpoints';
import { AgentTraceExecutionType } from '../../../../../src/models/agents/traces/traces.types';
import { AGENT_TEST_CONSTANTS } from '../../../../utils/constants';

// ===== MOCKING =====
vi.mock('../../../../../src/core/http/api-client');

// Spans-by-reference envelope: spans under `data`, total count under `pagination.totalCount`.
const buildSpansEnvelope = (spans: unknown[], totalCount: number, pageNumber = 0, pageSize = 10) => ({
  pagination: { totalCount, pageNumber, pageSize },
  data: spans,
});

// ===== TEST SUITE =====
describe('AgentTracesService Unit Tests', () => {
  let traceService: AgentTracesService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as never);
    traceService = new AgentTracesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should send an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await traceService.getErrorsTimeline();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
        {},
        expect.any(Object),
      );
    });

    it('should send startTime and endTime when only the window is provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.TRACE_ERROR_NAME, value: 1, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: '', value: 0, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await traceService.getErrorsTimeline({ startTime, endTime });

      expect(result).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await traceService.getErrorsTimeline({
        startTime,
        endTime,
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentTraceExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should omit undefined options (including the window) from the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await traceService.getErrorsTimeline({ agentId: AGENT_TEST_CONSTANTS.AGENT_ID });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
        { agentId: AGENT_TEST_CONSTANTS.AGENT_ID },
        expect.any(Object),
      );
    });

    it('should return an empty array when API returns no data', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await traceService.getErrorsTimeline();
      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        traceService.getErrorsTimeline(),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should send an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await traceService.getLatencyTimeline();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
        {},
        expect.any(Object),
      );
    });

    it('should send startTime and endTime when only the window is provided', async () => {
      const mockResponse = {
        data: [
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P50, value: 0.194, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
          { name: AGENT_TEST_CONSTANTS.LATENCY_PERCENTILE_P95, value: 8.78, date: AGENT_TEST_CONSTANTS.TIMELINE_DATE },
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await traceService.getLatencyTimeline({ startTime, endTime });

      expect(result).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await traceService.getLatencyTimeline({
        startTime,
        endTime,
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentTraceExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should return an empty array when API returns no data', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await traceService.getLatencyTimeline();
      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        traceService.getLatencyTimeline(),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getUnitConsumption', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should send an empty body when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });

      await traceService.getUnitConsumption();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
        {},
        expect.any(Object),
      );
    });

    it('should send startTime and endTime when only the window is provided', async () => {
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

      const result = await traceService.getUnitConsumption({ startTime, endTime });

      expect(result).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        expect.any(Object),
      );
    });

    it('should send the Traceview-shaped filter fields in the request body', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];

      await traceService.getUnitConsumption({
        startTime,
        endTime,
        folderKeys,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          folderKeys,
          agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
          agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
          executionType: AgentTraceExecutionType.Runtime,
        },
        expect.any(Object),
      );
    });

    it('should return an empty array when API returns no data', async () => {
      mockApiClient.post.mockResolvedValue({});
      const result = await traceService.getUnitConsumption();
      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        traceService.getUnitConsumption(),
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
      expiryTimeUtc: AGENT_TEST_CONSTANTS.SPAN_EXPIRY_TIME,
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

      const result = await traceService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

      // expiryTimeUtc is renamed to the canonical expiredTime
      expect(result[0].id).toBe(AGENT_TEST_CONSTANTS.SPAN_ID);
      expect(result[0].expiredTime).toBe(AGENT_TEST_CONSTANTS.SPAN_EXPIRY_TIME);
      expect((result[0] as { expiryTimeUtc?: unknown }).expiryTimeUtc).toBeUndefined();
      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_TRACE_ID(AGENT_TEST_CONSTANTS.TRACE_ID),
        expect.any(Object),
      );
    });

    it('should return an empty array when the trace has no spans', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await traceService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        traceService.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID),
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
      expiryTimeUtc: AGENT_TEST_CONSTANTS.SPAN_EXPIRY_TIME,
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

      const result = await traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID);

      // expiryTimeUtc is renamed to the canonical expiredTime
      expect(result.items[0].id).toBe(AGENT_TEST_CONSTANTS.SPAN_ID);
      expect(result.items[0].expiredTime).toBe(AGENT_TEST_CONSTANTS.SPAN_EXPIRY_TIME);
      expect((result.items[0] as { expiryTimeUtc?: unknown }).expiryTimeUtc).toBeUndefined();
      expect(result.totalCount).toBe(1);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();

      const [endpoint] = mockApiClient.get.mock.calls[0];
      expect(endpoint).toBe(AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_REFERENCE(AGENT_TEST_CONSTANTS.REFERENCE_ID));
    });

    it('should send pageSize + 0-based pageNumber as query params when pageSize is provided', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0, 0, 25));

      await traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { pageSize: 25 });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.pageSize).toBe(25);
      expect(options.params.pageNumber).toBe(0);
    });

    it('should convert jumpToPage (1-based) to a 0-based pageNumber', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0, 2, 10));

      await traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { jumpToPage: 3, pageSize: 10 });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.pageNumber).toBe(2);
      expect(options.params.pageSize).toBe(10);
    });

    it('should pass hierarchy/time filters as query params without OData prefixing', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope([], 0));

      await traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, {
        pageSize: 10,
        traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
        serviceType: AGENT_TEST_CONSTANTS.SPAN_SERVICE_TYPE,
        version: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        startTime: new Date(AGENT_TEST_CONSTANTS.START_TIME),
        endTime: new Date(AGENT_TEST_CONSTANTS.END_TIME),
        executionType: AgentTraceExecutionType.Runtime,
      });

      const [, options] = mockApiClient.get.mock.calls[0];
      expect(options.params.traceId).toBe(AGENT_TEST_CONSTANTS.TRACE_ID);
      expect(options.params.serviceType).toBe(AGENT_TEST_CONSTANTS.SPAN_SERVICE_TYPE);
      expect(options.params.version).toBe(AGENT_TEST_CONSTANTS.AGENT_VERSION);
      expect(options.params.startTime).toBe(new Date(AGENT_TEST_CONSTANTS.START_TIME).toISOString());
      expect(options.params.endTime).toBe(new Date(AGENT_TEST_CONSTANTS.END_TIME).toISOString());
      expect(options.params.executionType).toBe(AgentTraceExecutionType.Runtime);
      expect(options.params['$traceId']).toBeUndefined();
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.get.mockResolvedValue(buildSpansEnvelope(Array(10).fill(mockSpan), 25, 0, 10));

      const result = await traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(25);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));
      await expect(
        traceService.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
