import { config } from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from .env.integration
config({ path: path.resolve(__dirname, '../../.env.integration') });

// Define Zod schema for configuration validation
const integrationConfigSchema = z.object({
  baseUrl: z.string().url('UIPATH_BASE_URL must be a valid URL'),
  orgName: z.string().min(1, 'UIPATH_ORG_NAME is required'),
  tenantName: z.string().min(1, 'UIPATH_TENANT_NAME is required'),
  secret: z.string().min(1, 'UIPATH_SECRET is required'),
  timeout: z.number().positive().default(30000),
  skipCleanup: z.boolean().default(false),
  folderId: z.string().optional(),
  maestroTestProcessKey: z.string().optional(),
  orchestratorTestProcessKey: z.string().optional(),
  dataFabricTestEntityId: z.string().optional(),
});

export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;

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

  try {
    cachedConfig = integrationConfigSchema.parse(rawConfig);
    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Integration test configuration is invalid:\n${messages}\n\n` +
        `Please ensure you have created a .env.integration file based on .env.integration.example ` +
        `and filled in all required values.`
      );
    }
    throw error;
  }
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
