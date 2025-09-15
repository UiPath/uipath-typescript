/**
 * CLI Track decorator and function for telemetry
 */

import { cliTelemetryClient } from './client.js';
import { TrackOptions } from './types.js';

/**
 * Add 'Cli.' prefix to event name if not already present
 */
function addCliPrefix(eventName: string): string {
    return eventName.startsWith('Cli.') ? eventName : `Cli.${eventName}`;
}

/**
 * Common tracking logic shared between method and function decorators
 */
function createTrackedFunction<T extends (...args: any[]) => any>(
    originalFunction: T,
    nameOrOptions: string | TrackOptions | undefined,
    fallbackName: string,
    opts: TrackOptions
): T {
    return function (this: any, ...args: any[]) {
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
            const eventName = typeof nameOrOptions === 'string' ? nameOrOptions : fallbackName;
            const prefixedEventName = addCliPrefix(eventName);
            cliTelemetryClient.track(prefixedEventName, opts.attributes);
        }

        // Execute the original function
        return originalFunction.apply(this, args);
    } as T;
}

/**
 * Track decorator that can be used to automatically track function calls
 * 
 * Usage:
 * @track
 * function myFunction() { ... }
 * 
 * @track("custom_event_name")
 * function myFunction() { ... }
 * 
 * @track({ condition: false })
 * function myFunction() { ... }
 * 
 * @track({ attributes: { customProp: "value" } })
 * function myFunction() { ... }
 */
export function track(
    nameOrOptions?: string | TrackOptions,
    options?: TrackOptions
): MethodDecorator | ((target: any) => any) {
    return function decorator(_target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        const opts = typeof nameOrOptions === 'object' ? nameOrOptions : options || {};

        if (descriptor && typeof descriptor.value === 'function') {
            // Method decorator
            descriptor.value = createTrackedFunction(
                descriptor.value as (...args: any[]) => any, 
                nameOrOptions, 
                propertyKey || 'unknown_method', 
                opts
            );
            return descriptor;
        }
        
        // Function decorator
        return (originalFunction: Function) => createTrackedFunction(
            originalFunction as (...args: any[]) => any, 
            nameOrOptions, 
            originalFunction.name || 'unknown_function', 
            opts
        );
    };
}