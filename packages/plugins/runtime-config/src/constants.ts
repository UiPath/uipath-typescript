/**
 * Plugin name used across all bundlers
 */
export const PLUGIN_NAME = 'apps-runtime-config'

/**
 * Default config file path
 */
export const DEFAULT_CONFIG_PATH = 'uipath.json'

/**
 * Valid SDK configuration keys
 */
export const VALID_CONFIG_KEYS = [
  'clientId',
  'scope',
  'orgName',
  'tenantName',
  'baseUrl',
  'redirectUri',
  'secret',
] as const

export type ValidConfigKey = typeof VALID_CONFIG_KEYS[number]

/**
 * Key that is always required (both dev and prod)
 */
export const REQUIRED_KEY_ALWAYS = 'scope' as const

/**
 * Required keys for local development (OAuth flow)
 */
export const REQUIRED_KEYS_DEV = [
  REQUIRED_KEY_ALWAYS,
  'orgName',
  'tenantName',
  'baseUrl',
  'redirectUri',
] as const

/**
 * Required keys for production build (pack command)
 */
export const REQUIRED_KEYS_PROD = [REQUIRED_KEY_ALWAYS] as const

/**
 * Mapping from config keys to meta tag names
 */
export const META_TAG_PREFIX = 'uipath'

export const CONFIG_TO_META_TAG: Record<string, string> = {
  clientId: 'client-id',
  scope: 'scope',
  orgName: 'org-name',
  tenantName: 'tenant-name',
  baseUrl: 'base-url',
  redirectUri: 'redirect-uri',
}

/**
 * Common typos/variations mapped to correct key names
 */
export const TYPO_CORRECTIONS: Record<string, ValidConfigKey> = {
  // clientId variations
  clientid: 'clientId',
  ClientId: 'clientId',
  client_id: 'clientId',
  'client-id': 'clientId',

  // orgName variations
  orgname: 'orgName',
  OrgName: 'orgName',
  org_name: 'orgName',
  'org-name': 'orgName',
  organizationName: 'orgName',
  organization: 'orgName',

  // tenantName variations
  tenantname: 'tenantName',
  TenantName: 'tenantName',
  tenant_name: 'tenantName',
  'tenant-name': 'tenantName',
  tenant: 'tenantName',

  // baseUrl variations
  baseurl: 'baseUrl',
  BaseUrl: 'baseUrl',
  base_url: 'baseUrl',
  'base-url': 'baseUrl',
  url: 'baseUrl',

  // redirectUri variations
  redirecturi: 'redirectUri',
  RedirectUri: 'redirectUri',
  redirect_uri: 'redirectUri',
  'redirect-uri': 'redirectUri',
  callbackUrl: 'redirectUri',
  callback: 'redirectUri',

  // scope variations
  scopes: 'scope',
  Scope: 'scope',
}

/**
 * Sample config for error messages
 */
export const SAMPLE_CONFIG = {
  scope: 'OR.Execution OR.Folders',
  orgName: 'your-org',
  tenantName: 'your-tenant',
  baseUrl: 'https://cloud.uipath.com',
  redirectUri: 'http://localhost:5173',
}

// ============================================================================
// Error & Warning Messages
// ============================================================================

export const MESSAGES = {
  // Validation errors
  MISSING_REQUIRED_KEY: (key: string) => `Missing required key "${key}" - needed for OAuth client creation`,
  MISSING_DEV_KEYS: (keys: string[]) => `Missing keys for local development: ${keys.join(', ')}`,
  TYPO_DETECTED: (key: string, correction: string) => `Invalid key "${key}" - did you mean "${correction}"?`,
  UNKNOWN_KEY: (key: string) => `Unknown key "${key}" will be ignored by the SDK`,

  // Validation warnings
  DEV_KEYS_INJECTED_AT_DEPLOYMENT: (keys: string[]) =>
    `Missing keys for local development: ${keys.join(', ')} (will be injected at deployment)`,

  // File errors
  CONFIG_NOT_FOUND: (path: string) => `Config file not found: ${path}`,
  CONFIG_PARSE_ERROR: (path: string, error: unknown) => `Failed to parse ${path}: ${error}`,

  // Webpack warning
  HTML_WEBPACK_PLUGIN_NOT_FOUND: `html-webpack-plugin not found. Meta tags will not be injected.`,

  // Console output
  CONFIG_ERRORS_HEADER: (path: string) => `Configuration errors in ${path}:`,
  CONFIG_WARNINGS_HEADER: (path: string) => `Configuration warnings in ${path}:`,
  CONFIG_LOADED: (path: string) => `Config loaded from ${path}`,
} as const
