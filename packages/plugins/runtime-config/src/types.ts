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
 * Config validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Options for readConfig function
 * Note: Dev mode is auto-detected via process.env.NODE_ENV
 */
export interface ReadConfigOptions extends Options {}

/**
 * Vite meta tag format
 */
export interface ViteMetaTag {
  tag: 'meta'
  attrs: { name: string; content: string }
  injectTo: 'head'
}
