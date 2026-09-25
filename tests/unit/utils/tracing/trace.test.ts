import { AsyncLocalStorage } from 'node:async_hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trace } from '../../../../src/utils/tracing/trace';
import { GUID_REGEX } from '../../../../src/utils/validation/guid';
import { TRACE_TEST_CONSTANTS } from '../../../utils/constants/tracing';

const HOST_KEY = Symbol.for(TRACE_TEST_CONSTANTS.HOST_KEY);

type RecordedSpan = Record<string, unknown>;

interface SpanRef {
  spanId: string;
}

interface Policy {
  limit: number;
}

function createTracing() {
  const active = new AsyncLocalStorage<string>();
  const spans: RecordedSpan[] = [];

  const tracing = {
    activeSpan: vi.fn((): SpanRef | undefined => {
      const spanId = active.getStore();
      return spanId ? { spanId } : undefined;
    }),
    withActiveSpan: vi.fn((span: SpanRef, fn: () => unknown) => active.run(span.spanId, fn)),
    recordSpan: vi.fn((span: RecordedSpan) => {
      spans.push(span);
    }),
    callerLocals: vi.fn((): unknown => ({ [TRACE_TEST_CONSTANTS.LOCAL_NAME]: TRACE_TEST_CONSTANTS.LOCAL_VALUE })),
  };

  const inRun = <T>(fn: () => T): T => active.run(TRACE_TEST_CONSTANTS.PARENT_SPAN_ID, fn);

  return { tracing, spans, inRun };
}

let host: ReturnType<typeof createTracing>;

function installHost(tracing: object = host.tracing): void {
  Reflect.set(globalThis, HOST_KEY, {
    capability: (name: string, major: number) =>
      name === TRACE_TEST_CONSTANTS.CAPABILITY && major === TRACE_TEST_CONSTANTS.CAPABILITY_MAJOR ? tracing : undefined,
  });
}

function approveWithinLimit(this: Policy, total: number): boolean {
  return total <= this.limit;
}

function firstFrame(stack: unknown): string {
  return typeof stack === 'string' ? (stack.split('\n')[1] ?? '') : '';
}

function methodContext<This, Value extends (this: This, ...args: never[]) => unknown>(
  name: string,
  method: Value,
): ClassMethodDecoratorContext<This, Value> {
  return {
    kind: 'method',
    name,
    static: false,
    private: false,
    access: { has: () => true, get: () => method },
    addInitializer: () => {},
    metadata: {},
  };
}

function hostError(): Error {
  return new Error(TRACE_TEST_CONSTANTS.HOST_ERROR_MESSAGE);
}

beforeEach(() => {
  host = createTracing();
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, HOST_KEY);
  vi.restoreAllMocks();
});

