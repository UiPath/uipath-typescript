import { describe, it, expect, vi, afterEach } from 'vitest';
import { ExecutionContext } from '@/core/context/execution';
import {
  TRACE_CONTEXT_KEY,
  TraceContextProvider,
  createTraceparent,
  currentTraceContext,
} from '@/core/context/trace';
import { TRACE_CONTEXT_TEST_CONSTANTS } from '@tests/utils/constants/tracing';

const TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

function contextWith(provider: unknown): ExecutionContext {
  const context = new ExecutionContext();
  context.set(TRACE_CONTEXT_KEY, provider);
  return context;
}

describe('currentTraceContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined when no provider is set', () => {
    expect(currentTraceContext(new ExecutionContext())).toBeUndefined();
  });

  it('returns undefined when the stored value is not a function', () => {
    expect(currentTraceContext(contextWith({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID }))).toBeUndefined();
  });

  it('returns undefined while the provider reports no trace', () => {
    expect(currentTraceContext(contextWith(() => undefined))).toBeUndefined();
  });

  it('returns the trace and span ids the provider reports', () => {
    const provider: TraceContextProvider = () => ({
      traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID,
      spanId: TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID,
    });

    expect(currentTraceContext(contextWith(provider))).toEqual({
      traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID,
      spanId: TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID,
    });
  });

  it('asks the provider on every read, so a new active span is picked up', () => {
    let spanId: string = TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID;
    const context = contextWith(() => ({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID, spanId }));

    const first = currentTraceContext(context);
    spanId = TRACE_CONTEXT_TEST_CONSTANTS.OTHER_SPAN_ID;
    const second = currentTraceContext(context);

    expect(first?.spanId).toBe(TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID);
    expect(second?.spanId).toBe(TRACE_CONTEXT_TEST_CONSTANTS.OTHER_SPAN_ID);
  });

  it('returns the trace id alone when the provider reports no span', () => {
    const provider: TraceContextProvider = () => ({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID });

    expect(currentTraceContext(contextWith(provider))).toEqual({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID });
  });

  it.each([
    ['all zero', TRACE_CONTEXT_TEST_CONSTANTS.ZERO_TRACE_ID],
    ['uppercase', TRACE_CONTEXT_TEST_CONSTANTS.UPPERCASE_TRACE_ID],
    ['too short', TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID],
  ])('returns undefined for a trace id that is %s', (_label, traceId) => {
    expect(currentTraceContext(contextWith(() => ({ traceId })))).toBeUndefined();
  });

  it.each([
    ['all zero', TRACE_CONTEXT_TEST_CONSTANTS.ZERO_SPAN_ID],
    ['too short', TRACE_CONTEXT_TEST_CONSTANTS.SHORT_SPAN_ID],
  ])('keeps the trace id and drops a span id that is %s', (_label, spanId) => {
    const context = contextWith(() => ({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID, spanId }));

    expect(currentTraceContext(context)).toEqual({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID });
  });

  it('returns undefined and warns when the provider throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const context = contextWith(() => {
      throw new Error(TRACE_CONTEXT_TEST_CONSTANTS.PROVIDER_ERROR_MESSAGE);
    });

    expect(currentTraceContext(context)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('trace context'), expect.any(Error));
  });
});

describe('createTraceparent', () => {
  it('builds a random W3C traceparent without a trace context', () => {
    const value = createTraceparent();

    expect(value).toMatch(TRACEPARENT_REGEX);
    expect(createTraceparent()).not.toBe(value);
  });

  it('uses the trace and span ids of the trace context', () => {
    const value = createTraceparent({
      traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID,
      spanId: TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID,
    });

    expect(value).toBe(`00-${TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID}-${TRACE_CONTEXT_TEST_CONSTANTS.SPAN_ID}-01`);
  });

  it('keeps the trace id and fills a random span id when the context has no span', () => {
    const value = createTraceparent({ traceId: TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID });

    expect(value).toMatch(TRACEPARENT_REGEX);
    expect(value.split('-')[1]).toBe(TRACE_CONTEXT_TEST_CONSTANTS.TRACE_ID);
  });
});
