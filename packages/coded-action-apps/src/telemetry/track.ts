/**
 * SDK Track decorator and function for telemetry
 */

import { telemetryClient } from './client';
import { TrackOptions } from './types';
import { SDK_RUN_EVENT } from './constants';

/**
 * Common tracking logic shared between method and function decorators
 */
function createTrackedFunction<T extends (...args: unknown[]) => unknown>(
    originalFunction: T,
    nameOrOptions: string | TrackOptions | undefined,
    fallbackName: string,
    opts: TrackOptions
): T {
    return function (this: unknown, ...args: unknown[]) {
        // Determine if we should track this call
        let shouldTrack = true;
        if (opts.condition !== undefined) {
            if (typeof opts.condition === 'function') {
                shouldTrack = opts.condition.apply(this, args);
            } else {
                shouldTrack = opts.condition;
            }
        }

        // Track the event if enabled
        if (shouldTrack) {
            // Use the full name provided in the decorator (e.g., "Queue.GetAll")
            const serviceMethod = typeof nameOrOptions === 'string' 
                ? nameOrOptions 
                : fallbackName;
            
            // Use 'Sdk.Run' as the name and serviceMethod as the service
            telemetryClient.track(serviceMethod, SDK_RUN_EVENT, opts.attributes);
        }

        // Execute the original function
        return originalFunction.apply(this, args);
    } as T;
}

/**
 * Track decorator that can be used to automatically track function calls
 * 
 * Usage:
 * @track("Service.Method")
 * function myFunction() { ... }
 * 
 * @track('CodedActionApp.CompleteTask')
 * completeTask() { ... }
 */
export function track(
    nameOrOptions?: string | TrackOptions,
    options?: TrackOptions
): MethodDecorator {
    return function decorator(_target: unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
        const opts = typeof nameOrOptions === 'object' ? nameOrOptions : options || {};

        if (descriptor && typeof descriptor.value === 'function') {
            // Method decorator
            descriptor.value = createTrackedFunction(
                descriptor.value as (...args: unknown[]) => unknown,
                nameOrOptions,
                (propertyKey ? String(propertyKey) : 'unknown_method'),
                opts
            );
            return descriptor;
        }

        return descriptor;
    };
}
