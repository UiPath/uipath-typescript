import fs from 'node:fs'
import path from 'node:path'
import type { UiPathConfig, ValidationResult, ReadConfigOptions, ViteMetaTag, ValidConfigKey } from './types'
import {
  PLUGIN_NAME,
  CONFIG_FILE_NAME,
  SDK_PACKAGE_NAME,
  REQUIRED_KEY_ALWAYS,
  REQUIRED_KEYS_DEV_LIST,
  UIPATH_META_TAGS,
  META_TAG_PREFIX,
  SAMPLE_CONFIG,
  MESSAGES,
} from './constants'

/**
 * Get valid config keys from UIPATH_META_TAGS (single source of truth)
 */
function getValidConfigKeys(): ValidConfigKey[] {
  return Object.keys(UIPATH_META_TAGS) as ValidConfigKey[]
}

/**
 * Normalize a key to camelCase for comparison
 * Handles: snake_case, kebab-case, PascalCase, lowercase
 */
function normalizeKey(key: string): string {
  return key
    .replace(/[-_](.)/g, (_, char: string) => char.toUpperCase()) // snake_case/kebab-case to camelCase
    .replace(/^./, char => char.toLowerCase()) // PascalCase to camelCase
}

/**
 * Find the matching valid key for a given input key in uipath.json
 * Returns the valid key if found, otherwise undefined
 */
function findMatchingValidKey(key: string): ValidConfigKey | undefined {
  const validKeys = getValidConfigKeys()

  // Direct match - already valid
  if (validKeys.includes(key as ValidConfigKey)) {
    return key as ValidConfigKey
  }

  // Normalize and find match
  const normalized = normalizeKey(key)
  return validKeys.find(validKey => validKey.toLowerCase() === normalized.toLowerCase())
}

function createConfigError(message: string): Error {
  const error = new Error(message)
  error.stack = '' // Hide stack trace for config errors
  return error
}

function formatErrorList(items: string[]): string {
  return items.map(item => `  • ${item}`).join('\n')
}

/**
 * Generic validator for collecting and managing validation errors and warnings.
 * Provides a clean interface for accumulating validation results.
 */
class ValidationCollector {
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

  getResults(): { errors: string[]; warnings: string[] } {
    return { errors: this.errors, warnings: this.warnings }
  }
}

/**
 * Verifies that the project where the plugin is used has a package.json and the required @uipath/uipath-typescript SDK is installed as a dependency.
 * Throws a configuration error if either check fails.
 */
function checkSdkInstalled(): void {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    throw createConfigError(`[${PLUGIN_NAME}] ${MESSAGES.PACKAGE_JSON_NOT_FOUND}`)
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const deps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}

    if (!deps[SDK_PACKAGE_NAME] && !devDeps[SDK_PACKAGE_NAME]) {
      throw createConfigError(`[${PLUGIN_NAME}] ${MESSAGES.SDK_NOT_INSTALLED}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes(MESSAGES.SDK_NOT_INSTALLED)) {
      throw err
    }
    throw createConfigError(`[${PLUGIN_NAME}] ${MESSAGES.PACKAGE_JSON_READ_ERROR(err)}`)
  }
}

/**
 * Check config keys for format issues and unknown keys.
 * Returns both formatting errors (e.g., client_id vs clientId) and unknown key warnings.
 */
function checkConfigKeys(config: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  const collector = new ValidationCollector()

  for (const key of Object.keys(config)) {
    const matchingKey = findMatchingValidKey(key)

    if (matchingKey && matchingKey !== key) {
      // Found a match but wrong format (e.g., client_id instead of clientId)
      collector.addError(MESSAGES.INVALID_KEY_FORMAT(key, matchingKey))
    } else if (!matchingKey) {
      // No matching valid key found - unknown key
      collector.addWarning(MESSAGES.UNKNOWN_KEY(key))
    }
  }

  return collector.getResults()
}

/**
 * Check for required config keys.
 * Validates that required keys are present, with different requirements for dev vs prod environments.
 */
function checkRequiredKeys(config: Record<string, unknown>, isDev: boolean): { errors: string[]; warnings: string[] } {
  const collector = new ValidationCollector()

  // Scope is always required
  if (!config[REQUIRED_KEY_ALWAYS]) {
    collector.addError(MESSAGES.MISSING_REQUIRED_KEY(REQUIRED_KEY_ALWAYS))
  }

  // Check other dev keys
  const missingDevKeys = REQUIRED_KEYS_DEV_LIST.filter(key => key !== REQUIRED_KEY_ALWAYS && !config[key])
  if (missingDevKeys.length > 0) {
    if (isDev) {
      collector.addError(MESSAGES.MISSING_DEV_KEYS([...missingDevKeys]))
    } else {
      collector.addWarning(MESSAGES.DEV_KEYS_INJECTED_AT_DEPLOYMENT([...missingDevKeys]))
    }
  }

  return collector.getResults()
}

export function validateConfig(
  config: Record<string, unknown>,
  configPath: string,
  isDev = false
): ValidationResult {
  const { errors: keyFormatErrors, warnings: unknownKeyWarnings } = checkConfigKeys(config)
  const { errors: requiredKeyErrors, warnings: requiredKeyWarnings } = checkRequiredKeys(config, isDev)

  const errors = [...keyFormatErrors, ...requiredKeyErrors]
  const warnings = [...unknownKeyWarnings, ...requiredKeyWarnings]

  // Log results
  if (errors.length > 0) {
    console.error(`\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}`)
    console.error(formatErrorList(errors))
  }

  if (warnings.length > 0) {
    console.warn(`\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_WARNINGS_HEADER(configPath)}`)
    console.warn(formatErrorList(warnings))
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_LOADED(configPath)}`)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

