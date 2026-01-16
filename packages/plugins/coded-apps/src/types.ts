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
 * UiPath SDK configuration
 */
export interface UiPathConfig {
  clientId?: string
  scope?: string
  orgName?: string
  tenantName?: string
  baseUrl?: string
  redirectUri?: string
  secret?: string
}

/**
 * Valid configuration key
 */
export type ValidConfigKey = keyof UiPathConfig

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
