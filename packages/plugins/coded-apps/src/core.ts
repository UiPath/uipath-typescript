import fs from 'node:fs'
import path from 'node:path'
import type { UiPathConfig, ValidationResult, ReadConfigOptions, ViteMetaTag } from './types'
import {
  PLUGIN_NAME,
  CONFIG_FILE_NAME,
  SDK_PACKAGE_NAME,
  VALID_CONFIG_KEYS,
  REQUIRED_KEY_ALWAYS,
  REQUIRED_KEYS_DEV,
  TYPO_CORRECTIONS,
  UIPATH_META_TAGS,
  META_TAG_PREFIX,
  SAMPLE_CONFIG,
  MESSAGES,
} from './constants'

function createConfigError(message: string): Error {
  const error = new Error(message)
  error.stack = '' // Hide stack trace for config errors
  return error
}

function formatErrorList(items: string[]): string {
  return items.map(item => `  • ${item}`).join('\n')
}

function checkSdkInstalled(): void {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    throw createConfigError(`[${PLUGIN_NAME}] ❌ No package.json found in project root`)
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const deps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}

    if (!deps[SDK_PACKAGE_NAME] && !devDeps[SDK_PACKAGE_NAME]) {
      throw createConfigError(`[${PLUGIN_NAME}] ❌ ${MESSAGES.SDK_NOT_INSTALLED}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes(MESSAGES.SDK_NOT_INSTALLED)) {
      throw err
    }
    throw createConfigError(`[${PLUGIN_NAME}] ❌ Failed to read package.json: ${err}`)
  }
}

function checkForTypos(config: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const key of Object.keys(config)) {
    const correction = TYPO_CORRECTIONS[key]
    if (correction) {
      errors.push(MESSAGES.TYPO_DETECTED(key, correction))
    }
  }
  return errors
}

function checkForUnknownKeys(config: Record<string, unknown>): string[] {
  const warnings: string[] = []
  for (const key of Object.keys(config)) {
    const isValidKey = VALID_CONFIG_KEYS.includes(key as typeof VALID_CONFIG_KEYS[number])
    const isTypo = key in TYPO_CORRECTIONS
    if (!isValidKey && !isTypo) {
      warnings.push(MESSAGES.UNKNOWN_KEY(key))
    }
  }
  return warnings
}

function checkRequiredKeys(config: Record<string, unknown>, isDev: boolean): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Scope is always required
  if (!config[REQUIRED_KEY_ALWAYS]) {
    errors.push(MESSAGES.MISSING_REQUIRED_KEY(REQUIRED_KEY_ALWAYS))
  }

  // Check other dev keys
  const missingDevKeys = REQUIRED_KEYS_DEV.filter(key => key !== REQUIRED_KEY_ALWAYS && !config[key])
  if (missingDevKeys.length > 0) {
    if (isDev) {
      errors.push(MESSAGES.MISSING_DEV_KEYS([...missingDevKeys]))
    } else {
      warnings.push(MESSAGES.DEV_KEYS_INJECTED_AT_DEPLOYMENT([...missingDevKeys]))
    }
  }

  return { errors, warnings }
}

export function validateConfig(
  config: Record<string, unknown>,
  configPath: string,
  isDev = false
): ValidationResult {
  const typoErrors = checkForTypos(config)
  const unknownKeyWarnings = checkForUnknownKeys(config)
  const { errors: requiredKeyErrors, warnings: requiredKeyWarnings } = checkRequiredKeys(config, isDev)

  const errors = [...typoErrors, ...requiredKeyErrors]
  const warnings = [...unknownKeyWarnings, ...requiredKeyWarnings]

  // Log results
  if (errors.length > 0) {
    console.error(`\n[${PLUGIN_NAME}] ❌ ${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}`)
    console.error(formatErrorList(errors))
  }

  if (warnings.length > 0) {
    console.warn(`\n[${PLUGIN_NAME}] ⚠️  ${MESSAGES.CONFIG_WARNINGS_HEADER(configPath)}`)
    console.warn(formatErrorList(warnings))
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`[${PLUGIN_NAME}] ✓ ${MESSAGES.CONFIG_LOADED(configPath)}`)
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
        `\n[${PLUGIN_NAME}] ❌ ${MESSAGES.CONFIG_NOT_FOUND(fullPath)}\n\n` +
        `For local development, create a ${CONFIG_FILE_NAME} file with:\n` +
        JSON.stringify(SAMPLE_CONFIG, null, 2)
      )
    } else {
      // In prod build, just log info - deployment will inject config
      console.log(`[${PLUGIN_NAME}] ℹ️  No ${CONFIG_FILE_NAME} found - config will be injected at deployment`)
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
    throw createConfigError(`[${PLUGIN_NAME}] ❌ ${MESSAGES.CONFIG_PARSE_ERROR(configPath, err)}`)
  }

  // Validate
  const validation = validateConfig(config, configPath, isDev)
  if (!validation.isValid) {
    throw createConfigError(
      `[${PLUGIN_NAME}] ❌ ${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}\n` +
      formatErrorList(validation.errors)
    )
  }

  return config as UiPathConfig
}

function getMetaTagName(configKey: string): string {
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
    console.warn(`[${PLUGIN_NAME}] ⚠️  No </head> tag found in HTML - meta tags not injected`)
    return html
  }

  return html.slice(0, headCloseIndex) + `  ${metaTagsHtml}\n  ` + html.slice(headCloseIndex)
}
