import { hostCapability } from '../../core/host/host';
import { isRecord } from '../object';

type TracedMethod = (this: unknown, ...args: unknown[]) => unknown;

type AnyMethod<This> = (this: This, ...args: never[]) => unknown;

type CallStatus = 'ok' | 'error';

interface DecoratorContext {
  kind: string;
  name: string | symbol;
}

interface TracingCapability {
  activeSpan(): unknown;
  withActiveSpan(span: { spanId: string }, fn: () => unknown): unknown;
  recordSpan(span: TraceSpan): unknown;
  callerLocals?: unknown;
}

interface TraceSpan {
  id: string;
  parentId: string | undefined;
  kind: 'marker' | 'call';
  label: string;
  values: unknown;
  locals?: unknown;
  stack: string | undefined;
  startTime: string;
  endTime: string;
  status: CallStatus;
}

interface CallSpan {
  tracing: TracingCapability;
  id: string;
  parentId: string | undefined;
  stack: string | undefined;
  startTime: string;
}

function isMethod(value: unknown): value is TracedMethod {
  return typeof value === 'function';
}

function isDecoratorContext(value: unknown): value is DecoratorContext {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    (typeof value.name === 'string' || typeof value.name === 'symbol')
  );
}

function isMethodDescriptor(value: unknown): value is PropertyDescriptor & { value: TracedMethod } {
  return isRecord(value) && typeof value.value === 'function';
}

function isTracingCapability(value: unknown): value is TracingCapability {
  return (
    isRecord(value) &&
    typeof value.activeSpan === 'function' &&
    typeof value.withActiveSpan === 'function' &&
    typeof value.recordSpan === 'function'
  );
}

function hostTracing(): TracingCapability | undefined {
  const tracing = hostCapability('tracing', 1);
  return isTracingCapability(tracing) ? tracing : undefined;
}

function captureStack(above: (...args: never[]) => unknown): string | undefined {
  const holder: { stack?: string } = {};
  Error.captureStackTrace?.(holder, above);
  return holder.stack;
}

function activeSpanId(tracing: TracingCapability): string | undefined {
  const span = tracing.activeSpan();
  return isRecord(span) && typeof span.spanId === 'string' ? span.spanId : undefined;
}

function startCallSpan(traced: TracedMethod): CallSpan | undefined {
  const tracing = hostTracing();
  if (!tracing) {
    return undefined;
  }

  try {
    return {
      tracing,
      id: crypto.randomUUID(),
      parentId: activeSpanId(tracing),
      stack: captureStack(traced),
      startTime: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[UiPath SDK] The call could not be traced:', error);
    return undefined;
  }
}

function reportCall(span: CallSpan | undefined, label: string, values: object, status: CallStatus): void {
  if (!span) {
    console.debug(`trace ${label}`, values);
    return;
  }

  const { tracing, id, parentId, stack, startTime } = span;

  try {
    tracing.recordSpan({
      id,
      parentId,
      kind: 'call',
      label,
      values,
      stack,
      startTime,
      endTime: new Date().toISOString(),
      status,
    });
  } catch (error) {
    console.warn('[UiPath SDK] The host could not record the call:', error);
  }
}

function traceCalls(method: TracedMethod, label: string): TracedMethod {
  const traced = function (this: unknown, ...args: unknown[]): unknown {
    const span = startCallSpan(traced);
    const call = (): unknown => method.apply(this, args);

    let result: unknown;

    try {
      result = span ? span.tracing.withActiveSpan({ spanId: span.id }, call) : call();
    } catch (error) {
      reportCall(span, label, { args, error }, 'error');
      throw error;
    }

    if (result instanceof Promise) {
      result.then(
        (value: unknown) => reportCall(span, label, { args, result: value }, 'ok'),
        (error: unknown) => reportCall(span, label, { args, error }, 'error'),
      );
      return result;
    }

    reportCall(span, label, { args, result }, 'ok');
    return result;
  };

  return traced;
}

function warnUntraced(name: string | symbol, kind: string): void {
  console.warn(`[UiPath SDK] @trace applies to class methods only; ${String(name)} (${kind}) is left untraced.`);
}

/**
 * Records a point in your code, with optional named values, so you can inspect it without a breakpoint.
 *
 * When tracing is available, such as in a UiPath coded function, the marker is added to the trace. Otherwise it is
 * printed with `console.debug`. `trace` never throws.
 *
 * A marker can include the values you pass and the local variables of the calling function, so do not trace secrets
 * or personal data.
 *
 * @param label - A short name for this point in the code
 * @param values - Named values to record with the marker
 * @example
 * ```typescript
 * import { trace } from '@uipath/uipath-typescript/core';
 *
 * trace('after-total', { orderId: '<orderId>', total });
 * ```
 */
export function trace(label: string, values?: Record<string, unknown>): void;
/**
 * Records every call of a class method, with its arguments and its result or error. Apply it without parentheses.
 *
 * When tracing is available, each call is added to the trace, and markers recorded during the call appear under it.
 * Otherwise each call is printed with `console.debug`. The method behaves exactly as before.
 *
 * Arguments and results are recorded in full, so do not decorate methods that handle secrets or personal data.
 *
 * @typeParam This - The class the method belongs to
 * @typeParam Method - The type of the decorated method
 * @param method - The decorated method
 * @param context - The decorator context for the method
 * @returns The method, wrapped so that each call is recorded
 * @example
 * ```typescript
 * import { trace } from '@uipath/uipath-typescript/core';
 *
 * class ApprovalPolicy {
 *   @trace
 *   approve(total: number): boolean {
 *     return total <= 1000;
 *   }
 * }
 * ```
 */
export function trace<This, Method extends AnyMethod<This>>(
  method: Method,
  context: ClassMethodDecoratorContext<This>,
): Method;
/**
 * The same method decorator, for projects compiled with `experimentalDecorators`.
 *
 * @typeParam T - The type of the decorated method
 * @param target - The class, or its prototype, that declares the method
 * @param propertyKey - The name of the decorated method
 * @param descriptor - The property descriptor of the decorated method
 * @returns The descriptor, with the method wrapped so that each call is recorded
 */
export function trace<T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function trace(...args: unknown[]): unknown {
  const [first, second, third] = args;

  if (typeof first === 'string') {
    const tracing = hostTracing();
    if (!tracing) {
      console.debug(`trace ${first}`, second ?? {});
      return undefined;
    }

    try {
      const locals = typeof tracing.callerLocals === 'function' ? tracing.callerLocals() : undefined;
      const time = new Date().toISOString();
      tracing.recordSpan({
        id: crypto.randomUUID(),
        parentId: activeSpanId(tracing),
        kind: 'marker',
        label: first,
        values: second,
        locals,
        stack: captureStack(trace),
        startTime: time,
        endTime: time,
        status: 'ok',
      });
    } catch (error) {
      console.warn('[UiPath SDK] The host could not record the marker:', error);
    }

    return undefined;
  }

  if (args.length === 0) {
    return trace;
  }

  if (isDecoratorContext(second)) {
    if (second.kind === 'method' && isMethod(first)) {
      return traceCalls(first, String(second.name));
    }

    warnUntraced(second.name, second.kind);
    return undefined;
  }

  if (typeof second === 'string' || typeof second === 'symbol') {
    if (isMethodDescriptor(third)) {
      return { ...third, value: traceCalls(third.value, String(second)) };
    }

    warnUntraced(second, 'not a method');
    return undefined;
  }

  return undefined;
}
