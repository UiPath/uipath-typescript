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

  const fromNode = globals.process?.env?.[name];
  if (fromNode) return fromNode;

  try {
    const fromDeno = globals.Deno?.env?.get?.(name);
    if (fromDeno) return fromDeno;
  } catch {
    // Deno throws when env permission was not granted; treat as absent.
  }

  return undefined;
}

/** First non-empty value among the given environment variable names. */
function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return undefined;
}

/**
 * The documented execution-context contract. A UiPath runner populates these;
 * a developer running a plain script can set them by hand.
 *
 * Organization and tenant accept either an id or a logical name — the platform
 * addresses both in the same URL position.
 */
export const UiPathEnvVars = {
  BASE_URL: ['UIPATH_URL', 'UIPATH_BASE_URL'],
  ORG: ['UIPATH_ORGANIZATION_ID', 'UIPATH_ORG_ID', 'UIPATH_ORGANIZATION_NAME', 'UIPATH_ORG_NAME'],
  TENANT: ['UIPATH_TENANT_ID', 'UIPATH_TENANT_NAME'],
  ACCESS_TOKEN: ['UIPATH_ACCESS_TOKEN', 'UIPATH_SECRET'],
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

  const config: PartialUiPathConfig = {
    baseUrl: firstEnv(...UiPathEnvVars.BASE_URL),
    orgName: firstEnv(...UiPathEnvVars.ORG),
    tenantName: firstEnv(...UiPathEnvVars.TENANT),
    secret: firstEnv(...UiPathEnvVars.ACCESS_TOKEN),
  };

  return Object.values(config).some(Boolean) ? config : null;
}
