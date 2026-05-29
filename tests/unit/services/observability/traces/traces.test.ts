import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TracesService } from '../../../../../src/services/observability/traces/traces';
import { ApiClient } from '../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../utils/setup';
import { TRACES_ENDPOINTS } from '../../../../../src/utils/constants/endpoints';
import { TRACES_TEST_CONSTANTS } from '../../../../utils/constants/traces';
import {
  createMockOtelPageResponse,
  createMockRawOtelSpan,
} from '../../../../utils/mocks/traces';
import {
  SpanStatus,
  SpanSource,
  SpanVerbosityLevel,
  SpanExecutionType,
  SpanPermissionStatus,
  SpanAttachmentProvider,
  SpanAttachmentDirection,
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

  describe('getById', () => {
    it('should return spans for a valid traceId', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse());

      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);

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

      await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID, {
        pageSize: 500,
        agentId: TRACES_TEST_CONSTANTS.AGENT_ID,
        includeExpiredSpans: true,
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

      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
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

    it('should map non-null attachments and context correctly', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockOtelPageResponse([
          createMockRawOtelSpan({
            Attachments: [{ Provider: 1, Id: 'att-id', FileName: 'file.txt', MimeType: 'text/plain', Direction: 2 }],
            Context: {
              ReferenceHierarchy: [{ ServiceType: 'Agent', ReferenceId: 'ref-id', Version: '1.0' }],
            },
          }),
        ])
      );

      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      const span = result[0];

      expect(span.attachments![0].provider).toBe(SpanAttachmentProvider.LLMOps);
      expect(span.attachments![0].direction).toBe(SpanAttachmentDirection.Out);
      expect(span.context!.referenceHierarchy[0].serviceType).toBe('Agent');
      expect(span.context!.referenceHierarchy[0].referenceId).toBe('ref-id');
      // verify PascalCase keys absent from nested context (transform completeness)
      expect((span.context! as never as Record<string, unknown>)['ReferenceHierarchy']).toBeUndefined();
      expect((span.context!.referenceHierarchy[0] as never as Record<string, unknown>)['ServiceType']).toBeUndefined();
    });

    it('should fall back to Orchestrator/None for unknown attachment Provider/Direction', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockOtelPageResponse([
          createMockRawOtelSpan({
            Attachments: [{ Provider: 999, Id: 'att-id', FileName: 'f.txt', MimeType: 'text/plain', Direction: 999 }],
          }),
        ])
      );

      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);

      expect(result[0].attachments![0].provider).toBe(SpanAttachmentProvider.Orchestrator);
      expect(result[0].attachments![0].direction).toBe(SpanAttachmentDirection.None);
    });

    it('should return empty array when no spans', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(tracesService.getById('')).rejects.toThrow('traceId is required');
    });

    it('should fall back to SpanStatus.Unset for unknown Status integer', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([createMockRawOtelSpan({ Status: 999 })]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result[0].status).toBe(SpanStatus.Unset);
    });

    it('should fall back to null for unknown Source integer', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([createMockRawOtelSpan({ Source: 999 })]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result[0].source).toBeNull();
    });

    it('should fall back to null for unknown VerbosityLevel integer', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([createMockRawOtelSpan({ VerbosityLevel: 999 })]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result[0].verbosityLevel).toBeNull();
    });

    it('should fall back to null for unknown ExecutionType integer', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([createMockRawOtelSpan({ ExecutionType: 999 })]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result[0].executionType).toBeNull();
    });

    it('should fall back to null for unknown PermissionStatus integer', async () => {
      mockApiClient.get.mockResolvedValue(createMockOtelPageResponse([createMockRawOtelSpan({ PermissionStatus: 999 })]));
      const result = await tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID);
      expect(result[0].permissionStatus).toBeNull();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND));
      await expect(tracesService.getById(TRACES_TEST_CONSTANTS.TRACE_ID))
        .rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_TRACE_NOT_FOUND);
    });
  });

  describe('getSpansByIds', () => {
    it('should return matching spans for given IDs', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan()]);

      const result = await tracesService.getSpansByIds(
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

      const result = await tracesService.getSpansByIds(
        TRACES_TEST_CONSTANTS.TRACE_ID,
        [TRACES_TEST_CONSTANTS.SPAN_ID_1]
      );

      expect((result[0] as never as Record<string, unknown>)['TraceId']).toBeUndefined();
      expect(result[0].status).toBe(SpanStatus.Error);
      expect(result[0].source).toBe(SpanSource.ProcessOrchestration);
    });

    it('should return empty array for empty spanIds', async () => {
      mockApiClient.post.mockResolvedValue([]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, []);
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(
        tracesService.getSpansByIds('', [TRACES_TEST_CONSTANTS.SPAN_ID_1])
      ).rejects.toThrow('traceId is required');
    });

    it('should fall back to SpanStatus.Unset for unknown Status integer', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ Status: 999 })]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1]);
      expect(result[0].status).toBe(SpanStatus.Unset);
    });

    it('should fall back to null for unknown Source integer', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ Source: 999 })]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1]);
      expect(result[0].source).toBeNull();
    });

    it('should fall back to null for unknown VerbosityLevel integer', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ VerbosityLevel: 999 })]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1]);
      expect(result[0].verbosityLevel).toBeNull();
    });

    it('should fall back to null for unknown ExecutionType integer', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ ExecutionType: 999 })]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1]);
      expect(result[0].executionType).toBeNull();
    });

    it('should fall back to null for unknown PermissionStatus integer', async () => {
      mockApiClient.post.mockResolvedValue([createMockRawOtelSpan({ PermissionStatus: 999 })]);
      const result = await tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1]);
      expect(result[0].permissionStatus).toBeNull();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TRACES_TEST_CONSTANTS.ERROR_SPANS_NOT_FOUND));
      await expect(
        tracesService.getSpansByIds(TRACES_TEST_CONSTANTS.TRACE_ID, [TRACES_TEST_CONSTANTS.SPAN_ID_1])
      ).rejects.toThrow(TRACES_TEST_CONSTANTS.ERROR_SPANS_NOT_FOUND);
    });
  });

});
