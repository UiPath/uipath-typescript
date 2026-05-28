import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTrack, createTrackEvent } from '../src/track';
import type { TelemetryClient } from '../src/client';

interface FakeClient {
    track: ReturnType<typeof vi.fn>;
    getDefaultEventName: ReturnType<typeof vi.fn>;
}

/**
 * `createTrack` and `createTrackEvent` only depend on the
 * `track(eventName, name?, attributes?)` and `getDefaultEventName()`
 * methods of `TelemetryClient`. We give them a minimal stub instead of
 * spinning up the real OpenTelemetry pipeline — that's covered by
 * `client.test.ts`.
 */
function makeClient(defaultEventName = 'Default.Run'): {
    client: TelemetryClient;
    fake: FakeClient;
} {
    const fake: FakeClient = {
        track: vi.fn(),
        getDefaultEventName: vi.fn(() => defaultEventName),
    };
    return { client: fake as unknown as TelemetryClient, fake };
}

// Module-scoped helpers used by the function-wrapper tests below. Defined
// here (rather than inside each `it`) to satisfy
// `unicorn/consistent-function-scoping` and to make the wrapper-form tests
// read like real consumer code.
function multiply(a: number, b: number): number {
    return a * b;
}

// Empty body — fixture only exists so the wrapper can read its `name` and
// fall back to it (`'namedFn'`) for telemetry attribution.
function namedFn(): void {
    /* fixture: intentionally empty */
}

// Empty body — fixture only exists so the wrapper can detect the missing
// `name` and fall back to `'unknown_function'`.
const anonFn = function () {
    /* fixture: intentionally empty */
};
Object.defineProperty(anonFn, 'name', { value: '' });

describe('createTrack — method decorator', () => {
    let client: TelemetryClient;
    let fake: FakeClient;

    beforeEach(() => {
        ({ client, fake } = makeClient());
    });

    it('calls client.track with the supplied event name and the original method runs', () => {
        const track = createTrack(client);

        class Service {
            @track('Tasks.Create')
            public create(value: number): number {
                return value * 2;
            }
        }

        const result = new Service().create(21);

        expect(result).toBe(42);
        expect(fake.track).toHaveBeenCalledTimes(1);
        expect(fake.track).toHaveBeenCalledWith('Tasks.Create', 'Default.Run', undefined);
    });

    it('falls back to the property key when no name string is given', () => {
        const track = createTrack(client);

        class Service {
            @track()
            public someMethod(): string {
                return 'ok';
            }
        }

        new Service().someMethod();

        expect(fake.track).toHaveBeenCalledWith('someMethod', 'Default.Run', undefined);
    });

    it('passes through extra attributes from TrackOptions', () => {
        const track = createTrack(client);

        class Service {
            @track('Tasks.Create', { attributes: { Source: 'unit-test' } })
            public create(): void {
                /* fixture: only the decorator side effect matters */
            }
        }

        new Service().create();

        expect(fake.track).toHaveBeenCalledWith('Tasks.Create', 'Default.Run', {
            Source: 'unit-test',
        });
    });

    it('does not call client.track when condition is the static literal false, but still runs the method', () => {
        const track = createTrack(client);
        const ran = vi.fn(() => 'result');

        class Service {
            @track('Tasks.Create', { condition: false })
            public create(): string {
                return ran();
            }
        }

        const result = new Service().create();

        expect(result).toBe('result');
        expect(ran).toHaveBeenCalledTimes(1);
        expect(fake.track).not.toHaveBeenCalled();
    });

    it('calls client.track when condition is the static literal true', () => {
        const track = createTrack(client);

        class Service {
            @track('Tasks.Create', { condition: true })
            public create(): void {
                /* fixture: only the decorator side effect matters */
            }
        }

        new Service().create();

        expect(fake.track).toHaveBeenCalledTimes(1);
        expect(fake.track).toHaveBeenCalledWith('Tasks.Create', 'Default.Run', undefined);
    });

    it('evaluates a condition callback against the call args', () => {
        const track = createTrack(client);
        const condition = vi.fn((value: number) => value > 10);

        class Service {
            // The cast to `(...args: unknown[]) => boolean` matches the
            // public `TrackOptions.condition` signature; the callback
            // sees the runtime args as expected.
            @track('Tasks.Create', { condition: condition as unknown as (...args: unknown[]) => boolean })
            public create(_value: number): void {
                /* fixture: only the decorator side effect matters */
            }
        }

        const svc = new Service();
        svc.create(5);
        svc.create(50);

        expect(condition).toHaveBeenCalledTimes(2);
        expect(condition).toHaveBeenNthCalledWith(1, 5);
        expect(condition).toHaveBeenNthCalledWith(2, 50);
        expect(fake.track).toHaveBeenCalledTimes(1); // only the second call qualified
    });

    it('always tracks when no condition is set', () => {
        const track = createTrack(client);

        class Service {
            @track('Tasks.Create')
            public create(): void {
                /* fixture: only the decorator side effect matters */
            }
        }

        const svc = new Service();
        svc.create();
        svc.create();
        svc.create();

        expect(fake.track).toHaveBeenCalledTimes(3);
    });

    it('preserves `this` so the wrapped method still sees the instance', () => {
        const track = createTrack(client);

        class Service {
            public count = 0;

            @track('Tasks.Increment')
            public bump(): number {
                this.count += 1;
                return this.count;
            }
        }

        const svc = new Service();
        svc.bump();
        svc.bump();

        expect(svc.count).toBe(2);
    });

    it('uses the client.getDefaultEventName() return value as the display name', () => {
        ({ client, fake } = makeClient('Sdk.Run'));
        const track = createTrack(client);

        class Service {
            @track('Tasks.Create')
            public create(): void {
                /* fixture: only the decorator side effect matters */
            }
        }

        new Service().create();

        expect(fake.getDefaultEventName).toHaveBeenCalled();
        expect(fake.track).toHaveBeenCalledWith('Tasks.Create', 'Sdk.Run', undefined);
    });
});

