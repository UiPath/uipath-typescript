import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TracesService } from '../../../../../src/services/observability/traces/traces';
import { ApiClient } from '../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../utils/setup';
import { TRACES_ENDPOINTS } from '../../../../../src/utils/constants/endpoints';
import { TRACES_TEST_CONSTANTS } from '../../../../utils/constants/traces';
import {
  createMockOtelPageResponse,
  createMockRawOtelSpan,
  createMockAgentPageResponse,
  createMockRawAgentSpan,
} from '../../../../utils/mocks/traces';
import {
  SpanStatus,
  SpanSource,
  SpanVerbosityLevel,
  SpanExecutionType,
  SpanPermissionStatus,
} from '../../../../../src/models/observability/traces/traces.types';

vi.mock('../../../../../src/core/http/api-client');

describe('TracesService Unit Tests', () => {
  let tracesService: TracesService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as never);
    tracesService = new TracesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getByTraceId', () => {
    it('should return spans for a valid traceId', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse());

      const result = await tracesService.getByTraceId(TRACES_TEST_CONSTANTS.TRACE_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(TRACES_TEST_CONSTANTS.SPAN_ID_1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_TRACE_ID,
        expect.objectContaining({
          params: expect.objectContaining({ traceId: TRACES_TEST_CONSTANTS.TRACE_ID }),
        })
      );
    });

    it('should pass options to query params', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse());

      await tracesService.getByTraceId(TRACES_TEST_CONSTANTS.TRACE_ID, {
        pageSize: 500,
        agentId: TRACES_TEST_CONSTANTS.AGENT_ID,
        isHistorical: true,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_TRACE_ID,
        expect.objectContaining({
          params: expect.objectContaining({
            traceId: TRACES_TEST_CONSTANTS.TRACE_ID,
            pageSize: 500,
            agentId: TRACES_TEST_CONSTANTS.AGENT_ID,
            isHistorical: true,
          }),
        })
      );
    });

    it('should apply explicit field mapping and enum transforms', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockOtelPageResponse([
          createMockRawOtelSpan({ Status: 1, Source: 1, VerbosityLevel: 2, ExecutionType: 0, PermissionStatus: 0 }),
        ])
      );

      const result = await tracesService.getByTraceId(TRACES_TEST_CONSTANTS.TRACE_ID);
      const span = result[0];

      // camelCase applied (PascalCase absent)
      expect(span.traceId).toBe(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect((span as never as Record<string, unknown>)['TraceId']).toBeUndefined();

      // enum transforms
      expect(span.status).toBe(SpanStatus.Ok);
      expect(span.source).toBe(SpanSource.Agents);
      expect(span.verbosityLevel).toBe(SpanVerbosityLevel.Information);
      expect(span.executionType).toBe(SpanExecutionType.Debug);
      expect(span.permissionStatus).toBe(SpanPermissionStatus.Allow);
    });

    it('should return empty array when no spans', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([]));
      const result = await tracesService.getByTraceId(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(tracesService.getByTraceId('')).rejects.toThrow('traceId is required');
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND));
      await expect(tracesService.getByTraceId(TRACES_TEST_CONSTANTS.TRACE_ID))
        .rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND);
    });
  });

  describe('getByIds', () => {
    it('should return matching spans for given IDs', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan()]);

      const result = await tracesService.getByIds(
        TRACES_TEST_CONSTANTS.TRACE_ID,
        [TRACES_TEST_CONSTANTS.SPAN_ID_1]
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.POST_BY_IDS,
        [TRACES_TEST_CONSTANTS.SPAN_ID_1],
        expect.anything()
      );
    });

    it('should apply explicit field mapping and enum transforms', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ Status: 2, Source: 2 })]);

      const result = await tracesService.getByIds(
        TRACES_TEST_CONSTANTS.TRACE_ID,
        [TRACES_TEST_CONSTANTS.SPAN_ID_1]
      );

      expect((result[0] as never as Record<string, unknown>)['TraceId']).toBeUndefined();
      expect(result[0].status).toBe(SpanStatus.Error);
      expect(result[0].source).toBe(SpanSource.ProcessOrchestration);
    });

    it('should return empty array for empty spanIds', async () => {
      mockApiClient.post.mockResolvedValue([]);
      const result = await tracesService.getByIds(TRACES_TEST_CONSTANTS.TRACE_ID, []);
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(
        tracesService.getByIds('', [TRACES_TEST_CONSTANTS.SPAN_ID_1])
      ).rejects.toThrow('traceId is required');
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_SPANS_NOT_FOUND));
      await expect(
        tracesService.getByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1])
      ).rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_SPANS_NOT_FOUND);
    });
  });

  // ─── getByAgentId ────────────────────────────────────────────────────────

  describe('getByAgentId', () => {
    it('should return non-paginated response for valid agentId', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      const result = await tracesService.getByAgentId(TRACES_TEST_CONSTANTS.AGENT_ID);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe(TRACES_TEST_CONSTANTS.SPAN_ID_1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_AGENT_ID(TRACES_TEST_CONSTANTS.AGENT_ID),
        expect.anything()
      );
    });

    it('should return paginated response when pageSize is given', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockAgentPageResponse([createMockRawAgentSpan()], 100, 0, 10)
      );

      const result = await tracesService.getByAgentId(TRACES_TEST_CONSTANTS.AGENT_ID, { pageSize: 10 });

      expect('hasNextPage' in result).toBe(true);
    });

    it('should pass filter options as query params', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      await tracesService.getByAgentId(TRACES_TEST_CONSTANTS.AGENT_ID, {
        startTime: TRACES_TEST_CONSTANTS.START_TIME,
        endTime: TRACES_TEST_CONSTANTS.END_TIME,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_AGENT_ID(TRACES_TEST_CONSTANTS.AGENT_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            startTime: TRACES_TEST_CONSTANTS.START_TIME,
            endTime: TRACES_TEST_CONSTANTS.END_TIME,
          }),
        })
      );
    });

    it('should set fields absent from agent endpoint to null', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      const result = await tracesService.getByAgentId(TRACES_TEST_CONSTANTS.AGENT_ID);
      const span = result.items[0];

      expect(span.executionType).toBeNull();
      expect(span.permissionStatus).toBeNull();
      expect(span.referenceVersion).toBeNull();
      expect(span.context).toBeNull();
      expect(span.attachments).toBeNull();
    });

    it('should throw ValidationError when agentId is empty', async () => {
      await expect(tracesService.getByAgentId('')).rejects.toThrow('agentId is required');
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND));
      await expect(tracesService.getByAgentId(TRACES_TEST_CONSTANTS.AGENT_ID))
        .rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND);
    });
  });

  // ─── getByReferenceId ───────────────────────────────────────────────────────

  describe('getByReferenceId', () => {
    it('should return non-paginated response for valid referenceId', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      const result = await tracesService.getByReferenceId(TRACES_TEST_CONSTANTS.REFERENCE_ID);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_REFERENCE_ID(TRACES_TEST_CONSTANTS.REFERENCE_ID),
        expect.anything()
      );
    });

    it('should return paginated response when pageSize is given', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockAgentPageResponse([createMockRawAgentSpan()], 50, 0, 10)
      );

      const result = await tracesService.getByReferenceId(TRACES_TEST_CONSTANTS.REFERENCE_ID, { pageSize: 10 });

      expect('hasNextPage' in result).toBe(true);
    });

    it('should pass serviceType, version, traceId filter params', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      await tracesService.getByReferenceId(TRACES_TEST_CONSTANTS.REFERENCE_ID, {
        serviceType: 'agent',
        version: '1.0.0',
        traceId: TRACES_TEST_CONSTANTS.TRACE_ID,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TRACES_ENDPOINTS.GET_BY_REFERENCE_ID(TRACES_TEST_CONSTANTS.REFERENCE_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            serviceType: 'agent',
            version: '1.0.0',
            traceId: TRACES_TEST_CONSTANTS.TRACE_ID,
          }),
        })
      );
    });

    it('should set fields absent from agent endpoint to null', async () => {
      mockApiClient.get.mockResolvedValue(createMockAgentPageResponse());

      const result = await tracesService.getByReferenceId(TRACES_TEST_CONSTANTS.REFERENCE_ID);
      const span = result.items[0];

      expect(span.executionType).toBeNull();
      expect(span.permissionStatus).toBeNull();
      expect(span.referenceVersion).toBeNull();
      expect(span.context).toBeNull();
      expect(span.attachments).toBeNull();
    });

    it('should throw ValidationError when referenceId is empty', async () => {
      await expect(tracesService.getByReferenceId('')).rejects.toThrow('referenceId is required');
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND));
      await expect(tracesService.getByReferenceId(TRACES_TEST_CONSTANTS.REFERENCE_ID))
        .rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND);
    });
  });
});
