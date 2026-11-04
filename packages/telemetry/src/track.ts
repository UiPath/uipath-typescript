/**
 * `@track` decorator and `trackEvent` function factories.
 */

import { TelemetryClient } from './client';
import { TelemetryAttributes, TrackOptions } from './types';

type TrackedFunction = (this: unknown, ...args: unknown[]) => unknown;

/**
 * The `track` decorator factory: invoking it with a name (and optional
 * options) returns a value that is both a `MethodDecorator` and a
 * function wrapper, so the same `track('Foo.Bar')` works as
 * `@track('Foo.Bar')` on a method or as `track('Foo.Bar')(myFn)` on a
 * standalone function.
 */
export type Track = (
    nameOrOptions?: string | TrackOptions,
    options?: TrackOptions
) => MethodDecorator & (<F extends TrackedFunction>(target: F) => F);

interface CreateTrackedFunctionArgs {
    client: TelemetryClient;
    nameOrOptions: string | TrackOptions | undefined;
    fallbackName: string;
    opts: TrackOptions;
}

/** `Result` attribute values. */
export const CallResult = {
    SUCCESS: 'Success',
    FAILED: 'Failed',
} as const;

/**
 * `FailureCategory` attribute values: a short fixed list, never error text,
 * so a failed call can be attributed to the customer's app or to UiPath.
 */
export const FailureCategory = {
    AUTH: 'Auth',
    PERMISSION: 'Permission',
    NOT_FOUND: 'NotFound',
    VALIDATION: 'Validation',
    THROTTLED: 'Throttled',
    NETWORK: 'Network',
    SERVICE_ERROR: 'ServiceError',
    UNKNOWN: 'Unknown',
} as const;

const FAILURE_CATEGORY_BY_ERROR_TYPE: Record<string, string> = {
    AuthenticationError: FailureCategory.AUTH,
    AuthorizationError: FailureCategory.PERMISSION,
    NotFoundError: FailureCategory.NOT_FOUND,
    ValidationError: FailureCategory.VALIDATION,
    RateLimitError: FailureCategory.THROTTLED,
    NetworkError: FailureCategory.NETWORK,
    ServerError: FailureCategory.SERVICE_ERROR,
};

interface ErrorLike {
    type?: unknown;
    name?: unknown;
    statusCode?: unknown;
}

function statusCodeOf(error: unknown): number | undefined {
    const code = (error as ErrorLike | null)?.statusCode;
    return typeof code === 'number' ? code : undefined;
}

/**
 * Maps an error to a `FailureCategory`. Duck-typed on the SDK's
 * `UiPathError` shape (`type`, `statusCode`) so this package does not
 * depend on the SDK; falls back to the HTTP status, then `Unknown`.
 */
export function failureCategoryOf(error: unknown): string {
    const e = (error ?? {}) as ErrorLike;
    const type = typeof e.type === 'string' ? e.type : typeof e.name === 'string' ? e.name : '';
    if (type in FAILURE_CATEGORY_BY_ERROR_TYPE) {
        return FAILURE_CATEGORY_BY_ERROR_TYPE[type];
    }
    const status = statusCodeOf(error);
    if (status === 401) return FailureCategory.AUTH;
    if (status === 403) return FailureCategory.PERMISSION;
    if (status === 404) return FailureCategory.NOT_FOUND;
    if (status === 429) return FailureCategory.THROTTLED;
    if (status !== undefined && status >= 500) return FailureCategory.SERVICE_ERROR;
    if (status !== undefined && status >= 400) return FailureCategory.VALIDATION;
    // fetch() rejects with a TypeError when the request never reached the server (CORS, offline, DNS).
    if (error instanceof TypeError) return FailureCategory.NETWORK;
    return FailureCategory.UNKNOWN;
}

function now(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return (
        value !== null &&
        (typeof value === 'object' || typeof value === 'function') &&
        typeof (value as PromiseLike<unknown>).then === 'function'
    );
}

function outcomeAttributes(start: number, error?: unknown): TelemetryAttributes {
    const attributes: TelemetryAttributes = {
        Result: error === undefined ? CallResult.SUCCESS : CallResult.FAILED,
        DurationMs: Math.round(now() - start),
    };
    if (error !== undefined) {
        attributes.FailureCategory = failureCategoryOf(error);
        const status = statusCodeOf(error);
        if (status !== undefined) {
            attributes.HttpStatus = status;
        }
    }
    return attributes;
}

