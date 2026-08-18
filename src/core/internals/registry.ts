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

// Global symbol key to ensure WeakMap is shared across module instances
// This prevents issues when core and service modules are bundled separately
const REGISTRY_KEY = Symbol.for('@uipath/sdk-internals-registry');

// Get or create the global WeakMap store
const getGlobalStore = (): WeakMap<object, PrivateSDK> => {
  const globalObj = globalThis as any;
  if (!globalObj[REGISTRY_KEY]) {
    globalObj[REGISTRY_KEY] = new WeakMap<object, PrivateSDK>();
  }
  return globalObj[REGISTRY_KEY];
};

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
  // Use global store to ensure sharing across module bundles
  private static get store(): WeakMap<object, PrivateSDK> {
    return getGlobalStore();
  }

  /**
   * Register SDK instance internals
   * Called by UiPath constructor
   */
  static set(instance: object, internals: PrivateSDK): void {
    this.store.set(instance, internals);
  }

  /**
   * Retrieve SDK instance internals
   * Called by BaseService constructor
   */
  static get(instance: object): PrivateSDK {
    const internals = this.store.get(instance);
    if (!internals) {
      if (looksLikeUiPath(instance)) {
        throw new Error(
          'Cannot create a service: the UiPath instance was never configured. ' +
          missingConfigMessage()
        );
      }

      throw new Error(
        'Invalid SDK instance. Make sure to pass a valid UiPath instance to the service constructor.'
      );
    }
    return internals;
  }
}
