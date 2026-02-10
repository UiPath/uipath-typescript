import fs from 'node:fs'
import path from 'node:path'
import {
  PLUGIN_NAME,
  CONFIG_FILE_NAME,
  PACKAGE_JSON_FILE_NAME,
  SDK_PACKAGE_NAME,
  REQUIRED_KEYS_DEV_LIST,
  SAMPLE_CONFIG,
  MESSAGES,
} from '../constants'
import type { UiPathConfig, ReadConfigOptions, ValidationResult } from '../types'
import { ValidationCollector, findMatchingKey, createPluginError, formatList } from './utils'

/**
 * Read and validate configuration from file.
 * @throws Error if validation fails in dev mode
 */
export function readConfig(options: ReadConfigOptions = {}): UiPathConfig {
  const { configPath = CONFIG_FILE_NAME, isDev = false } = options
  const fullPath = path.resolve(process.cwd(), configPath)

  if (isDev) {
    checkSdkInstalled()
  }

  if (!fs.existsSync(fullPath)) {
    return handleMissingConfig(fullPath, configPath, isDev)
  }

  const config = parseConfigFile(fullPath, configPath)
  validateAndLog(config, configPath, isDev)

  return config as unknown as UiPathConfig
}

/**
 * Validate configuration without logging (for testing).
 */
export function validateConfig(config: Record<string, unknown>, isDev: boolean): ValidationResult {
  const collector = new ValidationCollector()

  validateKeyFormats(config, collector)
  validateRequiredKeys(config, isDev, collector)

  const results = collector.getResults()
  return {
    isValid: !collector.hasErrors(),
    ...results,
  }
}

// ===== PRIVATE HELPERS =====

function checkSdkInstalled(): void {
  const packageJsonPath = path.resolve(process.cwd(), PACKAGE_JSON_FILE_NAME)

  if (!fs.existsSync(packageJsonPath)) {
    throw createPluginError(MESSAGES.PACKAGE_JSON_NOT_FOUND)
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const deps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}

    if (!deps[SDK_PACKAGE_NAME] && !devDeps[SDK_PACKAGE_NAME]) {
      throw createPluginError(MESSAGES.SDK_NOT_INSTALLED)
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes(MESSAGES.SDK_NOT_INSTALLED)) {
      throw err
    }
    throw createPluginError(MESSAGES.PACKAGE_JSON_READ_ERROR(err))
  }
}

function handleMissingConfig(
  fullPath: string,
  configPath: string,
  isDev: boolean
): UiPathConfig {
  if (isDev) {
    throw createPluginError(
      `\n${MESSAGES.CONFIG_NOT_FOUND(fullPath)}\n\n` +
      MESSAGES.CONFIG_CREATE_HINT(configPath, JSON.stringify(SAMPLE_CONFIG, null, 2))
    )
  } else {
    console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_INJECTED_AT_DEPLOYMENT}`)
    return {} as unknown as UiPathConfig
  }
}

function parseConfigFile(fullPath: string, configPath: string): Record<string, unknown> {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    throw createPluginError(MESSAGES.CONFIG_PARSE_ERROR(configPath, err))
  }
}

function validateAndLog(
  config: Record<string, unknown>,
  configPath: string,
  isDev: boolean
): void {
  const validation = validateConfig(config, isDev)

  if (!validation.isValid) {
    throw createPluginError(
      `${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}\n` +
      formatList(validation.errors)
    )
  }

  if (validation.warnings.length > 0) {
    console.warn(`\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_WARNINGS_HEADER(configPath)}`)
    console.warn(formatList(validation.warnings))
  }

  if (validation.warnings.length === 0) {
    console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_LOADED(configPath)}`)
  }
}

function validateKeyFormats(
  config: Record<string, unknown>,
  collector: ValidationCollector
): void {
  for (const key of Object.keys(config)) {
    const matchingKey = findMatchingKey(key)

    if (matchingKey && matchingKey !== key) {
      collector.addError(MESSAGES.INVALID_KEY_FORMAT(key, matchingKey))
    } else if (!matchingKey) {
      collector.addWarning(MESSAGES.UNKNOWN_KEY(key))
    }
  }
}

function validateRequiredKeys(
  config: Record<string, unknown>,
  isDev: boolean,
  collector: ValidationCollector
): void {
  if (!isDev) return

  const missingDevKeys = REQUIRED_KEYS_DEV_LIST.filter(key => !config[key])

  if (missingDevKeys.length > 0) {
    collector.addWarning(MESSAGES.MISSING_DEV_KEYS(missingDevKeys))
  }
}