function createTrackedFunction<F extends TrackedFunction>(
    originalFunction: F,
    { client, nameOrOptions, fallbackName, opts }: CreateTrackedFunctionArgs
): F {
    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
        let shouldTrack = true;
        if (opts.condition !== undefined) {
            shouldTrack =
                typeof opts.condition === 'function'
                    ? opts.condition.apply(this, args)
                    : opts.condition;
        }

        if (!shouldTrack) {
            return originalFunction.apply(this, args);
        }

        const serviceMethod =
            typeof nameOrOptions === 'string' ? nameOrOptions : fallbackName;
        // Never throws: a telemetry failure must not change the caller's result or error,
        // or surface as an unhandled rejection from the promise handlers below.
        const emit = (outcome: TelemetryAttributes): void => {
            try {
                client.track(serviceMethod, client.getDefaultEventName(), {
                    ...opts.attributes,
                    ...outcome,
                });
            } catch (error) {
                console.warn('Failed to track telemetry event:', error);
            }
        };

        // The event is emitted once the call settles, so it can carry the
        // call's Result, FailureCategory and DurationMs. The caller gets the
        // original return value (or error) unchanged.
        const start = now();
        let result: unknown;
        try {
            result = originalFunction.apply(this, args);
        } catch (error) {
            emit(outcomeAttributes(start, error ?? new Error('unknown')));
            throw error;
        }

        if (isPromiseLike(result)) {
            result.then(
                () => emit(outcomeAttributes(start)),
                (error: unknown) => emit(outcomeAttributes(start, error ?? new Error('unknown')))
            );
        } else {
            emit(outcomeAttributes(start));
        }
        return result;
    };

    return wrapped as F;
}

/**
 * Factory: returns a `track` decorator bound to a specific
 * `TelemetryClient`. Each consumer creates its own decorator from its own
 * client so events carry that consumer's identity.
 *
 * @example
 * ```ts
 * const sdkClient = new TelemetryClient();
 * sdkClient.initialize({ ... });
 * export const track = createTrack(sdkClient);
 *
 * // Consumer code
 * @track('Queue.GetAll')
 * async getAll() { ... }
 *
 * @track('Assets.Update', { condition: false })
 * async update() { ... }
 * ```
 */
export function createTrack(client: TelemetryClient): Track {
    function trackFactory(
        nameOrOptions?: string | TrackOptions,
        options?: TrackOptions
    ): MethodDecorator & (<F extends TrackedFunction>(target: F) => F) {
        const opts: TrackOptions =
            typeof nameOrOptions === 'object' ? nameOrOptions : options ?? {};

        function decoratorImpl(
            target: object | TrackedFunction,
            propertyKey?: string | symbol,
            descriptor?: PropertyDescriptor
        ): PropertyDescriptor | TrackedFunction {
            if (descriptor && typeof descriptor.value === 'function') {
                const original = descriptor.value as TrackedFunction;
                descriptor.value = createTrackedFunction(original, {
                    client,
                    nameOrOptions,
                    fallbackName:
                        typeof propertyKey === 'string'
                            ? propertyKey
                            : 'unknown_method',
                    opts,
                });
                return descriptor;
            }

            const fn = target as TrackedFunction;
            return createTrackedFunction(fn, {
                client,
                nameOrOptions,
                fallbackName: fn.name || 'unknown_function',
                opts,
            });
        }

        return decoratorImpl as MethodDecorator &
            (<F extends TrackedFunction>(target: F) => F);
    }

    return trackFactory as Track;
}

/**
 * Factory: returns a `trackEvent` function bound to a specific
 * `TelemetryClient`. Use for ad-hoc tracking outside method boundaries.
 *
 * @example
 * ```ts
 * const trackEvent = createTrackEvent(sdkClient);
 * trackEvent('Sdk.Auth');
 * ```
 */
export function createTrackEvent(
    client: TelemetryClient
): (eventName: string, name?: string, attributes?: TelemetryAttributes) => void {
    return function trackEvent(
        eventName: string,
        name?: string,
        attributes?: TelemetryAttributes
    ): void {
        client.track(eventName, name, attributes);
    };
}
