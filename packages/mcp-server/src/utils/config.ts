import type { UiPathMCPConfig } from '../types/index.js';

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): UiPathMCPConfig {
  const baseUrl = process.env.UIPATH_BASE_URL;
  const orgName = process.env.UIPATH_ORG_NAME;
  const tenantName = process.env.UIPATH_TENANT_NAME;
  const secret = process.env.UIPATH_SECRET;

  if (!baseUrl || !orgName || !tenantName || !secret) {
    throw new Error(
      'Missing required environment variables. Please set:\n' +
      '  - UIPATH_BASE_URL\n' +
      '  - UIPATH_ORG_NAME\n' +
      '  - UIPATH_TENANT_NAME\n' +
      '  - UIPATH_SECRET'
    );
  }

  return {
    baseUrl,
    orgName,
    tenantName,
    secret,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: UiPathMCPConfig): void {
  if (!config.baseUrl.startsWith('http')) {
    throw new Error('baseUrl must start with http:// or https://');
  }

  if (!config.orgName || !config.tenantName) {
    throw new Error('orgName and tenantName are required');
  }

  if (!config.secret) {
    throw new Error('secret is required for authentication');
  }
}
