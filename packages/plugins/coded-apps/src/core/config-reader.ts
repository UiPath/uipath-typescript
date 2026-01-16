import fs from 'node:fs'
import path from 'node:path'
import {
  PLUGIN_NAME,
  CONFIG_FILE_NAME,
  SDK_PACKAGE_NAME,
  REQUIRED_KEY_ALWAYS,
  REQUIRED_KEYS_DEV,
  SAMPLE_CONFIG,
  MESSAGES,
} from '../constants'
import type { UiPathConfig, ReadConfigOptions, ValidationResult } from '../types'
import { ValidationCollector, KeyUtils, ErrorUtils } from './utils'

/**
 * Handles reading and validating UiPath configuration files.
 * Manages SDK checks, file I/O, and validation logic.
 */
export class ConfigReader {
  /**
   * Read and validate configuration from file.
   * @throws Error if validation fails in dev mode
   */
  read(options: ReadConfigOptions = {}): UiPathConfig {
    const { configPath = CONFIG_FILE_NAME, isDev = false } = options
    const fullPath = path.resolve(process.cwd(), configPath)

    // Check SDK in dev mode
    if (isDev) {
      this.checkSdkInstalled()
    }

    // Handle missing config
    if (!fs.existsSync(fullPath)) {
      return this.handleMissingConfig(fullPath, configPath, isDev)
    }

    // Parse and validate
    const config = this.parseConfigFile(fullPath, configPath)
    this.validateAndLog(config, configPath, isDev)

    return config as UiPathConfig
  }

  /**
   * Validate configuration without logging (for testing).
   */
  validate(config: Record<string, unknown>, isDev: boolean): ValidationResult {
    const collector = new ValidationCollector()

    this.validateKeyFormats(config, collector)
    this.validateRequiredKeys(config, isDev, collector)

    const results = collector.getResults()
    return {
      isValid: !collector.hasErrors(),
      ...results,
    }
  }

  // ===== PRIVATE METHODS =====

  private checkSdkInstalled(): void {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
      throw ErrorUtils.createError(MESSAGES.PACKAGE_JSON_NOT_FOUND)
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const deps = packageJson.dependencies || {}
      const devDeps = packageJson.devDependencies || {}

      if (!deps[SDK_PACKAGE_NAME] && !devDeps[SDK_PACKAGE_NAME]) {
        throw ErrorUtils.createError(MESSAGES.SDK_NOT_INSTALLED)
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes(MESSAGES.SDK_NOT_INSTALLED)) {
        throw err
      }
      throw ErrorUtils.createError(MESSAGES.PACKAGE_JSON_READ_ERROR(err))
    }
  }

  private handleMissingConfig(
    fullPath: string,
    configPath: string,
    isDev: boolean
  ): UiPathConfig {
    if (isDev) {
      throw ErrorUtils.createError(
        `\n${MESSAGES.CONFIG_NOT_FOUND(fullPath)}\n\n` +
        `For local development, create a ${CONFIG_FILE_NAME} file with:\n` +
        JSON.stringify(SAMPLE_CONFIG, null, 2)
      )
    } else {
      console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_INJECTED_AT_DEPLOYMENT}`)
      return {} as UiPathConfig
    }
  }

  private parseConfigFile(fullPath: string, configPath: string): Record<string, unknown> {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      return JSON.parse(content)
    } catch (err) {
      throw ErrorUtils.createError(MESSAGES.CONFIG_PARSE_ERROR(configPath, err))
    }
  }

  private validateAndLog(
    config: Record<string, unknown>,
    configPath: string,
    isDev: boolean
  ): void {
    const validation = this.validate(config, isDev)

    // Log results
    if (validation.errors.length > 0) {
      console.error(`\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}`)
      console.error(ErrorUtils.formatList(validation.errors))
    }

    if (validation.warnings.length > 0) {
      console.warn(`\n[${PLUGIN_NAME}] ${MESSAGES.CONFIG_WARNINGS_HEADER(configPath)}`)
      console.warn(ErrorUtils.formatList(validation.warnings))
    }

    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      console.log(`[${PLUGIN_NAME}] ${MESSAGES.CONFIG_LOADED(configPath)}`)
    }

    // Throw if invalid
    if (!validation.isValid) {
      throw ErrorUtils.createError(
        `${MESSAGES.CONFIG_ERRORS_HEADER(configPath)}\n` +
        ErrorUtils.formatList(validation.errors)
      )
    }
  }

  private validateKeyFormats(
    config: Record<string, unknown>,
    collector: ValidationCollector
  ): void {
    for (const key of Object.keys(config)) {
      const matchingKey = KeyUtils.findMatch(key)

      if (matchingKey && matchingKey !== key) {
        collector.addError(MESSAGES.INVALID_KEY_FORMAT(key, matchingKey))
      } else if (!matchingKey) {
        collector.addWarning(MESSAGES.UNKNOWN_KEY(key))
      }
    }
  }

  private validateRequiredKeys(
    config: Record<string, unknown>,
    isDev: boolean,
    collector: ValidationCollector
  ): void {
    // Scope is always required
    if (!config[REQUIRED_KEY_ALWAYS]) {
      collector.addError(MESSAGES.MISSING_REQUIRED_KEY(REQUIRED_KEY_ALWAYS))
    }

    // Check dev-specific keys
    const missingDevKeys = REQUIRED_KEYS_DEV.filter(
      key => key !== REQUIRED_KEY_ALWAYS && !config[key]
    )

    if (missingDevKeys.length > 0) {
      if (isDev) {
        collector.addError(MESSAGES.MISSING_DEV_KEYS([...missingDevKeys]))
      } else {
        collector.addWarning(MESSAGES.DEV_KEYS_INJECTED_AT_DEPLOYMENT([...missingDevKeys]))
      }
    }
  }
}
