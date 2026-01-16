import type { ValidConfigKey, UiPathConfig } from './types'

/**
 * Plugin name used across all bundlers
 */
export const PLUGIN_NAME = 'coded-apps'

/**
 * SDK package name to check for in dependencies
 */
export const SDK_PACKAGE_NAME = '@uipath/uipath-typescript'

/**
 * Default config file name
 */
export const CONFIG_FILE_NAME = 'uipath.json'

/**
 * Key that is always required (both dev and prod)
 */
export const REQUIRED_KEY_ALWAYS: ValidConfigKey = 'scope'

/**
 * Required keys for local development (OAuth flow)
 */
export const REQUIRED_KEYS_DEV: readonly ValidConfigKey[] = [
  'scope',
  'orgName',
  'tenantName',
  'baseUrl',
  'redirectUri',
]

/**
 * Mapping from config keys to meta tag names
 */
export const META_TAG_PREFIX = 'uipath'

export const UIPATH_META_TAGS: Record<ValidConfigKey, string | undefined> = {
  clientId: 'client-id',
  scope: 'scope',
  orgName: 'org-name',
  tenantName: 'tenant-name',
  baseUrl: 'base-url',
  redirectUri: 'redirect-uri',
  secret: undefined, // Not exposed as meta tag
}

/**
 * Sample config for error messages
 */
export const SAMPLE_CONFIG: Partial<UiPathConfig> = {
  scope: 'OR.Execution OR.Folders',
  orgName: 'your-org',
  tenantName: 'your-tenant',
  baseUrl: 'https://cloud.uipath.com',
  redirectUri: 'http://localhost:5173',
}

/**
 * Error and warning messages for configuration validation
 */
export const MESSAGES = {
  // Validation errors
  MISSING_REQUIRED_KEY: (key: string) => `❌ Missing required key "${key}" - needed for OAuth client creation`,
  MISSING_DEV_KEYS: (keys: string[]) => `❌ Missing keys for local development: ${keys.join(', ')}`,
  INVALID_KEY_FORMAT: (key: string, suggestion: string) =>
    `❌ Invalid key "${key}" - use camelCase: "${suggestion}"`,
  UNKNOWN_KEY: (key: string) => `⚠️  Unknown key "${key}" will be ignored by the SDK`,

  // Validation warnings
  DEV_KEYS_INJECTED_AT_DEPLOYMENT: (keys: string[]) =>
    `⚠️  Missing keys for local development: ${keys.join(', ')} (will be injected at deployment)`,

  // File errors
  CONFIG_NOT_FOUND: (path: string) => `❌ Config file not found: ${path}`,
  CONFIG_PARSE_ERROR: (path: string, error: unknown) => `❌ Failed to parse ${path}: ${error}`,

  // SDK dependency
  SDK_NOT_INSTALLED: `❌ SDK package "@uipath/uipath-typescript" is not installed. Run: npm install @uipath/uipath-typescript`,
  PACKAGE_JSON_NOT_FOUND: `❌ No package.json found in project root`,
  PACKAGE_JSON_READ_ERROR: (error: unknown) => `❌ Failed to read package.json: ${error}`,

  // Console output
  CONFIG_ERRORS_HEADER: (path: string) => `❌ Configuration errors in ${path}:`,
  CONFIG_WARNINGS_HEADER: (path: string) => `⚠️  Configuration warnings in ${path}:`,
  CONFIG_LOADED: (path: string) => `✓ Config loaded from ${path}`,
  CONFIG_INJECTED_AT_DEPLOYMENT: `ℹ️  Config will be injected at deployment`,
  HTML_HEAD_TAG_NOT_FOUND: `⚠️  No </head> tag found in HTML - meta tags not injected`,
} as const
