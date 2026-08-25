import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Traces } from '../../../../src/services/observability/traces';
import {
  SpanGetResponse,
  SpanStatus,
} from '../../../../src/models/observability/traces/traces.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let traces!: Traces;
  let existingTraceId!: string;
  let existingSpanId!: string;

  beforeAll(async () => {
    const services = getServices();
    if (!services.traces) throw new Error('Traces service not available');
    traces = services.traces;

    // Span data expires with the observability retention window, so a fixed trace ID
    // fixture rots over time. Prefer self-discovery: recent Maestro process instances
    // carry a traceId with spans. TRACES_TEST_TRACE_ID remains as an explicit override.
    const candidateTraceIds: string[] = [];
    if (process.env.TRACES_TEST_TRACE_ID) {
      candidateTraceIds.push(process.env.TRACES_TEST_TRACE_ID);
    }
    const instances = await services.processInstances.getAll({ pageSize: 10 });
    for (const instance of instances.items) {
      candidateTraceIds.push(instance.instanceId);
    }

    let spans: SpanGetResponse[] = [];
    for (const traceId of candidateTraceIds) {
      spans = await traces.getById(traceId);
      if (spans.length > 0) {
        existingTraceId = traceId;
        break;
      }
    }

    if (spans.length === 0) {
      throw new Error(
        'No trace with spans found (checked TRACES_TEST_TRACE_ID and recent process ' +
          'instances) — ensure recent trace data exists before running these tests'
      );
    }

    existingSpanId = spans[0].id;
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    let spans!: SpanGetResponse[];

    beforeAll(async () => {
      spans = await traces.getById(existingTraceId);
    });

    it('should retrieve spans for a trace', () => {
      expect(Array.isArray(spans)).toBe(true);
      expect(spans.length).toBeGreaterThan(0);
    });

    it('should return SpanGetResponse objects with required fields', () => {
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

    it('should return camelCase fields — raw PascalCase fields absent', () => {
      const span = spans[0] as SpanGetResponse & Record<string, unknown>;

      expect(span.traceId).toBeDefined();
      expect(span['TraceId']).toBeUndefined();
      expect(span['StartTime']).toBeUndefined();
      expect(span['OrganizationId']).toBeUndefined();
      // ExpiryTimeUtc → expiredTime is the only standard field rename here; verify it against the live API
      expect(span['ExpiryTimeUtc']).toBeUndefined();
    });

    it('should respect pageSize option', async () => {
      const pagedSpans = await traces.getById(existingTraceId, { pageSize: 1 });

      expect(pagedSpans.length).toBeLessThanOrEqual(1);
    });

    it('should map status to a known SpanStatus enum value', () => {
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
    let spansByIds!: SpanGetResponse[];

    beforeAll(async () => {
      spansByIds = await traces.getSpansByIds(existingTraceId, [existingSpanId]);
    });

    it('should retrieve specific spans by span IDs', () => {
      expect(Array.isArray(spansByIds)).toBe(true);
      expect(spansByIds.length).toBeGreaterThan(0);
      expect(spansByIds[0].id).toBe(existingSpanId);
    });

    it('should return camelCase fields — raw PascalCase fields absent', () => {
      const span = spansByIds[0] as SpanGetResponse & Record<string, unknown>;

      expect(span.traceId).toBeDefined();
      expect(span['TraceId']).toBeUndefined();
      expect(span['StartTime']).toBeUndefined();
      expect(span['ExpiryTimeUtc']).toBeUndefined();
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

});
