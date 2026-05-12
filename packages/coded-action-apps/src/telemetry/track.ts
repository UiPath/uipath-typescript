/**
 * Track decorator and trackEvent helper for Coded Action Apps SDK telemetry.
 */

import { telemetryClient } from './client';
import { TelemetryAttributes, TrackOptions } from './types';
import { SDK_RUN_EVENT } from './constants';

function createTrackedFunction<T extends (...args: unknown[]) => unknown>(
    originalFunction: T,
    nameOrOptions: string | TrackOptions | undefined,
    fallbackName: string,
    opts: TrackOptions
): T {
    return function (this: unknown, ...args: unknown[]) {
        let shouldTrack = true;
        if (opts.condition !== undefined) {
            shouldTrack = typeof opts.condition === 'function'
                ? opts.condition.apply(this, args)
                : opts.condition;
        }

        if (shouldTrack) {
            const serviceMethod = typeof nameOrOptions === 'string'
                ? nameOrOptions
                : fallbackName;
            telemetryClient.track(serviceMethod, SDK_RUN_EVENT, opts.attributes);
        }

        return originalFunction.apply(this, args);
    } as T;
}

/**
 * Track decorator that wraps a method to emit a telemetry event when called.
 *
 * Usage:
 *   @track('CodedActionApp.CompleteTask')
 *   completeTask() { ... }
 */
export function track(
    nameOrOptions?: string | TrackOptions,
    options?: TrackOptions
): MethodDecorator {
    return function decorator(
        _target: unknown,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor
    ) {
        const opts = typeof nameOrOptions === 'object' ? nameOrOptions : options || {};

        if (descriptor && typeof descriptor.value === 'function') {
            descriptor.value = createTrackedFunction(
                descriptor.value as (...args: unknown[]) => unknown,
                nameOrOptions,
                propertyKey ? String(propertyKey) : 'unknown_method',
                opts
            );
            return descriptor;
        }

        return descriptor;
    };
}

export function trackEvent(eventName: string, name?: string, attributes?: TelemetryAttributes): void {
    telemetryClient.track(eventName, name, attributes);
}
