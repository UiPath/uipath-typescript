import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import type { EnvironmentConfig, PolicyConfig } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { createHeaders } from '../utils/api.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface DeployPolicyOptions {
  policyId?: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface TenantPolicy {
  tenantIdentifier: string;
  policyIdentifier: string | null;
  productIdentifier: string;
  licenseTypeIdentifier: string;
  tenantName?: string;
}

interface TenantResponse {
  name: string;
  identifier: string;
  url: string;
  status: string;
  tenantPolicies: TenantPolicy[];
}

const AI_TRUST_LAYER_PRODUCT = 'AITrustLayer';

function loadPolicyConfig(logger: { log: (message: string) => void }): PolicyConfig | null {
  const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR, AUTH_CONSTANTS.FILES.POLICY_CONFIG);
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as PolicyConfig;
    }
  } catch (error) {
    logger.log(chalk.dim(`${MESSAGES.ERRORS.FAILED_TO_LOAD_POLICY_CONFIG} ${error instanceof Error ? error.message : ''}`));
  }
  return null;
}

async function getTenantPolicies(
  tenantId: string,
  envConfig: EnvironmentConfig
): Promise<TenantResponse> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}/${API_ENDPOINTS.TENANT_GET.replace('{tenantId}', tenantId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
    }),
  });

  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.POLICY_DEPLOY);
  }

  return (await response.json()) as TenantResponse;
}

async function deployTenantPolicies(
  policies: TenantPolicy[],
  envConfig: EnvironmentConfig
): Promise<void> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}/${API_ENDPOINTS.TENANT_SAVE}`;

  // Remove tenantName from the payload as it's not needed for the POST request
  const payload = policies.map(({ tenantName, ...policy }) => policy);

  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.POLICY_DEPLOY);
  }
}

export async function executeDeployPolicy(options: DeployPolicyOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };

  logger.log(chalk.blue(MESSAGES.INFO.POLICY_DEPLOYING));

  // Get policyId from options or load from stored config
  let policyId = options.policyId;
  if (!policyId) {
    const policyConfig = loadPolicyConfig(logger);
    if (policyConfig?.policyId) {
      policyId = policyConfig.policyId;
      logger.log(chalk.dim(`Using stored policy: ${policyConfig.policyName} (${policyId})`));
    } else {
      throw new Error(MESSAGES.ERRORS.POLICY_ID_REQUIRED);
    }
  }

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.DEPLOY_POLICY,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  const spinner = ora(MESSAGES.INFO.FETCHING_TENANT_POLICIES).start();

  try {
    // Step 1: Get current tenant policies
    const tenantData = await getTenantPolicies(envConfig.tenantId, envConfig);

    // Step 2: Find and update AITrustLayer policy
    const updatedPolicies = tenantData.tenantPolicies.map((policy) => {
      if (policy.productIdentifier === AI_TRUST_LAYER_PRODUCT) {
        return {
          ...policy,
          policyIdentifier: policyId,
        };
      }
      return policy;
    });

    // Check if AITrustLayer policy was found
    const aiTrustLayerPolicy = updatedPolicies.find(
      (p) => p.productIdentifier === AI_TRUST_LAYER_PRODUCT
    );
    if (!aiTrustLayerPolicy) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.AI_TRUST_LAYER_POLICY_NOT_FOUND));
      throw new Error(MESSAGES.ERRORS.AI_TRUST_LAYER_POLICY_NOT_FOUND);
    }

    spinner.text = MESSAGES.INFO.DEPLOYING_POLICY_TO_TENANT;

    // Step 3: Deploy updated policies
    await deployTenantPolicies(updatedPolicies, envConfig);

    spinner.succeed(chalk.green(MESSAGES.SUCCESS.POLICY_DEPLOYED_SUCCESS));
    cliTelemetryClient.track('Cli.DeployPolicy', { operation: 'deploy' });

    logger.log('');
    logger.log(`  ${chalk.cyan('Tenant:')} ${tenantData.name}`);
    logger.log(`  ${chalk.cyan('Tenant ID:')} ${tenantData.identifier}`);
    logger.log(`  ${chalk.cyan('Policy ID:')} ${policyId}`);
    logger.log(`  ${chalk.cyan('Product:')} ${AI_TRUST_LAYER_PRODUCT}`);
  } catch (error) {
    spinner.fail(chalk.red(MESSAGES.ERRORS.POLICY_DEPLOY_FAILED));
    throw error;
  }
}
