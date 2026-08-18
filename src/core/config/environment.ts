import { PartialUiPathConfig } from './sdk-config';
import { isBrowser } from '../../utils/platform';

/**
 * Shape of the globals that expose environment variables. Read defensively so
 * the SDK works under Node and Deno, and stays inert in browser bundles where
 * neither exists.
 */
interface EnvCapableGlobal {
  process?: { env?: Record<string, string | undefined> };
  Deno?: { env?: { get?(name: string): string | undefined } };
}

/**
 * Reads a single environment variable, returning undefined for missing or
 * empty values so a blank variable never satisfies a required field.
 */
export function readEnv(name: string): string | undefined {
  const globals = globalThis as EnvCapableGlobal;

  // Both reads are guarded: Deno throws without `--allow-env`, and its
  // `process.env` shim proxies the same permission-gated `Deno.env`, so reading
  // either one unguarded would escape the SDK constructor.
  try {
    const fromNode = globals.process?.env?.[name];
    if (fromNode) return fromNode;
  } catch {
    // No env permission; fall through to the Deno accessor.
  }

  try {
    const fromDeno = globals.Deno?.env?.get?.(name);
    if (fromDeno) return fromDeno;
  } catch {
    // No env permission; treat the variable as absent.
  }

  return undefined;
}

/**
 * The environment contract, matching the names this repository already uses for
 * the same values in its integration configuration and documentation, so one
 * `.env` serves both.
 */
export const UiPathEnvVars = {
  BASE_URL: 'UIPATH_BASE_URL',
  ORG_NAME: 'UIPATH_ORG_NAME',
  TENANT_NAME: 'UIPATH_TENANT_NAME',
  ACCESS_TOKEN: 'UIPATH_ACCESS_TOKEN',
} as const;

/**
 * Load configuration from the execution-context environment contract.
 *
 * Returns null in browsers (where meta tags are the configuration source) and
 * whenever no contract variable is present, so callers can fall through to
 * other sources instead of acting on a half-populated config.
 */
export function loadFromEnvironment(): PartialUiPathConfig | null {
  if (isBrowser) return null;

  // Org and tenant accept an id as readily as a name — both go into the same URL
  // position — and the token goes to `secret`, used verbatim as the bearer value.
  const config: PartialUiPathConfig = {
    baseUrl: readEnv(UiPathEnvVars.BASE_URL),
    orgName: readEnv(UiPathEnvVars.ORG_NAME),
    tenantName: readEnv(UiPathEnvVars.TENANT_NAME),
    secret: readEnv(UiPathEnvVars.ACCESS_TOKEN),
  };

  return Object.values(config).some(Boolean) ? config : null;
}
