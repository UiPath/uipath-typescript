import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import type { EnvironmentConfig, PolicyConfig } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { createHeaders } from '../utils/api.js';
import { getEnvironmentConfig, atomicWriteFileSync } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PublishPolicyOptions {
  file: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface PolicyInputData {
  'policy-name': string;
  'product-name'?: string;
  description?: string | null;
  version?: string;
  availability?: number;
  data: Record<string, unknown>;
}

interface PolicyCreateResponse {
  name: string;
  identifier: string;
  description: string | null;
  priority: number;
  availability: number;
}

const HARDCODED_PRODUCT = {
  name: 'AITrustLayer',
  label: 'AI Trust Layer',
  consumerProducts: [
    {
      name: 'Business',
      label: 'StudioX',
      isRestricted: false,
      isCloud: false,
      isRemote: false,
    },
    {
      name: 'Development',
      label: 'Studio',
      isRestricted: false,
      isCloud: false,
      isRemote: false,
    },
    {
      name: 'StudioWeb',
      label: 'Studio Web',
      isRestricted: false,
      isCloud: true,
      isRemote: false,
    },
  ],
  isRestricted: false,
  isCloud: true,
  isRemote: false,
};

function loadPolicyFile(filePath: string, logger: { log: (message: string) => void }): PolicyInputData {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${MESSAGES.ERRORS.POLICY_FILE_NOT_FOUND}: ${absolutePath}`);
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(content) as PolicyInputData;

    if (!parsed['policy-name']) {
      throw new Error(MESSAGES.ERRORS.POLICY_NAME_REQUIRED);
    }
    if (!parsed.data) {
      throw new Error(MESSAGES.ERRORS.POLICY_DATA_REQUIRED);
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${MESSAGES.ERRORS.POLICY_FILE_INVALID_JSON}: ${error.message}`);
    }
    throw error;
  }
}

function buildPolicyPayload(policyInput: PolicyInputData): Record<string, unknown> {
  return {
    policy: {
      availability: policyInput.availability ?? 99,
      name: policyInput['policy-name'],
      priority: 4,
      product: HARDCODED_PRODUCT,
      description: policyInput.description ?? null,
    },
    policyFormData: {
      data: {
        data: policyInput.data,
      },
    },
  };
}

function savePolicyConfig(config: PolicyConfig, logger: { log: (message: string) => void }): void {
  const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
  const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.POLICY_CONFIG);
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    atomicWriteFileSync(configPath, config);
  } catch (error) {
    logger.log(chalk.yellow(`${MESSAGES.ERRORS.FAILED_TO_SAVE_POLICY_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
  }
}

async function createPolicy(
  payload: Record<string, unknown>,
  envConfig: EnvironmentConfig
): Promise<PolicyCreateResponse> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}/${API_ENDPOINTS.POLICY_SAVE}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.POLICY_PUBLISHING);
  }

  return (await response.json()) as PolicyCreateResponse;
}

export async function executePublishPolicy(options: PublishPolicyOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };

  logger.log(chalk.blue(MESSAGES.INFO.POLICY_PUBLISHING));

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUBLISH_POLICY,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  const spinner = ora(MESSAGES.INFO.READING_POLICY_FILE).start();

  try {
    const policyInput = loadPolicyFile(options.file, logger);
    spinner.text = MESSAGES.INFO.PUBLISHING_POLICY;

    const payload = buildPolicyPayload(policyInput);
    const result = await createPolicy(payload, envConfig);

    spinner.succeed(chalk.green(MESSAGES.SUCCESS.POLICY_PUBLISHED_SUCCESS));
    cliTelemetryClient.track('Cli.PublishPolicy', { operation: 'create' });

    // Save policy config for later use by deploy-policy
    savePolicyConfig({
      policyId: result.identifier,
      policyName: result.name,
      publishedAt: new Date().toISOString(),
    }, logger);

    logger.log('');
    logger.log(`  ${chalk.cyan('Policy Name:')} ${result.name}`);
    logger.log(`  ${chalk.cyan('Policy ID:')} ${result.identifier}`);
    logger.log(`  ${chalk.cyan('Availability:')} ${result.availability}%`);
    if (result.description) {
      logger.log(`  ${chalk.cyan('Description:')} ${result.description}`);
    }
  } catch (error) {
    spinner.fail(chalk.red(MESSAGES.ERRORS.POLICY_PUBLISHING_FAILED));
    throw error;
  }
}
