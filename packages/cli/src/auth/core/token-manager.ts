import fs from 'fs-extra';
import path from 'path';
import { TokenResponse } from './oidc.js';
import { SelectedTenant } from '../services/portal.js';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { getBaseUrl } from '../utils/url.js';
import { calculateExpirationTime } from '../utils/date.js';

const UIPATH_DIR = path.join(process.cwd(), '.uipath');
const AUTH_FILE = path.join(UIPATH_DIR, '.auth.json');
const ENV_FILE = path.join(process.cwd(), '.env');

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
  idToken?: string;
  organizationId?: string;
  domain: string;
  tenantId?: string;
  tenantName?: string;
  organizationName?: string;
}

export const saveTokensWithTenant = async (
  tokens: TokenResponse,
  domain: string,
  tenant: SelectedTenant,
  folderKey?: string | null
): Promise<void> => {
  // Ensure .uipath directory exists
  await fs.ensureDir(UIPATH_DIR);

  // Calculate expiration time
  const expiresAt = calculateExpirationTime(tokens.expiresIn);

  const authData: StoredAuth = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
    tokenType: tokens.tokenType,
    scope: tokens.scope,
    idToken: tokens.idToken,
    organizationId: tenant.organizationId,
    domain,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    organizationName: tenant.organizationName,
  };

  // Save to auth file with atomic write
  await atomicWriteJson(AUTH_FILE, authData);

  // Get base URL from domain
  const baseUrl = getBaseUrl(domain);

  // Update .env file with environment variables
  const envVars: Record<string, string> = {
    [AUTH_CONSTANTS.ENV_CONFIG.ACCESS_TOKEN.envVar]: tokens.accessToken,
    [AUTH_CONSTANTS.ENV_CONFIG.BASE_URL.envVar]: baseUrl,
    [AUTH_CONSTANTS.ENV_CONFIG.TENANT_ID.envVar]: tenant.tenantId,
    [AUTH_CONSTANTS.ENV_CONFIG.ORG_ID.envVar]: tenant.organizationId,
    [AUTH_CONSTANTS.ENV_CONFIG.TENANT_NAME.envVar]: tenant.tenantName,
    [AUTH_CONSTANTS.ENV_CONFIG.ORG_NAME.envVar]: tenant.organizationName,
  };

  // Add folder key if provided
  if (folderKey) {
    envVars[AUTH_CONSTANTS.ENV_CONFIG.FOLDER_KEY.envVar] = folderKey;
  }

  await updateEnvFile(envVars);
};

export const loadTokens = async (): Promise<StoredAuth | null> => {
  try {
    if (await fs.pathExists(AUTH_FILE)) {
      return await fs.readJson(AUTH_FILE);
    }
  } catch (error) {
    console.error('Error loading auth tokens:', error);
  }
  return null;
};

export const clearTokens = async (): Promise<void> => {
  try {
    if (await fs.pathExists(AUTH_FILE)) {
      await fs.remove(AUTH_FILE);
    }
    // Clear from .env
    await updateEnvFile({
      [AUTH_CONSTANTS.ENV_CONFIG.ACCESS_TOKEN.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.BASE_URL.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.TENANT_ID.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.ORG_ID.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.TENANT_NAME.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.ORG_NAME.envVar]: '',
      [AUTH_CONSTANTS.ENV_CONFIG.FOLDER_KEY.envVar]: '',
    });
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export const isTokenExpired = (auth: StoredAuth): boolean => {
  return Date.now() >= auth.expiresAt;
};

const updateEnvFile = async (vars: Record<string, string>): Promise<void> => {
  let envContent = '';
  
  // Read existing .env file if it exists
  if (await fs.pathExists(ENV_FILE)) {
    envContent = await fs.readFile(ENV_FILE, 'utf-8');
  }

  // Parse existing variables
  const lines = envContent.split('\n');
  const existingVars: Record<string, string> = {};
  const otherLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      existingVars[match[1]] = match[2];
    } else if (line.trim()) {
      otherLines.push(line);
    }
  }

  // Update with new variables
  Object.assign(existingVars, vars);

  // Build new content
  const newLines: string[] = [];
  
  // Add other lines first (comments, etc.)
  newLines.push(...otherLines);
  
  if (otherLines.length > 0 && Object.keys(existingVars).length > 0) {
    newLines.push(''); // Add blank line separator
  }

  // Add all environment variables
  for (const [key, value] of Object.entries(existingVars)) {
    if (value) { // Only add non-empty values
      newLines.push(`${key}=${value}`);
    }
  }

  // Write back to file
  await fs.writeFile(ENV_FILE, newLines.join('\n') + '\n', 'utf-8');
};

const atomicWriteJson = async (filePath: string, data: any): Promise<void> => {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeJson(tmpPath, data, { spaces: 2 });
  await fs.rename(tmpPath, filePath);
};