export function readConfig(options: ReadConfigOptions = {}): UiPathConfig {
  const { configPath = CONFIG_FILE_NAME, isDev = false } = options
  const fullPath = path.resolve(process.cwd(), configPath)

  // Check SDK is installed in dev mode
  if (isDev) {
    checkSdkInstalled()
  }

  // Check file exists - config is optional since deployment can inject values
  if (!fs.existsSync(fullPath)) {
    if (isDev) {
      // In dev mode, throw error - developers need config for local testing
      throw createConfigError(
        `\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_NOT_FOUND(fullPath)}\n\n` +
        `For local development, create a ${CONFIG_FILE_NAME} file with:\n` +
        JSON.stringify(SAMPLE_CONFIG, null, 2)
      )
    } else {
      // In prod build, just log info - deployment will inject config
      console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_INJECTED_AT_DEPLOYMENT}`)
      // Return empty config - no meta tags will be injected during build
      return {} as UiPathConfig
    }
  }

  // Parse JSON
  let config: Record<string, unknown>
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    config = JSON.parse(content)
  } catch (err) {
    throw createConfigError(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_PARSE_ERROR(configPath, err)}`)
  }

  // Validate
  const validation = validateConfig(config, configPath, isDev)
  if (!validation.isValid) {
    throw createConfigError(
      `[${PLUGIN_NAME}] ${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}\n` +
      formatErrorList(validation.errors)
    )
  }

  return config as UiPathConfig
}

/**
 * Type guard to check if a string is a valid config key
 */
function isValidConfigKey(key: string): key is ValidConfigKey {
  return getValidConfigKeys().includes(key as ValidConfigKey)
}

function getMetaTagName(configKey: string): string {
  if (!isValidConfigKey(configKey)) return ''
  const suffix = UIPATH_META_TAGS[configKey]
  return suffix ? `${META_TAG_PREFIX}:${suffix}` : ''
}

export function generateMetaTags(config: UiPathConfig): ViteMetaTag[] {
  const tags: ViteMetaTag[] = []

  for (const [key, value] of Object.entries(config)) {
    const metaName = getMetaTagName(key)
    if (metaName && value) {
      tags.push({
        tag: 'meta',
        attrs: { name: metaName, content: String(value) },
        injectTo: 'head',
      })
    }
  }

  return tags
}

export function generateMetaTagsHtml(config: UiPathConfig): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(config)) {
    const metaName = getMetaTagName(key)
    if (metaName && value) {
      lines.push(`<meta name="${metaName}" content="${value}">`)
    }
  }

  return lines.join('\n  ')
}

// HTML Transformation (Framework-agnostic)

/**
 * Transform HTML string by injecting UiPath config meta tags into <head>
 * This is the core function used by all framework integrations
 *
 * @param html - The HTML string to transform
 * @param options - Configuration options
 * @returns Transformed HTML string with meta tags injected
 */
export function transformHtml(html: string, options: ReadConfigOptions = {}): string {
  const config = readConfig(options)

  // If no config (prod build without uipath.json), return unchanged
  if (Object.keys(config).length === 0) {
    return html
  }

  const metaTagsHtml = generateMetaTagsHtml(config)

  if (!metaTagsHtml) {
    return html
  }

  // Inject before </head>
  const headCloseIndex = html.indexOf('</head>')
  if (headCloseIndex === -1) {
    console.warn(`[${PLUGIN_NAME}] ${MESSAGES.HTML_HEAD_TAG_NOT_FOUND}`)
    return html
  }

  return html.slice(0, headCloseIndex) + `  ${metaTagsHtml}\n  ` + html.slice(headCloseIndex)
}
