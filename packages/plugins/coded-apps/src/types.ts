/**
 * Plugin options
 */
export interface Options {
  /**
   * Path to the config file relative to project root
   * @default 'uipath.json'
   */
  configPath?: string
}

/**
 * Well-known SDK configuration keys recognized by the UiPath SDK at runtime.
 * Used for validation and format suggestions (e.g. snake_case → camelCase).
 */
export type ValidConfigKey = 'clientId' | 'scope' | 'orgName' | 'tenantName' | 'baseUrl' | 'redirectUri'

/**
 * UiPath configuration from uipath.json.
 *
 * Includes well-known SDK keys (clientId, scope, etc.) plus any additional
 * keys the developer adds. All keys are injected as `<meta name="uipath:<kebab-case-key>">` tags
 * into the local dev index.html, so adding a new key here (e.g. folderKey) automatically
 * produces `<meta name="uipath:folder-key" content="...">` — no plugin changes needed.
 */
export interface UiPathConfig {
  clientId?: string
  scope?: string
  orgName?: string
  tenantName?: string
  baseUrl?: string
  redirectUri?: string
  [key: string]: string | undefined
}


/**
 * Config validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Options for readConfig function
 */
export interface ReadConfigOptions extends Options {
  /**
   * Whether running in development mode
   * Auto-detected from bundler hooks, but can be overridden
   */
  isDev?: boolean
}

/**
 * Vite meta tag format
 */
export interface ViteMetaTag {
  tag: 'meta'
  attrs: { name: string; content: string }
  injectTo: 'head'
}
