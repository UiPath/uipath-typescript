import fs from 'fs-extra';
import path from 'path';
import { TokenResponse } from './oidc.js';
import { SelectedTenant } from '../services/portal.js';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { getBaseUrl } from '../utils/url.js';

const UIPATH_DIR = path.join(process.cwd(), '.uipath');
const AUTH_FILE = path.join(UIPATH_DIR, '.auth.json');
const ENV_FILE = path.join(process.cwd(), '.env');

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export const saveTokensWithTenant = async (
  tokens: TokenResponse,
  domain: string,
  tenant: SelectedTenant,
  folderKey?: string | null
): Promise<void> => {
  // Ensure .uipath directory exists
  await fs.ensureDir(UIPATH_DIR);

  const authData: StoredAuth = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: tokens.tokenType,
    scope: tokens.scope,
  };

  // Save to auth file with atomic write
  await atomicWriteJson(AUTH_FILE, authData);

  // Get base URL from domain
  const baseUrl = getBaseUrl(domain);

  // Update .env file with environment variables
  const envVars: Record<string, string> = {
    [AUTH_CONSTANTS.ENV_VARS.ACCESS_TOKEN]: tokens.accessToken,
    [AUTH_CONSTANTS.ENV_VARS.BASE_URL]: baseUrl,
    [AUTH_CONSTANTS.ENV_VARS.TENANT_ID]: tenant.tenantId,
    [AUTH_CONSTANTS.ENV_VARS.ORG_ID]: tenant.organizationId,
    [AUTH_CONSTANTS.ENV_VARS.TENANT_NAME]: tenant.tenantName,
    [AUTH_CONSTANTS.ENV_VARS.ORG_NAME]: tenant.organizationName,
  };

  // Add folder key if provided
  if (folderKey) {
    envVars[AUTH_CONSTANTS.ENV_VARS.FOLDER_KEY] = folderKey;
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
      [AUTH_CONSTANTS.ENV_VARS.ACCESS_TOKEN]: '',
      [AUTH_CONSTANTS.ENV_VARS.BASE_URL]: '',
      [AUTH_CONSTANTS.ENV_VARS.TENANT_ID]: '',
      [AUTH_CONSTANTS.ENV_VARS.ORG_ID]: '',
      [AUTH_CONSTANTS.ENV_VARS.TENANT_NAME]: '',
      [AUTH_CONSTANTS.ENV_VARS.ORG_NAME]: '',
      [AUTH_CONSTANTS.ENV_VARS.FOLDER_KEY]: '',
    });
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export const isTokenExpired = (auth: StoredAuth): boolean => {
  // Parse JWT to get issued at time
  try {
    const payload = JSON.parse(atob(auth.accessToken.split('.')[1]));
    const issuedAt = payload.iat * 1000; // Convert to milliseconds
    const expiresAt = issuedAt + (auth.expiresIn * 1000);
    return Date.now() >= expiresAt;
  } catch {
    // If we can't parse the JWT, consider it expired for safety
    return true;
  }
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