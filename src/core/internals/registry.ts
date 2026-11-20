/**
 * SDK Internals Registry - Internal registry for SDK instances
 *
 * This class is NOT exported in the public API.
 * It provides a secure way to share SDK internals between
 * the UiPath class and service classes without exposing them publicly.
 *
 * @internal
 */

import type { PrivateSDK } from './types';
import { missingConfigMessage } from '../config/config-utils';
import { OrganizationIdResolver } from '../organization/organization-id-resolver';

// Global symbol keys so both stores are shared across module instances: core and each service
// subpath are bundled separately, and a service's `get` must see what core's constructor recorded.
const REGISTRY_KEY: unique symbol = Symbol.for('@uipath/sdk-internals-registry');
const UNCONFIGURED_KEY: unique symbol = Symbol.for('@uipath/sdk-unconfigured-reason');

interface GlobalStores {
  [REGISTRY_KEY]?: WeakMap<object, PrivateSDK>;
  [UNCONFIGURED_KEY]?: WeakMap<object, string>;
}

const globalStores = (): GlobalStores => globalThis as typeof globalThis & GlobalStores;

// Get or create the global WeakMap store
const getGlobalStore = (): WeakMap<object, PrivateSDK> =>
  (globalStores()[REGISTRY_KEY] ??= new WeakMap<object, PrivateSDK>());

// Why an instance resolved no configuration, for the diagnostic `get` raises on it
const getUnconfiguredStore = (): WeakMap<object, string> =>
  (globalStores()[UNCONFIGURED_KEY] ??= new WeakMap<object, string>());

/**
 * Whether a value looks like a UiPath instance — used only to choose between two
 * diagnostics, never to grant access.
 *
 * Structural because importing UiPath here would be circular, and each bundled
 * subpath can hold its own copy of the class, which `instanceof` would reject.
 */
const looksLikeUiPath = (instance: object): boolean =>
  typeof (instance as { initialize?: unknown }).initialize === 'function';

/**
 * Internal registry for SDK private components.
 * Uses WeakMap to prevent memory leaks - entries are automatically
 * garbage collected when the SDK instance is no longer referenced.
 *
 * Uses a global singleton pattern to ensure the same WeakMap is shared
 * across separately bundled modules (core, entities, tasks, etc.).
 *
 * @internal - Not exported in public API
 */
export class SDKInternalsRegistry {
  /**
   * Register SDK instance internals
   * Called once a UiPath instance has a complete configuration
   */
  static set(instance: object, internals: PrivateSDK): void {
    this.store.set(instance, internals);
  }

  /**
   * Record why an instance resolved no configuration, so a service constructed from it later
   * reports that reason rather than a generic one. Consulted only while the instance has no
   * internals registered.
   *
   * @param instance - The UiPath instance that stayed unconfigured
   * @param reason - The configuration-not-found message for that instance
   */
  static setUnconfigured(instance: object, reason: string): void {
    this.unconfigured.set(instance, reason);
  }

  /**
   * Retrieve SDK instance internals
   * Called by BaseService constructor
   */
  static get(instance: object): PrivateSDK {
    const internals = this.store.get(instance);
    if (!internals) {
      // A recorded reason proves the instance is a UiPath; the structural check covers an older core
      // bundle that records none.
      const reason = this.unconfigured.get(instance);
      if (reason !== undefined || looksLikeUiPath(instance)) {
        throw new Error(
          'Cannot create a service: the UiPath instance was never configured. ' +
          (reason ?? missingConfigMessage())
        );
      }

      throw new Error(
        'Invalid SDK instance. Make sure to pass a valid UiPath instance to the service constructor.'
      );
    }
    return internals;
  }

  /**
   * Retrieve the instance's organization GUID resolver, creating it on first use.
   * Cached on the registered internals so all services share one resolution.
   */
  static getOrganizationIdResolver(instance: object): OrganizationIdResolver {
    const internals = this.get(instance);
    internals.organizationIdResolver ??= new OrganizationIdResolver(internals.config, internals.tokenManager);
    return internals.organizationIdResolver;
  }

  // Use global store to ensure sharing across module bundles
  private static get store(): WeakMap<object, PrivateSDK> {
    return getGlobalStore();
  }

  private static get unconfigured(): WeakMap<object, string> {
    return getUnconfiguredStore();
  }
}