describe('createTrack — function wrapper form', () => {
    it('wraps a free function and tracks each invocation', () => {
        const { client, fake } = makeClient();
        const track = createTrack(client);

        const tracked = track('Math.Multiply')(multiply);

        const result = tracked(3, 4);

        expect(result).toBe(12);
        expect(fake.track).toHaveBeenCalledTimes(1);
        expect(fake.track).toHaveBeenCalledWith('Math.Multiply', 'Default.Run', undefined);
    });

    it('falls back to the function name when no name string is given', () => {
        const { client, fake } = makeClient();
        const track = createTrack(client);

        const tracked = track()(namedFn);
        tracked();

        expect(fake.track).toHaveBeenCalledWith('namedFn', 'Default.Run', undefined);
    });

    it('uses "unknown_function" as the fallback for an anonymous function with no name', () => {
        const { client, fake } = makeClient();
        const track = createTrack(client);

        const tracked = track()(anonFn);
        tracked();

        expect(fake.track).toHaveBeenCalledWith('unknown_function', 'Default.Run', undefined);
    });

    it('respects condition when used as a function wrapper', () => {
        const { client, fake } = makeClient();
        const track = createTrack(client);

        const tracked = track('Math.Multiply', { condition: false })(
            (a: number, b: number) => a * b
        );

        const result = tracked(3, 4);

        expect(result).toBe(12);
        expect(fake.track).not.toHaveBeenCalled();
    });
});

describe('createTrackEvent', () => {
    it('delegates to client.track with the supplied arguments', () => {
        const { client, fake } = makeClient();
        const trackEvent = createTrackEvent(client);

        trackEvent('Sdk.Auth', 'Sdk.Run', { Source: 'login' });

        expect(fake.track).toHaveBeenCalledTimes(1);
        expect(fake.track).toHaveBeenCalledWith('Sdk.Auth', 'Sdk.Run', { Source: 'login' });
    });

    it('passes undefined for omitted name and attributes', () => {
        const { client, fake } = makeClient();
        const trackEvent = createTrackEvent(client);

        trackEvent('Sdk.Auth');

        expect(fake.track).toHaveBeenCalledWith('Sdk.Auth', undefined, undefined);
    });

    it('produces independent functions per client instance', () => {
        const a = makeClient();
        const b = makeClient();

        const trackA = createTrackEvent(a.client);
        const trackB = createTrackEvent(b.client);

        trackA('A.Event');
        trackB('B.Event');

        expect(a.fake.track).toHaveBeenCalledWith('A.Event', undefined, undefined);
        expect(a.fake.track).not.toHaveBeenCalledWith('B.Event', undefined, undefined);
        expect(b.fake.track).toHaveBeenCalledWith('B.Event', undefined, undefined);
        expect(b.fake.track).not.toHaveBeenCalledWith('A.Event', undefined, undefined);
    });
});
