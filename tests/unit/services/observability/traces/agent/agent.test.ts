// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTracesService } from '../../../../../../src/services/observability/traces/agent/agent';
import { ApiClient } from '../../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../../utils/setup';
import { AGENT_TRACES_ENDPOINTS } from '../../../../../../src/utils/constants/endpoints';
import {
  AgentTraceExecutionType,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
  AgentGovernanceSection,
} from '../../../../../../src/models/observability/traces/agent/agent.types';
import { AGENT_TEST_CONSTANTS } from '../../../../../utils/constants';

// ===== MOCKING =====
vi.mock('../../../../../../src/core/http/api-client');

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

    it('should return an empty array when the API returns no data points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
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

    it('should return an empty array when the API returns no data points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
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

    it('should return an empty array when the API returns no data points', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] });
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

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(traceService.getSpansByTraceId('')).rejects.toThrow('traceId is required');
      expect(mockApiClient.get).not.toHaveBeenCalled();
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

    it('should throw ValidationError when referenceId is empty', async () => {
      await expect(traceService.getSpansByReference('')).rejects.toThrow('referenceId is required');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getGovernanceChecks', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    const buildGovRow = (overrides: Record<string, unknown> = {}) => ({
      tenantId: AGENT_TEST_CONSTANTS.ORGANIZATION_ID,
      startTime: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      endTime: AGENT_TEST_CONSTANTS.JOB_END_TIME,
      traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
      jobKey: AGENT_TEST_CONSTANTS.JOB_KEY,
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      source: '10',
      policyId: AGENT_TEST_CONSTANTS.GOV_POLICY_ID,
      policyName: AGENT_TEST_CONSTANTS.GOV_POLICY_NAME,
      packName: AGENT_TEST_CONSTANTS.GOV_PACK_NAME,
      hook: AGENT_TEST_CONSTANTS.GOV_HOOK,
      mode: 'AUDIT',
      actionApplied: 'ALLOW',
      evaluatorResult: 'ALLOW',
      reason: AGENT_TEST_CONSTANTS.GOV_REASON,
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: AGENT_TEST_CONSTANTS.GOV_AGENT_NAME,
      ...overrides,
    });

    it('should return a non-paginated response with the window in the body and no pagination params', async () => {
      mockApiClient.post.mockResolvedValue({ items: [buildGovRow()] });

      const result = await traceService.getGovernanceChecks(startTime);

      expect(result.items[0].mode).toBe(AgentGovernanceMode.Audit);
      expect(result.items[0].evaluatorResult).toBe(AgentGovernanceVerdict.Allow);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_CHECKS);
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBeUndefined();
      expect(body.pageNumber).toBeUndefined();
      expect(body.pageSize).toBeUndefined();
    });

    it('should normalize mode/verdict/action to enums, mapping unrecognized and null values to Unknown', async () => {
      mockApiClient.post.mockResolvedValue({
        items: [
          buildGovRow({ mode: 'ENFORCE', evaluatorResult: 'DENY', actionApplied: 'ALLOW' }),
          buildGovRow({ mode: 'WEIRD', evaluatorResult: 'BLOCK', actionApplied: null }),
          buildGovRow({ mode: null, evaluatorResult: null, actionApplied: null }),
        ],
      });

      const result = await traceService.getGovernanceChecks(startTime);

      expect(result.items.map((r) => r.mode)).toEqual([
        AgentGovernanceMode.Enforce,
        AgentGovernanceMode.Unknown,
        AgentGovernanceMode.Unknown,
      ]);
      expect(result.items.map((r) => r.evaluatorResult)).toEqual([
        AgentGovernanceVerdict.Deny,
        AgentGovernanceVerdict.Unknown,
        AgentGovernanceVerdict.Unknown,
      ]);
      expect(result.items[1].actionApplied).toBe(AgentGovernanceVerdict.Unknown);
      // Raw label must not leak through.
      expect((result.items[0].mode as string)).not.toBe('enforce');
    });

    it('should send pageSize + 0-based pageNumber in the body when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue({ items: [] });

      await traceService.getGovernanceChecks(startTime, { pageSize: 25 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageSize).toBe(25);
      expect(body.pageNumber).toBe(0);
    });

    it('should infer hasNextPage from page fullness (no total-count field)', async () => {
      mockApiClient.post.mockResolvedValue({ items: [buildGovRow(), buildGovRow()] });

      const full = await traceService.getGovernanceChecks(startTime, { pageSize: 2 });
      expect(full.hasNextPage).toBe(true);
      expect(full.totalCount).toBeUndefined();

      mockApiClient.post.mockResolvedValue({ items: [buildGovRow()] });
      const partial = await traceService.getGovernanceChecks(startTime, { pageSize: 2 });
      expect(partial.hasNextPage).toBe(false);
    });

    it('should send filters in the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue({ items: [] });

      await traceService.getGovernanceChecks(startTime, {
        endTime,
        hook: AGENT_TEST_CONSTANTS.GOV_HOOK,
        evaluatorResult: AgentGovernanceVerdict.Deny,
        policyId: AGENT_TEST_CONSTANTS.GOV_POLICY_ID,
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        violationsOnly: true,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.startTime).toBe(startTime.toISOString());
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.hook).toBe(AGENT_TEST_CONSTANTS.GOV_HOOK);
      expect(body.evaluatorResult).toBe(AgentGovernanceVerdict.Deny);
      expect(body.policyId).toBe(AGENT_TEST_CONSTANTS.GOV_POLICY_ID);
      expect(body.agentId).toBe(AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(body.violationsOnly).toBe(true);
      expect(body['$hook']).toBeUndefined();
    });

    it('should send violationsOnly:false distinct from unset', async () => {
      mockApiClient.post.mockResolvedValue({ items: [] });

      await traceService.getGovernanceChecks(startTime, { violationsOnly: false });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.violationsOnly).toBe(false);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(traceService.getGovernanceChecks(startTime)).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });

  describe('getGovernanceSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    const mockSummary = {
      total: 26,
      violations: 3,
      byHook: [{ key: AGENT_TEST_CONSTANTS.GOV_HOOK, name: null, count: 12, violationCount: 2 }],
      byAgent: [{ key: AGENT_TEST_CONSTANTS.AGENT_ID, name: AGENT_TEST_CONSTANTS.GOV_AGENT_NAME, count: 20, violationCount: 1 }],
      byPolicy: [{ key: AGENT_TEST_CONSTANTS.GOV_POLICY_ID, name: AGENT_TEST_CONSTANTS.GOV_POLICY_NAME, count: 2, violationCount: 0 }],
      byPack: [{ key: AGENT_TEST_CONSTANTS.GOV_PACK_NAME, name: null, count: 26, violationCount: 3 }],
    };

    it('should return the flat summary and send only startTime in the body by default', async () => {
      mockApiClient.post.mockResolvedValue(mockSummary);

      const result = await traceService.getGovernanceSummary(startTime);

      expect(result.total).toBe(26);
      expect(result.violations).toBe(3);
      expect(result.byPolicy[0].key).toBe(AGENT_TEST_CONSTANTS.GOV_POLICY_ID);
      // Opt-in breakdowns absent when not requested.
      expect(result.byAction).toBeUndefined();
      expect(result.byMode).toBeUndefined();

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_SUMMARY);
      expect(body.startTime).toBe(startTime.toISOString());
      expect('endTime' in body).toBe(false);
      expect('topN' in body).toBe(false);
      expect('sections' in body).toBe(false);
    });

    it('should send endTime, topN, packName and sections in the body', async () => {
      mockApiClient.post.mockResolvedValue(mockSummary);

      await traceService.getGovernanceSummary(startTime, {
        endTime,
        topN: 5,
        packName: AGENT_TEST_CONSTANTS.GOV_PACK_NAME,
        sections: [AgentGovernanceSection.Action, AgentGovernanceSection.Mode],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.endTime).toBe(endTime.toISOString());
      expect(body.topN).toBe(5);
      expect(body.packName).toBe(AGENT_TEST_CONSTANTS.GOV_PACK_NAME);
      expect(body.sections).toEqual(['action', 'mode']);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC));

      await expect(traceService.getGovernanceSummary(startTime)).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
