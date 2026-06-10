import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Traces } from '../../../../src/services/observability/traces';
import {
  SpanGetResponse,
  SpanStatus,
} from '../../../../src/models/observability/traces/traces.types';

const modes: InitMode[] = ['v1'];
const hasTracesIntegration = process.env.TRACES_INTEGRATION === 'true';
const skipTracesIntegrationInCi = process.env.CI === 'true' && !hasTracesIntegration;

describe.skipIf(skipTracesIntegrationInCi).each(modes)('Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let traces!: Traces;
  let existingTraceId!: string;
  let existingSpanId!: string;

  beforeAll(async () => {
    if (!hasTracesIntegration) {
      throw new Error(
        'TRACES_INTEGRATION must be set to run Traces integration tests ' +
        '(requires traces API access and a pre-existing trace ID)'
      );
    }

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
