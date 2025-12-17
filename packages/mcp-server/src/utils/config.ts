import type { UiPathMCPConfig } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): UiPathMCPConfig {
  // Log the environment variables for debugging (without exposing the secret)
  logger.debug('Environment variables check:');
  logger.debug(`  UIPATH_BASE_URL: ${process.env.UIPATH_BASE_URL ? 'Set' : 'Not set'}`);
  logger.debug(`  UIPATH_ORG_NAME: ${process.env.UIPATH_ORG_NAME ? 'Set' : 'Not set'}`);
  logger.debug(`  UIPATH_TENANT_NAME: ${process.env.UIPATH_TENANT_NAME ? 'Set' : 'Not set'}`);
  logger.debug(`  UIPATH_SECRET: ${process.env.UIPATH_SECRET ? 'Set (hidden)' : 'Not set'}`);
  
  const baseUrl = process.env.UIPATH_BASE_URL;
  const orgName = process.env.UIPATH_ORG_NAME;
  const tenantName = process.env.UIPATH_TENANT_NAME;
  const secret = process.env.UIPATH_SECRET || process.env.UIPATH_CLIENT_SECRET; // Support both names

  if (!baseUrl || !orgName || !tenantName || !secret) {
    // Provide more detailed error message
    const missing = [];
    if (!baseUrl) missing.push('UIPATH_BASE_URL');
    if (!orgName) missing.push('UIPATH_ORG_NAME');
    if (!tenantName) missing.push('UIPATH_TENANT_NAME');
    if (!secret) missing.push('UIPATH_SECRET or UIPATH_CLIENT_SECRET');
    
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
      'Please ensure these are set in your MCP client configuration:\n' +
      '  UIPATH_BASE_URL (e.g., https://cloud.uipath.com)\n' +
      '  UIPATH_ORG_NAME (your organization name)\n' +
      '  UIPATH_TENANT_NAME (your tenant name)\n' +
      '  UIPATH_SECRET (your authentication token)\n\n' +
      'For Claude Desktop, add these to the "env" section of your server config.'
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
