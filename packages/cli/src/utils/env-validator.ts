import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';
import { MESSAGES } from '../constants/messages.js';

interface ValidationResult {
  isValid: boolean;
  config?: EnvironmentConfig;
  missingVars?: string[];
}

/**
 * Validates environment configuration with support for flag-based overrides.
 * Flags take precedence over environment variables.
 *
 * @param requiredVars - Array of required environment variable names
 * @param logger - Logger instance with log method
 * @param flagConfig - Optional partial config from CLI flags (takes precedence)
 * @returns ValidationResult with config if valid
 */
export function validateEnvironment(
  requiredVars: string[],
  logger: { log: (message: string) => void },
  flagConfig?: Partial<EnvironmentConfig>
): ValidationResult {
  // Map environment variable names to config keys
  const envVarToConfigKey: Record<string, keyof EnvironmentConfig> = {
    'UIPATH_BASE_URL': 'baseUrl',
    'UIPATH_ORG_ID': 'orgId',
    'UIPATH_TENANT_ID': 'tenantId',
    'UIPATH_TENANT_NAME': 'tenantName',
    'UIPATH_FOLDER_KEY': 'folderKey',
    'UIPATH_BEARER_TOKEN': 'bearerToken',
  };

  // Build merged config (flags override env vars)
  const mergedValues: Record<string, string | undefined> = {};

  for (const envVar of requiredVars) {
    const configKey = envVarToConfigKey[envVar];
    if (configKey && flagConfig && flagConfig[configKey]) {
      // Use flag value
      mergedValues[envVar] = flagConfig[configKey];
    } else {
      // Use env var value
      mergedValues[envVar] = process.env[envVar];
    }
  }

  // Check for missing values (exclude UIPATH_BASE_URL as it has a default)
  const missing = requiredVars.filter(envVar => {
    if (envVar === 'UIPATH_BASE_URL') {
      return false; // Base URL has a default, so never consider it missing
    }
    return !mergedValues[envVar];
  });

  if (missing.length > 0) {
    logger.log(chalk.red(MESSAGES.VALIDATIONS.MISSING_REQUIRED_CONFIG));
    missing.forEach(envVar => {
      logger.log(chalk.red(`  - ${envVar}`));
    });
    logger.log('');
    logger.log(chalk.yellow(MESSAGES.VALIDATIONS.PROVIDE_VIA_ENV_OR_FLAGS));
    logger.log('');
    logger.log(chalk.dim(MESSAGES.VALIDATIONS.ENV_VARIABLES_HEADER));

    // Show examples for known variables
    const examples: Record<string, string> = {
      'UIPATH_BASE_URL': 'UIPATH_BASE_URL=https://cloud.uipath.com',
      'UIPATH_ORG_ID': 'UIPATH_ORG_ID=your-org-id',
      'UIPATH_TENANT_ID': 'UIPATH_TENANT_ID=your-tenant-id',
      'UIPATH_TENANT_NAME': 'UIPATH_TENANT_NAME=your-tenant-name',
      'UIPATH_FOLDER_KEY': 'UIPATH_FOLDER_KEY=your-folder-key',
      'UIPATH_BEARER_TOKEN': 'UIPATH_BEARER_TOKEN=your-bearer-token',
    };

    missing.forEach(envVar => {
      if (examples[envVar]) {
        logger.log(chalk.dim(`  ${examples[envVar]}`));
      }
    });

    logger.log('');
    logger.log(chalk.dim(MESSAGES.VALIDATIONS.ARGUMENTS_HEADER));

    const flagExamples: Record<string, string> = {
      'UIPATH_BASE_URL': '--baseUrl https://cloud.uipath.com',
      'UIPATH_ORG_ID': '--orgId your-org-id',
      'UIPATH_TENANT_ID': '--tenantId your-tenant-id',
      'UIPATH_TENANT_NAME': '--tenantName your-tenant-name',
      'UIPATH_FOLDER_KEY': '--folderKey your-folder-key',
      'UIPATH_BEARER_TOKEN': '--authToken your-auth-token',
    };

    missing.forEach(envVar => {
      if (flagExamples[envVar]) {
        logger.log(chalk.dim(`  ${flagExamples[envVar]}`));
      }
    });

    return { isValid: false, missingVars: missing };
  }

  // Apply default for base URL if not provided
  let baseUrl = mergedValues['UIPATH_BASE_URL'] || 'https://cloud.uipath.com';

  // Normalize the base URL to ensure it has the protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  const config: EnvironmentConfig = {
    baseUrl,
    orgId: mergedValues['UIPATH_ORG_ID']!,
    tenantId: mergedValues['UIPATH_TENANT_ID']!,
    tenantName: mergedValues['UIPATH_TENANT_NAME']!,
    bearerToken: mergedValues['UIPATH_BEARER_TOKEN']!,
  };

  // Add optional fields if they're in the required list
  if (requiredVars.includes('UIPATH_FOLDER_KEY')) {
    config.folderKey = mergedValues['UIPATH_FOLDER_KEY']!;
  }

  return { isValid: true, config };
}