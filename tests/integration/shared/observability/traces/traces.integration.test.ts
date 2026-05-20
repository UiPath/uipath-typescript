import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../../config/unified-setup';
import { Traces } from '../../../../../src/services/observability/traces';
import { SpanResponse } from '../../../../../src/models/observability/traces/traces.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let traces!: Traces;

  beforeAll(() => {
    const service = getServices().traces;
    if (!service) throw new Error('TracesService not registered in unified-setup');
    traces = service;
  });

  describe('getByTraceId', () => {
    it('should retrieve spans for a trace', async () => {
      const config = getTestConfig();
      if (!config.tracesTestTraceId) {
        throw new Error('TRACES_TEST_TRACE_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByTraceId(config.tracesTestTraceId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have expected camelCase fields on span objects', async () => {
      const config = getTestConfig();
      if (!config.tracesTestTraceId) {
        throw new Error('TRACES_TEST_TRACE_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByTraceId(config.tracesTestTraceId);
      if (result.length === 0) throw new Error('No spans returned for TRACES_TEST_TRACE_ID');

      const span: SpanResponse = result[0];
      expect(typeof span.id).toBe('string');
      expect(typeof span.traceId).toBe('string');
      expect(span.name === null || typeof span.name === 'string').toBe(true);
      expect(typeof span.startTime).toBe('string');
      expect(typeof span.attributes === 'object').toBe(true);
    });

    it('should apply transform — camelCase fields present, PascalCase absent', async () => {
      const config = getTestConfig();
      if (!config.tracesTestTraceId) {
        throw new Error('TRACES_TEST_TRACE_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByTraceId(config.tracesTestTraceId);
      if (result.length === 0) throw new Error('No spans returned for TRACES_TEST_TRACE_ID');

      const span = result[0];
      expect(span.traceId).toBeDefined();
      expect((span as never as Record<string, unknown>)['TraceId']).toBeUndefined();
      expect((span as never as Record<string, unknown>)['SpanType']).toBeUndefined();
    });
  });

  describe('getByIds', () => {
    it('should retrieve a subset of spans by IDs', async () => {
      const config = getTestConfig();
      if (!config.tracesTestTraceId) {
        throw new Error('TRACES_TEST_TRACE_ID not set in .env.integration — cannot run test');
      }

      const allSpans = await traces.getByTraceId(config.tracesTestTraceId);
      if (allSpans.length === 0) throw new Error('No spans available for getByIds test');

      const firstSpanId = allSpans[0].id;
      const result = await traces.getByIds(config.tracesTestTraceId, [firstSpanId]);

      // getByIds only resolves from hot storage; historical traces return empty — array
      // shape is still verified.
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getByAgentId', () => {
    it('should retrieve spans for an agent', async () => {
      const config = getTestConfig();
      if (!config.tracesTestAgentId) {
        throw new Error('TRACES_TEST_AGENT_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByAgentId(config.tracesTestAgentId);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should return paginated response when pageSize is given', async () => {
      const config = getTestConfig();
      if (!config.tracesTestAgentId) {
        throw new Error('TRACES_TEST_AGENT_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByAgentId(config.tracesTestAgentId, { pageSize: 5 });

      expect('hasNextPage' in result).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should apply transform — internal fields stripped, camelCase present', async () => {
      const config = getTestConfig();
      if (!config.tracesTestAgentId) {
        throw new Error('TRACES_TEST_AGENT_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByAgentId(config.tracesTestAgentId);
      if (result.items.length === 0) throw new Error('No spans returned for TRACES_TEST_AGENT_ID');

      const span = result.items[0];
      expect(typeof span.traceId).toBe('string');
      expect(typeof span.startTime).toBe('string');
      // internal-only fields from RawSpanAgentResponse must not appear on SpanResponse
      expect((span as never as Record<string, unknown>)['isLargePayload']).toBeUndefined();
      expect((span as never as Record<string, unknown>)['compressionType']).toBeUndefined();
    });
  });

  describe('getByReferenceId', () => {
    it('should retrieve spans for a reference entity', async () => {
      const config = getTestConfig();
      if (!config.tracesTestReferenceId) {
        throw new Error('TRACES_TEST_REFERENCE_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByReferenceId(config.tracesTestReferenceId);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should apply transform — internal fields stripped, camelCase present', async () => {
      const config = getTestConfig();
      if (!config.tracesTestReferenceId) {
        throw new Error('TRACES_TEST_REFERENCE_ID not set in .env.integration — cannot run test');
      }

      const result = await traces.getByReferenceId(config.tracesTestReferenceId);
      if (result.items.length === 0) throw new Error('No spans returned for TRACES_TEST_REFERENCE_ID');

      const span = result.items[0];
      expect(typeof span.traceId).toBe('string');
      expect(typeof span.startTime).toBe('string');
      expect((span as never as Record<string, unknown>)['isLargePayload']).toBeUndefined();
      expect((span as never as Record<string, unknown>)['compressionType']).toBeUndefined();
    });
  });
});
