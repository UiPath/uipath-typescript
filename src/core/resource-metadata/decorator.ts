import { ResourceMetadataRegistry } from './registry';
import type { ResourceReferenceOptions } from './types';

/**
 * Method decorator that registers resource dependency metadata for this SDK method.
 * Used by the CLI scanner to detect which resources (assets, processes, buckets, etc.)
 * are used in the project so users can be reminded to add them to bindings.json.
 */
export function ResourceReference(options: ResourceReferenceOptions): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const className = (_target as { constructor?: { name: string } }).constructor?.name ?? 'Unknown';
    const methodName = String(propertyKey);
    const registryKey = `${className}.${methodName}`;

    ResourceMetadataRegistry.set(registryKey, {
      target: (_target as { constructor: Function }).constructor,
      methodName,
      resource: options.resource,
      options,
    });

    return descriptor;
  };
}

