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

        if (shouldTrack) {
            const serviceMethod =
                typeof nameOrOptions === 'string' ? nameOrOptions : fallbackName;
            client.track(
                serviceMethod,
                client.getDefaultEventName(),
                opts.attributes
            );
        }

        return originalFunction.apply(this, args);
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
