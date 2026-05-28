import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Traces } from '../../../../src/services/observability/traces';
import {
  SpanResponse,
  SpanStatus,
  TracesGetByAgentIdOptions,
} from '../../../../src/models/observability/traces/traces.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let traces!: Traces;
  let existingTraceId!: string;
  let existingSpanId!: string;
  let existingAgentId!: string;

  beforeAll(async () => {
    if (!process.env.TRACES_TEST_TRACE_ID) {
      throw new Error('TRACES_TEST_TRACE_ID env var required for Traces integration tests');
    }

    const services = getServices();
    if (!services.traces) throw new Error('Traces service not available');
    traces = services.traces;

    existingTraceId = process.env.TRACES_TEST_TRACE_ID;

    const spans = await traces.getById(existingTraceId);
    if (spans.length === 0) {
      throw new Error(
        `No spans found for traceId ${existingTraceId} — ensure trace data exists before running these tests`
      );
    }

    existingSpanId = spans[0].id;

    const agentSpan = spans.find(s => s.referenceId && s.spanType === 'agentRun');
    if (!agentSpan?.referenceId) {
      throw new Error(
        `No agentRun span found in trace ${existingTraceId} — cannot seed getSpansByAgentId tests (trace must contain a span with spanType 'agentRun')`
      );
    }
    existingAgentId = agentSpan.referenceId;
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should retrieve spans for a trace', async () => {
      const spans = await traces.getById(existingTraceId);

      expect(Array.isArray(spans)).toBe(true);
      expect(spans.length).toBeGreaterThan(0);
    });

    it('should return SpanResponse objects with required fields', async () => {
      const spans = await traces.getById(existingTraceId);
      const span = spans[0];

      expect(span.id).toBeDefined();
      // API normalises traceId to 32-char hex (no dashes) regardless of input format
      expect(typeof span.traceId).toBe('string');
      expect(span.traceId.length).toBeGreaterThan(0);
      expect(span.startTime).toBeDefined();
      expect(span.status).toBeDefined();
      expect(span.organizationId).toBeDefined();
      expect(span.attributes).toBeDefined();
    });

    it('should return camelCase fields — raw PascalCase fields absent', async () => {
      const spans = await traces.getById(existingTraceId);
      const span = spans[0] as SpanResponse & Record<string, unknown>;

      expect(span.traceId).toBeDefined();
      expect(span['TraceId']).toBeUndefined();
      expect(span['StartTime']).toBeUndefined();
      expect(span['OrganizationId']).toBeUndefined();
    });

    it('should respect pageSize option', async () => {
      const spans = await traces.getById(existingTraceId, { pageSize: 1 });

      expect(spans.length).toBeLessThanOrEqual(1);
    });

    it('should map status to a known SpanStatus enum value', async () => {
      const spans = await traces.getById(existingTraceId);
      const validStatuses = Object.values(SpanStatus);

      for (const span of spans) {
        expect(validStatuses).toContain(span.status);
      }
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(traces.getById('')).rejects.toThrow('traceId is required');
    });
  });

  // ─── getSpansByIds ───────────────────────────────────────────────────────────

  describe('getSpansByIds', () => {
    it('should retrieve specific spans by span IDs', async () => {
      const spans = await traces.getSpansByIds(existingTraceId, [existingSpanId]);

      expect(Array.isArray(spans)).toBe(true);
      expect(spans.length).toBeGreaterThan(0);
      expect(spans[0].id).toBe(existingSpanId);
    });

    it('should return camelCase fields — raw PascalCase fields absent', async () => {
      const spans = await traces.getSpansByIds(existingTraceId, [existingSpanId]);
      const span = spans[0] as SpanResponse & Record<string, unknown>;

      expect(span.traceId).toBeDefined();
      expect(span['TraceId']).toBeUndefined();
      expect(span['StartTime']).toBeUndefined();
    });

    it('should return empty array for unknown span IDs', async () => {
      const spans = await traces.getSpansByIds(
        existingTraceId,
        ['00000000-0000-0000-0000-000000000000']
      );

      expect(Array.isArray(spans)).toBe(true);
      expect(spans.length).toBe(0);
    });

    it('should throw ValidationError when traceId is empty', async () => {
      await expect(traces.getSpansByIds('', [existingSpanId])).rejects.toThrow(
        'traceId is required'
      );
    });
  });

  // ─── getSpansByAgentId ───────────────────────────────────────────────────────

  describe('getSpansByAgentId', () => {
    it('should retrieve spans for an agent', async () => {
      const result = await traces.getSpansByAgentId(existingAgentId);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should return SpanResponse objects with required fields', async () => {
      const result = await traces.getSpansByAgentId(existingAgentId, { pageSize: 1 });

      expect(result.items.length).toBeGreaterThan(0);
      const span = result.items[0];

      expect(span.id).toBeDefined();
      expect(span.traceId).toBeDefined();
      expect(span.startTime).toBeDefined();
      expect(span.status).toBeDefined();
      expect(span.organizationId).toBeDefined();
    });

    it('should respect pageSize option', async () => {
      const result = await traces.getSpansByAgentId(existingAgentId, { pageSize: 1 });

      expect(result.items.length).toBeLessThanOrEqual(1);
    });

    it('should support cursor-based pagination', async () => {
      const page1 = await traces.getSpansByAgentId(existingAgentId, { pageSize: 1 });

      if (!page1.hasNextPage) {
        throw new Error(
          `getSpansByAgentId returned only one page for agentId ${existingAgentId} — need at least 2 spans to test pagination`
        );
      }

      const page2Options: TracesGetByAgentIdOptions = { cursor: page1.nextCursor };
      const page2 = await traces.getSpansByAgentId(existingAgentId, page2Options);

      expect(page2.items.length).toBeGreaterThan(0);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });

    it('should support time range filtering', async () => {
      const result = await traces.getSpansByAgentId(existingAgentId, {
        startTime: '2020-01-01T00:00:00Z',
        endTime: new Date().toISOString(),
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should throw ValidationError when agentId is empty', async () => {
      await expect(traces.getSpansByAgentId('')).rejects.toThrow('agentId is required');
    });
  });
});
