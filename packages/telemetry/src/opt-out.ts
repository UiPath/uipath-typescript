/**
 * Telemetry opt-out.
 *
 * Resolved once per client in `TelemetryClient.initialize`, so every consumer
 * of this package honours the same switches without wiring anything itself.
 */

/**
 * Process environment variable that turns telemetry off under Node and Deno.
 * The same name the UiPath CLI reads, so a consumer running inside the CLI
 * follows the CLI's setting.
 */
export const TELEMETRY_DISABLED_ENV = 'UIPATH_TELEMETRY_DISABLED';

/**
 * Coded app environment variable that turns telemetry off in the browser.
 * Carries the `UIPATH_APPS_` prefix a deployment's variables require.
 */
export const APPS_TELEMETRY_DISABLED_ENV = 'UIPATH_APPS_TELEMETRY_DISABLED';

/**
 * Global a coded app deployment's `env.js` assigns before the app bundle
 * runs. Named here rather than imported so this package stays free of a
 * dependency on the SDK.
 *
 * @internal
 */
export const APPS_ENV_GLOBAL = '__UIPATH_ENV__';

interface DenoGlobal {
    env?: { get?(name: string): string | undefined };
    permissions?: {
        querySync?(descriptor: { name: 'env'; variable: string }): { state: string };
    };
}

interface EnvCapableGlobal {
    process?: { env?: Record<string, string | undefined> };
    Deno?: DenoGlobal;
    [APPS_ENV_GLOBAL]?: unknown;
}

// Exact match, as the UiPath CLI does, so both agree on every value.
function isOptOutValue(value: unknown): boolean {
    return value === '1' || value === 'true';
}

// Reading a variable Deno has not granted prompts the user or throws, so
// the permission is queried first.
function readDenoEnv(deno: DenoGlobal, name: string): string | undefined {
    const status = deno.permissions?.querySync?.({ name: 'env', variable: name });
    return status?.state === 'granted' ? deno.env?.get?.(name) : undefined;
}

function readProcessEnv(name: string): string | undefined {
    const globals = globalThis as EnvCapableGlobal;

    try {
        // Deno's `process.env` shim is gated by the same permission.
        return globals.Deno
            ? readDenoEnv(globals.Deno, name)
            : globals.process?.env?.[name];
    } catch (error) {
        console.warn(error);
        return undefined;
    }
}

function readAppsEnv(name: string): unknown {
    const table = (globalThis as EnvCapableGlobal)[APPS_ENV_GLOBAL];
    if (typeof table !== 'object' || table === null) {
        return undefined;
    }
    return Object.prototype.hasOwnProperty.call(table, name)
        ? (table as Record<string, unknown>)[name]
        : undefined;
}

/**
 * Whether the host asked for telemetry to stay off: `UIPATH_TELEMETRY_DISABLED`
 * in the process environment, or `UIPATH_APPS_TELEMETRY_DISABLED` among a coded
 * app's environment variables. `1` and `true` opt out; anything else leaves
 * telemetry on.
 */
export function isTelemetryDisabled(): boolean {
    return (
        isOptOutValue(readProcessEnv(TELEMETRY_DISABLED_ENV)) ||
        isOptOutValue(readAppsEnv(APPS_TELEMETRY_DISABLED_ENV))
    );
}
