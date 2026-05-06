/**
 * Each consumer ships as multiple subpath bundles and Rollup inlines this
 * shim into every one — `new TelemetryClient()` would hand each bundle its
 * own (uninitialized) client. `getOrCreateClient(name)` instead parks the
 * client on `globalThis` so every bundle shares one client per name.
 */

import { TelemetryClient } from './client';

const REGISTRY_KEY = Symbol.for('@uipath/core-telemetry/clients');

type GlobalThisWithRegistry = { [key: symbol]: unknown };

function getGlobalRegistry(): Record<string, TelemetryClient> {
    const holder = globalThis as GlobalThisWithRegistry;
    let registry = holder[REGISTRY_KEY] as
        | Record<string, TelemetryClient>
        | undefined;
    if (!registry) {
        registry = {};
        holder[REGISTRY_KEY] = registry;
    }
    return registry;
}

/**
 * Returns the named `TelemetryClient`, creating it on first access.
 *
 * @param name Stable identifier for the consumer (e.g. `"uipath-ts-sdk"`,
 *   `"uipath-ts-coded-action-apps"`). Subpath bundles within the same
 *   consumer share a client by passing the same name.
 */
export function getOrCreateClient(name: string): TelemetryClient {
    const registry = getGlobalRegistry();
    if (!registry[name]) {
        registry[name] = new TelemetryClient();
    }
    return registry[name];
}
