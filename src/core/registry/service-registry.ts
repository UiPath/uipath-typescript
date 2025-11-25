/**
 * Service Registry - Manages service lifecycle with lazy instantiation.
 *
 * @example
 * ```typescript
 * const registry = new ServiceRegistry(config, context, tokenManager);
 * registry.register(EntityService);
 * const entities = registry.get(EntityService); // Created on first access
 * ```
 */

import type { UiPathConfig } from '../config/config';
import type { ExecutionContext } from '../context/execution';
import type { TokenManager } from '../auth/token-manager';

/**
 * Service constructor signature (3-parameter pattern)
 */
export type ServiceConstructor<T> = new (
  config: UiPathConfig,
  context: ExecutionContext,
  tokenManager: TokenManager
) => T;

/**
 * Service entry stored in registry
 */
interface ServiceEntry<T> {
  constructor: ServiceConstructor<T>;
  instance?: T;
}

/**
 * Service Registry - Manages service lifecycle with lazy instantiation and caching.
 */
export class ServiceRegistry {
  private services: Map<ServiceConstructor<any>, ServiceEntry<any>> = new Map();

  constructor(
    private readonly config: UiPathConfig,
    private readonly executionContext: ExecutionContext,
    private readonly tokenManager: TokenManager
  ) {}

  /**
   * Register a service for lazy loading (idempotent - safe to call multiple times)
   */
  register<T>(serviceConstructor: ServiceConstructor<T>): void {
    if (this.services.has(serviceConstructor)) {
      return;
    }

    this.services.set(serviceConstructor, {
      constructor: serviceConstructor,
      instance: undefined
    });
  }

  /**
   * Get service instance (creates on first access, returns cached instance after)
   */
  get<T>(serviceConstructor: ServiceConstructor<T>): T {
    const serviceEntry = this.services.get(serviceConstructor);

    if (!serviceEntry) {
      throw new Error(
        `Service ${serviceConstructor.name} is not registered. ` +
        `Call registry.register(${serviceConstructor.name}) before accessing it.`
      );
    }

    if (serviceEntry.instance) {
      return serviceEntry.instance as T;
    }

    serviceEntry.instance = this.instantiate(serviceConstructor);
    return serviceEntry.instance as T;
  }

  /**
   * Check if service is registered
   */
  has<T>(serviceConstructor: ServiceConstructor<T>): boolean {
    return this.services.has(serviceConstructor);
  }

  /**
   * Check if service is instantiated (instance exists in cache)
   */
  isInstantiated<T>(serviceConstructor: ServiceConstructor<T>): boolean {
    const entry = this.services.get(serviceConstructor);
    return entry ? !!entry.instance : false;
  }

  /**
   * Unregister service (removes from registry)
   */
  unregister<T>(serviceConstructor: ServiceConstructor<T>): void {
    this.services.delete(serviceConstructor);
  }

  /**
   * Get all registered service constructors
   */
  getRegisteredServices(): ServiceConstructor<any>[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get number of registered services
   */
  get size(): number {
    return this.services.size;
  }

  /**
   * Instantiate service using constructor
   */
  private instantiate<T>(serviceConstructor: ServiceConstructor<T>): T {
    return new serviceConstructor(
      this.config,
      this.executionContext,
      this.tokenManager
    );
  }
}
