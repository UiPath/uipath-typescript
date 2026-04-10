/**
 * Core module - Public API for UiPath coded-apps plugin.
 *
 * This module provides configuration reading, validation, and meta tag generation
 * for UiPath coded apps bundler integration.
 */

export * from './config-reader'
export * from './meta-tag-generator'
export * from './utils'

// Re-export types for convenience
export type * from '../types'
