import type { ValidConfigKey } from '../types'
import { UIPATH_META_TAGS, PLUGIN_NAME } from '../constants'

/**
 * Collects validation errors and warnings.
 * Provides a clean interface for accumulating validation results.
 */
export class ValidationCollector {
  private errors: string[] = []
  private warnings: string[] = []

  addError(message: string): this {
    this.errors.push(message)
    return this
  }

  addWarning(message: string): this {
    this.warnings.push(message)
    return this
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getResults(): { errors: string[]; warnings: string[] } {
    return { errors: [...this.errors], warnings: [...this.warnings] }
  }
}

// ===== Key Utilities =====

const validKeys: ValidConfigKey[] = Object.keys(UIPATH_META_TAGS) as ValidConfigKey[]

/**
 * Normalize a key to lowercase without separators for comparison.
 * Handles: snake_case, kebab-case, PascalCase, ALLCAPS, etc.
 */
export function normalizeKey(key: string): string {
  return key.replace(/[-_]/g, '').toLowerCase()
}

/**
 * Find the matching valid key for a given input key.
 * Returns the valid key if found, otherwise undefined.
 */
export function findMatchingKey(key: string): ValidConfigKey | undefined {
  if (validKeys.includes(key as ValidConfigKey)) {
    return key as ValidConfigKey
  }

  const normalized = normalizeKey(key)
  return validKeys.find(
    validKey => normalizeKey(validKey) === normalized
  )
}

/**
 * Check if a string is a valid config key (type guard).
 */
export function isValidKey(key: string): key is ValidConfigKey {
  return validKeys.includes(key as ValidConfigKey)
}

// ===== Error Utilities =====

export function createPluginError(message: string): Error {
  const error = new Error(`[${PLUGIN_NAME}] ${message}`)
  error.stack = '' // Hide stack trace for config errors
  return error
}

export function formatList(items: string[]): string {
  return items.map(item => `  • ${item}`).join('\n')
}
