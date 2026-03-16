import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.integration
config({ path: path.resolve(__dirname, '../../.env.integration') });

export interface IntegrationConfig {
  baseUrl: string;
  orgName: string;
  tenantName: string;
  secret: string;
  timeout: number;
  skipCleanup: boolean;
  folderId?: string;
  maestroTestProcessKey?: string;
  orchestratorTestProcessKey?: string;
  dataFabricTestEntityId?: string;
}

function isValidUrl(value: string): boolean {
  try {
    void new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateConfig(rawConfig: Record<string, unknown>): IntegrationConfig {
  const errors: string[] = [];

  if (typeof rawConfig.baseUrl !== 'string' || !isValidUrl(rawConfig.baseUrl)) {
    errors.push('  - baseUrl: UIPATH_BASE_URL must be a valid URL');
  }
  if (typeof rawConfig.orgName !== 'string' || rawConfig.orgName.length === 0) {
    errors.push('  - orgName: UIPATH_ORG_NAME is required');
  }
  if (typeof rawConfig.tenantName !== 'string' || rawConfig.tenantName.length === 0) {
    errors.push('  - tenantName: UIPATH_TENANT_NAME is required');
  }
  if (typeof rawConfig.secret !== 'string' || rawConfig.secret.length === 0) {
    errors.push('  - secret: UIPATH_SECRET is required');
  }

  if (errors.length > 0) {
    throw new Error(
      `Integration test configuration is invalid:\n${errors.join('\n')}\n\n` +
      `Please ensure you have created a .env.integration file based on .env.integration.example ` +
      `and filled in all required values.`
    );
  }

  return {
    baseUrl: rawConfig.baseUrl as string,
    orgName: rawConfig.orgName as string,
    tenantName: rawConfig.tenantName as string,
    secret: rawConfig.secret as string,
    timeout: typeof rawConfig.timeout === 'number' && rawConfig.timeout > 0 ? rawConfig.timeout : 30000,
    skipCleanup: typeof rawConfig.skipCleanup === 'boolean' ? rawConfig.skipCleanup : false,
    folderId: typeof rawConfig.folderId === 'string' ? rawConfig.folderId : undefined,
    maestroTestProcessKey: typeof rawConfig.maestroTestProcessKey === 'string' ? rawConfig.maestroTestProcessKey : undefined,
    orchestratorTestProcessKey: typeof rawConfig.orchestratorTestProcessKey === 'string' ? rawConfig.orchestratorTestProcessKey : undefined,
    dataFabricTestEntityId: typeof rawConfig.dataFabricTestEntityId === 'string' ? rawConfig.dataFabricTestEntityId : undefined,
  };
}

let cachedConfig: IntegrationConfig | null = null;

/**
 * Loads and validates integration test configuration from environment variables.
 * Configuration is cached after first load.
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {IntegrationConfig} Validated configuration object
 */
export function loadIntegrationConfig(): IntegrationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawConfig = {
    baseUrl: process.env.UIPATH_BASE_URL,
    orgName: process.env.UIPATH_ORG_NAME,
    tenantName: process.env.UIPATH_TENANT_NAME,
    secret: process.env.UIPATH_SECRET,
    timeout: process.env.INTEGRATION_TEST_TIMEOUT
      ? parseInt(process.env.INTEGRATION_TEST_TIMEOUT, 10)
      : 30000,
    skipCleanup: process.env.INTEGRATION_TEST_SKIP_CLEANUP === 'true',
    folderId: process.env.INTEGRATION_TEST_FOLDER_ID || undefined,
    maestroTestProcessKey: process.env.MAESTRO_TEST_PROCESS_KEY || undefined,
    orchestratorTestProcessKey: process.env.ORCHESTRATOR_TEST_PROCESS_KEY || undefined,
    dataFabricTestEntityId: process.env.DATA_FABRIC_TEST_ENTITY_ID || undefined,
  };

  cachedConfig = validateConfig(rawConfig);
  return cachedConfig;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
