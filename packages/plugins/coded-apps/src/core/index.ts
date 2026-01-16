/**
 * Core module - Public API for UiPath coded-apps plugin.
 *
 * This module provides configuration reading, validation, and meta tag generation
 * for UiPath coded apps bundler integration.
 */

import { ConfigReader } from './config-reader'
import { MetaTagGenerator } from './meta-tag-generator'
import type { UiPathConfig, ReadConfigOptions, ValidationResult, ViteMetaTag } from '../types'

// Export classes for advanced usage
export { ConfigReader } from './config-reader'
export { MetaTagGenerator } from './meta-tag-generator'
export { ValidationCollector, KeyUtils, ErrorUtils } from './utils'

// Create singleton instances
const configReader = new ConfigReader()
const metaTagGenerator = new MetaTagGenerator()

// ===== PUBLIC API FUNCTIONS =====

/**
 * Read and validate UiPath configuration from file.
 * @param options - Configuration options (configPath, isDev)
 * @throws Error if validation fails in dev mode
 */
export function readConfig(options: ReadConfigOptions = {}): UiPathConfig {
  return configReader.read(options)
}

/**
 * Validate UiPath configuration without reading from file.
 * Useful for testing or when config is provided programmatically.
 */
export function validateConfig(
  config: Record<string, unknown>,
  configPath: string,
  isDev = false
): ValidationResult {
  return configReader.validate(config, isDev)
}

/**
 * Generate meta tags in Vite format (array of objects).
 * Used by Vite's transformIndexHtml hook.
 */
export function generateMetaTags(config: UiPathConfig): ViteMetaTag[] {
  return metaTagGenerator.generateViteTags(config)
}

/**
 * Generate meta tags as HTML string.
 * Used by Webpack, Rollup, and esbuild plugins.
 */
export function generateMetaTagsHtml(config: UiPathConfig): string {
  return metaTagGenerator.generateHtmlString(config)
}

// Re-export types for convenience
export type * from '../types'
