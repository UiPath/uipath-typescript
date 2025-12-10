import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';
import { MESSAGES } from '../constants/messages.js';
import { VALID_NAME_REGEX, AUTH_CONSTANTS } from '../constants/index.js';

interface ValidationResult {
  isValid: boolean;
  config?: EnvironmentConfig;
  missingVars?: string[];
}

// Build lookup maps from ENV_CONFIG
const ENV_CONFIG = AUTH_CONSTANTS.ENV_CONFIG;

const ENV_VAR_TO_CONFIG_KEY = Object.fromEntries(
  Object.values(ENV_CONFIG).map(cfg => [cfg.envVar, cfg.configKey])
) as Record<string, keyof EnvironmentConfig>;

const ENV_VAR_TO_EXAMPLE = Object.fromEntries(
  Object.values(ENV_CONFIG).map(cfg => [cfg.envVar, `${cfg.envVar}=${cfg.example}`])
) as Record<string, string>;

const ENV_VAR_TO_FLAG = Object.fromEntries(
  Object.values(ENV_CONFIG).map(cfg => [cfg.envVar, `${cfg.flag} ${cfg.example}`])
) as Record<string, string>;

/**
 * Validates app/package name to ensure it only contains allowed characters.
 * Allowed: letters (a-z, A-Z), numbers (0-9), underscores (_), and hyphens (-)
 */
export function isValidAppName(name: string): boolean {
  const validNameRegex = VALID_NAME_REGEX;
  return validNameRegex.test(name);
}

/**
 * Merges flag config with environment variables, flags take precedence
 */
function mergeConfigValues(
  requiredVars: readonly string[],
  flagConfig?: Partial<EnvironmentConfig>
): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = {};

  for (const envVar of requiredVars) {
    const configKey = ENV_VAR_TO_CONFIG_KEY[envVar];
    const flagValue = configKey && flagConfig?.[configKey];
    merged[envVar] = flagValue || process.env[envVar];
  }

  return merged;
}

/**
 * Finds missing required environment variables (excludes BASE_URL which has a default)
 */
function findMissingVars(
  requiredVars: readonly string[],
  mergedValues: Record<string, string | undefined>
): string[] {
  return requiredVars.filter(envVar => {
    if (envVar === ENV_CONFIG.BASE_URL.envVar) return false; // Has default
    return !mergedValues[envVar];
  });
}

/**
 * Logs helpful error messages for missing configuration
 */
function logMissingConfigError(
  missing: string[],
  logger: { log: (message: string) => void }
): void {
  logger.log(chalk.red(MESSAGES.VALIDATIONS.MISSING_REQUIRED_CONFIG));
  missing.forEach(envVar => logger.log(chalk.red(`  - ${envVar}`)));

  logger.log('');
  logger.log(chalk.yellow(MESSAGES.VALIDATIONS.PROVIDE_VIA_ENV_OR_FLAGS));

  // Show env var examples
  logger.log('');
  logger.log(chalk.dim(MESSAGES.VALIDATIONS.ENV_VARIABLES_HEADER));
  missing.forEach(envVar => {
    if (ENV_VAR_TO_EXAMPLE[envVar]) {
      logger.log(chalk.dim(`  ${ENV_VAR_TO_EXAMPLE[envVar]}`));
    }
  });

  // Show flag examples
  logger.log('');
  logger.log(chalk.dim(MESSAGES.VALIDATIONS.ARGUMENTS_HEADER));
  missing.forEach(envVar => {
    if (ENV_VAR_TO_FLAG[envVar]) {
      logger.log(chalk.dim(`  ${ENV_VAR_TO_FLAG[envVar]}`));
    }
  });
}

/**
 * Normalizes base URL to ensure it has a protocol
 */
function normalizeBaseUrl(url: string | undefined): string {
  let baseUrl = url || 'https://cloud.uipath.com';
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  return baseUrl;
}

/**
 * Builds EnvironmentConfig from merged values
 */
function buildConfig(
  mergedValues: Record<string, string | undefined>,
  requiredVars: readonly string[]
): EnvironmentConfig {
  const config: EnvironmentConfig = {
    baseUrl: normalizeBaseUrl(mergedValues[ENV_CONFIG.BASE_URL.envVar]),
    orgId: mergedValues[ENV_CONFIG.ORG_ID.envVar]!,
    tenantId: mergedValues[ENV_CONFIG.TENANT_ID.envVar]!,
    tenantName: mergedValues[ENV_CONFIG.TENANT_NAME.envVar]!,
    accessToken: mergedValues[ENV_CONFIG.ACCESS_TOKEN.envVar]!,
  };

  if (requiredVars.includes(ENV_CONFIG.FOLDER_KEY.envVar)) {
    config.folderKey = mergedValues[ENV_CONFIG.FOLDER_KEY.envVar]!;
  }

  return config;
}

/**
 * Validates environment configuration with support for flag-based overrides.
 * Flags take precedence over environment variables.
 */
export function validateEnvironment(
  requiredVars: readonly string[],
  logger: { log: (message: string) => void },
  flagConfig?: Partial<EnvironmentConfig>
): ValidationResult {
  const mergedValues = mergeConfigValues(requiredVars, flagConfig);
  const missing = findMissingVars(requiredVars, mergedValues);

  if (missing.length > 0) {
    logMissingConfigError(missing, logger);
    return { isValid: false, missingVars: missing };
  }

  return { isValid: true, config: buildConfig(mergedValues, requiredVars) };
}

/**
 * Gets environment config from flags, validating required variables.
 * Returns null if validation fails (error messages are logged).
 */
export function getEnvironmentConfig(
  requiredVars: readonly string[],
  logger: { log: (message: string) => void },
  flags: Partial<EnvironmentConfig>
): EnvironmentConfig | null {
  const result = validateEnvironment(requiredVars, logger, flags);
  return result.isValid ? result.config! : null;
}
