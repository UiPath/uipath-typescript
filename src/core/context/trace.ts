import { isRecord } from '@/utils/object';
import type { ExecutionContext } from './execution';

/**
 * Context key under which a {@link TraceContextProvider} is stored. Nothing sets it until the app
 * opts into session tracing, so calls keep their own one-off trace ids by default.
 */
export const TRACE_CONTEXT_KEY = 'traceContext';

/** The trace an SDK call joins: the session's trace and, when there is one, the span the call sits under. */
export interface TraceContext {
  /** Trace id of the session: 32 lowercase hex characters, not all zero. */
  traceId: string;
  /** Span calls made now sit under: 16 lowercase hex characters, not all zero. */
  spanId?: string;
}

/**
 * Answers the trace context at the moment a call is made, or undefined while nothing is traced.
 * Called once per request, so the active span may change between calls.
 */
export type TraceContextProvider = () => TraceContext | undefined;

const TRACE_ID_REGEX = /^(?!0{32}$)[0-9a-f]{32}$/;
const SPAN_ID_REGEX = /^(?!0{16}$)[0-9a-f]{16}$/;

/**
 * Reads the current trace context from the provider in the execution context. Returns undefined
 * when no provider is set, the provider throws, or its trace id is not a valid W3C trace id, so a
 * faulty provider never fails a request. An invalid span id is dropped and the trace id kept.
 */
export function currentTraceContext(context: Pick<ExecutionContext, 'get'>): TraceContext | undefined {
  const provider = context.get<unknown>(TRACE_CONTEXT_KEY);
  if (typeof provider !== 'function') return undefined;

  let trace: unknown;
  try {
    trace = provider();
  } catch (error) {
    console.warn('[UiPath SDK] The trace context could not be read:', error);
    return undefined;
  }

  if (!isRecord(trace) || typeof trace.traceId !== 'string' || !TRACE_ID_REGEX.test(trace.traceId)) {
    return undefined;
  }
  const spanId = typeof trace.spanId === 'string' && SPAN_ID_REGEX.test(trace.spanId) ? trace.spanId : undefined;
  return spanId ? { traceId: trace.traceId, spanId } : { traceId: trace.traceId };
}

/**
 * Builds a W3C `traceparent` value. Without a trace context, or for the part it lacks, a random
 * id is used, so an untraced call still carries a well-formed value.
 */
export function createTraceparent(trace?: TraceContext): string {
  const traceId = trace?.traceId ?? randomHex(32);
  const spanId = trace?.spanId ?? randomHex(16);
  return `00-${traceId}-${spanId}-01`;
}

function randomHex(length: number): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length);
}
