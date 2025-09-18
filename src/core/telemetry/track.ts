/**
 * SDK Track decorator and function for telemetry
 */

import { telemetryClient } from './client';
import { TrackOptions, TelemetryAttributes } from './types';
import { SDK_RUN_EVENT } from './constants';

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
 * @track("Queue.GetAll")
 * async getAll() { ... }
 * 
 * @track("Tasks.Create")
 * async create() { ... }
 * 
 * @track("Assets.Update", { condition: false })
 * function myFunction() { ... }
 * 
 * @track("Processes.Start", { attributes: { customProp: "value" } })
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

/**
 * Direct tracking function
 */
export function trackEvent(eventName: string, name?: string, attributes?: TelemetryAttributes): void {
    telemetryClient.track(eventName, name, attributes);
}