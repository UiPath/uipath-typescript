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
 */
const APPS_ENV_GLOBAL = '__UIPATH_ENV__';

interface EnvCapableGlobal {
    process?: { env?: Record<string, string | undefined> };
    Deno?: { env?: { get?(name: string): string | undefined } };
    [APPS_ENV_GLOBAL]?: unknown;
}

function isOptOutValue(value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
}

function readProcessEnv(name: string): string | undefined {
    const globals = globalThis as EnvCapableGlobal;

    // Both reads are guarded: Deno throws without `--allow-env`, and its
    // `process.env` shim proxies the same permission-gated accessor.
    try {
        const fromNode = globals.process?.env?.[name];
        if (fromNode) {
            return fromNode;
        }
    } catch (error) {
        // No env permission; fall through to the Deno accessor.
        console.warn(error);
    }

    try {
        return globals.Deno?.env?.get?.(name);
    } catch (error) {
        // No env permission; treat the variable as absent.
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
