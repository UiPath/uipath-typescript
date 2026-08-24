import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Traces } from '../../../../src/services/observability/traces';
import {
  SpanGetResponse,
  SpanStatus,
  TracesGetByIdOptions,
} from '../../../../src/models/observability/traces/traces.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let traces!: Traces;
  let existingTraceId!: string;
  let existingSpanId!: string;
  // Spans in the LLM Ops trace store carry ExpiryTimeUtc and the default query
  // excludes expired ones — a pinned TRACES_TEST_TRACE_ID therefore returns
  // 200 + [] once it ages past its TTL, even though the trace still exists
  // (Traceview on insightsrtm_ keeps serving it). When that happens, fall back
  // to includeExpiredSpans (isHistorical) so the suite keeps verifying response
  // shape instead of failing on retention.
  let usingExpiredSpans = false;
  let getByIdOptions: TracesGetByIdOptions | undefined;

  beforeAll(async () => {
    if (!process.env.TRACES_TEST_TRACE_ID) {
      throw new Error('TRACES_TEST_TRACE_ID env var required for Traces integration tests');
    }

    const services = getServices();
    if (!services.traces) throw new Error('Traces service not available');
    traces = services.traces;

    existingTraceId = process.env.TRACES_TEST_TRACE_ID;

    let spans = await traces.getById(existingTraceId);
    if (spans.length === 0) {
      spans = await traces.getById(existingTraceId, { includeExpiredSpans: true });
      if (spans.length > 0) {
        usingExpiredSpans = true;
        getByIdOptions = { includeExpiredSpans: true };
        console.warn(
          `Spans for TRACES_TEST_TRACE_ID have expired from the live LLM Ops window; ` +
          `running getById tests with includeExpiredSpans. Reseed the tenant with a fresh ` +
          `trace (run the deployed test agent) and update the TRACES_TEST_TRACE_ID secret.`
        );
      }
    }

    if (spans.length === 0) {
      throw new Error(
        `No spans found for traceId ${existingTraceId}, even with includeExpiredSpans — ` +
        `the trace no longer exists in the LLM Ops store. Generate a fresh trace by running ` +
        `the deployed test agent in the test tenant (uip or jobs start), then update the ` +
        `TRACES_TEST_TRACE_ID env value / UIPATH_TRACES_TEST_TRACE_ID secret with its trace id.`
      );
    }

    existingSpanId = spans[0].id;
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    let spans!: SpanGetResponse[];

    beforeAll(async () => {
      spans = await traces.getById(existingTraceId, getByIdOptions);
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
      const pagedSpans = await traces.getById(existingTraceId, { ...getByIdOptions, pageSize: 1 });

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

    // byIds has no includeExpiredSpans switch in the SDK; when the pinned trace
    // has expired out of the live window the backend may legitimately return []
    // here, so skip the span-shape assertions rather than fail on retention.
    const skipIfExpiredAndEmpty = (ctx: { skip: (note?: string) => void }) => {
      if (usingExpiredSpans && spansByIds.length === 0) {
        ctx.skip('pinned trace expired from the live window; byIds returned no spans');
      }
    };

    it('should retrieve specific spans by span IDs', (ctx) => {
      skipIfExpiredAndEmpty(ctx);
      expect(Array.isArray(spansByIds)).toBe(true);
      expect(spansByIds.length).toBeGreaterThan(0);
      expect(spansByIds[0].id).toBe(existingSpanId);
    });

    it('should return camelCase fields — raw PascalCase fields absent', (ctx) => {
      skipIfExpiredAndEmpty(ctx);
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
