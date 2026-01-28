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

/**
 * Key normalization utilities.
 * Handles snake_case, kebab-case, PascalCase → camelCase conversions.
 */
export class KeyUtils {
  private static validKeys: ValidConfigKey[] = Object.keys(UIPATH_META_TAGS) as ValidConfigKey[]

  /**
   * Normalize a key to camelCase for comparison.
   * Handles: snake_case, kebab-case, PascalCase, lowercase
   */
  static normalize(key: string): string {
    return key
      .replace(/[-_](.)/g, (_, char: string) => char.toUpperCase())
      .replace(/^./, char => char.toLowerCase())
  }

  /**
   * Find the matching valid key for a given input key.
   * Returns the valid key if found, otherwise undefined.
   */
  static findMatch(key: string): ValidConfigKey | undefined {
    // Direct match
    if (this.validKeys.includes(key as ValidConfigKey)) {
      return key as ValidConfigKey
    }

    // Normalized match
    const normalized = this.normalize(key)
    return this.validKeys.find(
      validKey => validKey.toLowerCase() === normalized.toLowerCase()
    )
  }

  /**
   * Check if a string is a valid config key (type guard).
   */
  static isValid(key: string): key is ValidConfigKey {
    return this.validKeys.includes(key as ValidConfigKey)
  }

  static getValidKeys(): ValidConfigKey[] {
    return [...this.validKeys]
  }
}

/**
 * Error utilities.
 */
export class ErrorUtils {
  static createError(message: string): Error {
    const error = new Error(`[${PLUGIN_NAME}] ${message}`)
    error.stack = '' // Hide stack trace for config errors
    return error
  }

  static formatList(items: string[]): string {
    return items.map(item => `  • ${item}`).join('\n')
  }
}