describe('trace', () => {
  describe('as a marker', () => {
    it('prints the label and values, or an empty bag, with console.debug when no host is installed', () => {
      const values = { orderId: TRACE_TEST_CONSTANTS.ORDER_ID };

      trace(TRACE_TEST_CONSTANTS.LABEL, values);
      trace(TRACE_TEST_CONSTANTS.LABEL);

      expect(console.debug).toHaveBeenNthCalledWith(1, `trace ${TRACE_TEST_CONSTANTS.LABEL}`, values);
      expect(console.debug).toHaveBeenNthCalledWith(2, `trace ${TRACE_TEST_CONSTANTS.LABEL}`, {});
    });

    it('prints when the host serves no tracing capability, or one of the wrong shape', () => {
      Reflect.set(globalThis, HOST_KEY, { capability: () => undefined });
      trace(TRACE_TEST_CONSTANTS.LABEL);
      installHost({ activeSpan: host.tracing.activeSpan, withActiveSpan: host.tracing.withActiveSpan });
      trace(TRACE_TEST_CONSTANTS.LABEL);

      expect(console.debug).toHaveBeenCalledTimes(2);
    });

    it('records the marker as a span with the host instead of printing it', () => {
      installHost();
      const values = { orderId: TRACE_TEST_CONSTANTS.ORDER_ID, total: TRACE_TEST_CONSTANTS.TOTAL };

      trace(TRACE_TEST_CONSTANTS.LABEL, values);

      expect(host.spans).toEqual([
        {
          id: expect.stringMatching(GUID_REGEX),
          kind: 'marker',
          label: TRACE_TEST_CONSTANTS.LABEL,
          values,
          locals: { [TRACE_TEST_CONSTANTS.LOCAL_NAME]: TRACE_TEST_CONSTANTS.LOCAL_VALUE },
          stack: expect.any(String),
          startTime: expect.any(String),
          endTime: expect.any(String),
          status: 'ok',
        },
      ]);
      expect(host.spans[0].values).toBe(values);
      expect(host.spans[0].startTime).toBe(host.spans[0].endTime);
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('parents the marker under the span the host reports as active', () => {
      installHost();

      host.inRun(() => trace(TRACE_TEST_CONSTANTS.LABEL));

      expect(host.spans[0].parentId).toBe(TRACE_TEST_CONSTANTS.PARENT_SPAN_ID);
    });

    it('passes a stack that starts at the caller', () => {
      installHost();
      function placeOrder(): void {
        trace(TRACE_TEST_CONSTANTS.LABEL);
      }

      placeOrder();

      expect(firstFrame(host.spans[0].stack)).toContain('placeOrder');
    });

    it('asks the host for locals straight from trace(), so the caller is the frame right above it', () => {
      let frames: string[] = [];
      installHost({
        ...host.tracing,
        callerLocals: () => {
          frames = new Error().stack?.split('\n') ?? [];
          return {};
        },
      });
      function checkout(): void {
        trace(TRACE_TEST_CONSTANTS.LABEL);
      }

      checkout();

      expect(frames[2]).toContain('utils/tracing/trace.ts');
      expect(frames[3]).toContain('checkout');
    });

    it('records the marker without locals from a host that offers none', () => {
      const { callerLocals: _unused, ...withoutLocals } = host.tracing;
      installHost(withoutLocals);

      trace(TRACE_TEST_CONSTANTS.LABEL);

      expect(host.spans[0].locals).toBeUndefined();
    });

    it.each(['callerLocals', 'activeSpan', 'recordSpan'] as const)(
      'drops the marker and warns, never throwing, when the host fails in %s',
      (member) => {
        host.tracing[member].mockImplementation(() => {
          throw hostError();
        });
        installHost();

        expect(() => trace(TRACE_TEST_CONSTANTS.LABEL)).not.toThrow();
        expect(host.spans).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('could not record the marker'), expect.any(Error));
      },
    );
  });

  describe('as a method decorator', () => {
    it('records each call as a span with its arguments and result, keeping the receiver', () => {
      installHost();
      class ApprovalPolicy {
        limit = TRACE_TEST_CONSTANTS.LIMIT;

        @trace
        approve(total: number): boolean {
          return total <= this.limit;
        }
      }

      const approved = new ApprovalPolicy().approve(TRACE_TEST_CONSTANTS.TOTAL);

      expect(approved).toBe(true);
      expect(host.spans).toEqual([
        {
          id: expect.stringMatching(GUID_REGEX),
          kind: 'call',
          label: TRACE_TEST_CONSTANTS.METHOD_NAME,
          values: { args: [TRACE_TEST_CONSTANTS.TOTAL], result: true },
          stack: expect.any(String),
          startTime: expect.any(String),
          endTime: expect.any(String),
          status: 'ok',
        },
      ]);
    });

    it('awaits an async method and times the whole call', async () => {
      installHost();
      class ApprovalPolicy {
        @trace
        async approve(total: number): Promise<boolean> {
          await new Promise((resolve) => setTimeout(resolve, TRACE_TEST_CONSTANTS.ASYNC_DELAY_MS));
          return total <= TRACE_TEST_CONSTANTS.LIMIT;
        }
      }

      await expect(new ApprovalPolicy().approve(TRACE_TEST_CONSTANTS.TOTAL)).resolves.toBe(true);

      const [span] = host.spans;
      expect(span).toMatchObject({ status: 'ok', values: { result: true } });
      expect(Date.parse(String(span.endTime)) - Date.parse(String(span.startTime))).toBeGreaterThanOrEqual(
        TRACE_TEST_CONSTANTS.ASYNC_DELAY_MS - TRACE_TEST_CONSTANTS.TIMER_TOLERANCE_MS,
      );
    });

    it('records an error status and rethrows the same error when a method throws', () => {
      installHost();
      const failure = new Error(TRACE_TEST_CONSTANTS.CALL_ERROR_MESSAGE);
      class ApprovalPolicy {
        @trace
        approve(): boolean {
          throw failure;
        }
      }

      expect(() => host.inRun(() => new ApprovalPolicy().approve())).toThrow(failure);
      expect(host.spans[0]).toMatchObject({ status: 'error', values: { args: [], error: failure } });
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('records an error status and rejects with the same error when an async method rejects', async () => {
      installHost();
      const failure = new Error(TRACE_TEST_CONSTANTS.CALL_ERROR_MESSAGE);
      class ApprovalPolicy {
        @trace
        async approve(): Promise<boolean> {
          throw failure;
        }
      }

      await expect(host.inRun(() => new ApprovalPolicy().approve())).rejects.toBe(failure);
      expect(host.spans[0]).toMatchObject({ status: 'error', values: { args: [], error: failure } });
    });

    it('prints each call with console.debug when no host is installed', () => {
      class ApprovalPolicy {
        @trace
        approve(total: number): boolean {
          return total <= TRACE_TEST_CONSTANTS.LIMIT;
        }
      }

      new ApprovalPolicy().approve(TRACE_TEST_CONSTANTS.TOTAL);

      expect(console.debug).toHaveBeenCalledWith(`trace ${TRACE_TEST_CONSTANTS.METHOD_NAME}`, {
        args: [TRACE_TEST_CONSTANTS.TOTAL],
        result: true,
      });
    });

    it('points each call span at the code that called the method', () => {
      installHost();
      class ApprovalPolicy {
        @trace
        approve(total: number): boolean {
          return total <= TRACE_TEST_CONSTANTS.LIMIT;
        }
      }
      function review(policy: ApprovalPolicy): boolean {
        return policy.approve(TRACE_TEST_CONSTANTS.TOTAL);
      }

      review(new ApprovalPolicy());

      expect(firstFrame(host.spans[0].stack)).toContain('review');
    });

    it('nests what the method records under its span on a traced run', () => {
      installHost();
      class ApprovalPolicy {
        @trace
        approve(total: number): boolean {
          trace(TRACE_TEST_CONSTANTS.LABEL);
          return total <= TRACE_TEST_CONSTANTS.LIMIT;
        }
      }

      host.inRun(() => new ApprovalPolicy().approve(TRACE_TEST_CONSTANTS.TOTAL));

      const [marker, call] = host.spans;
      expect(call).toMatchObject({ kind: 'call', parentId: TRACE_TEST_CONSTANTS.PARENT_SPAN_ID });
      expect(marker).toMatchObject({ kind: 'marker', parentId: call.id });
      expect(host.tracing.withActiveSpan).toHaveBeenCalledWith({ spanId: call.id }, expect.any(Function));
    });

    it('records a call made outside a traced run without a parent', () => {
      installHost();
      class ApprovalPolicy {
        @trace
        approve(): boolean {
          return true;
        }
      }

      new ApprovalPolicy().approve();

      expect(host.spans[0].parentId).toBeUndefined();
    });

    it('runs the call untraced, and warns, when the host cannot start its span', () => {
      host.tracing.activeSpan.mockImplementation(() => {
        throw hostError();
      });
      installHost();
      const approve = vi.fn(() => true);
      const traced = trace(approve, methodContext(TRACE_TEST_CONSTANTS.METHOD_NAME, approve));

      expect(traced()).toBe(true);
      expect(approve).toHaveBeenCalledOnce();
      expect(host.spans).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('could not be traced'), expect.any(Error));
    });

    it('keeps the result, and warns, when the host cannot record the call', () => {
      host.tracing.recordSpan.mockImplementation(() => {
        throw hostError();
      });
      installHost();
      const approve = vi.fn(() => true);
      const traced = trace(approve, methodContext(TRACE_TEST_CONSTANTS.METHOD_NAME, approve));

      expect(traced()).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('could not record the call'), expect.any(Error));
    });

    it('leaves a field or an accessor untraced, and warns', () => {
      const target = {};
      const accessor: PropertyDescriptor = { get: () => TRACE_TEST_CONSTANTS.LIMIT, configurable: true };

      expect(Reflect.apply(trace, undefined, [target, TRACE_TEST_CONSTANTS.FIELD_NAME, undefined])).toBeUndefined();
      expect(Reflect.apply(trace, undefined, [target, TRACE_TEST_CONSTANTS.FIELD_NAME, accessor])).toBeUndefined();
      expect(console.warn).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(TRACE_TEST_CONSTANTS.FIELD_NAME));
    });

    it('returns the decorator when called with no arguments, so @trace() applies too', () => {
      expect(Reflect.apply(trace, undefined, [])).toBe(trace);
    });
  });

  describe('as a standard decorator', () => {
    it('wraps a method given a standard decorator context', () => {
      installHost();
      const policy: Policy = { limit: TRACE_TEST_CONSTANTS.LIMIT };

      const traced = trace(
        approveWithinLimit,
        methodContext<Policy, typeof approveWithinLimit>(TRACE_TEST_CONSTANTS.METHOD_NAME, approveWithinLimit),
      );

      expect(traced.call(policy, TRACE_TEST_CONSTANTS.TOTAL)).toBe(true);
      expect(host.spans[0]).toMatchObject({
        kind: 'call',
        label: TRACE_TEST_CONSTANTS.METHOD_NAME,
        status: 'ok',
        values: { args: [TRACE_TEST_CONSTANTS.TOTAL], result: true },
      });
    });

    it('leaves a member that is not a method untraced, and warns', () => {
      const fieldContext = { kind: 'field', name: TRACE_TEST_CONSTANTS.FIELD_NAME };

      expect(Reflect.apply(trace, undefined, [undefined, fieldContext])).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(TRACE_TEST_CONSTANTS.FIELD_NAME));
    });
  });
});
