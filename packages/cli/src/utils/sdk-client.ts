/**
 * SDK Client Initialization Utility
 *
 * Provides a UiPath SDK client instance initialized from stored authentication
 * or environment variables.
 */

// Dynamic import to handle optional peer dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let UiPath: any = null;

async function loadSDK(): Promise<any> {
  if (UiPath) return UiPath;

  // Dynamic import with type assertion to avoid TS errors for optional peer deps
  const loadModule = async (moduleName: string): Promise<any> => {
    try {
      // Use Function constructor to avoid static analysis by TypeScript
      const dynamicImport = new Function('moduleName', 'return import(moduleName)');
      return await dynamicImport(moduleName);
    } catch {
      return null;
    }
  };

  // Try @uipath/sdk first (published package name)
  let sdk = await loadModule('@uipath/sdk');
  if (sdk?.UiPath) {
    UiPath = sdk.UiPath;
    return UiPath;
  }

  // Fall back to workspace package
  sdk = await loadModule('@uipath/uipath-typescript');
  if (sdk?.UiPath) {
    UiPath = sdk.UiPath;
    return UiPath;
  }

  throw new Error(
    'UiPath SDK not found.\n\n' +
    'Please install the SDK:\n' +
    '  npm install @uipath/sdk\n\n' +
    'Or for workspace development:\n' +
    '  npm install @uipath/uipath-typescript'
  );
}

import { loadTokens } from '../auth/core/token-manager.js';
import { getBaseUrl } from '../auth/utils/url.js';

let cachedClient: any = null;

/**
 * Get an initialized UiPath SDK client
 *
 * The client is initialized from:
 * 1. Stored authentication tokens (from `uipath auth` command)
 * 2. Environment variables (UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME, UIPATH_PAT_TOKEN)
 *
 * @throws Error if no valid authentication is available
 */
export async function getSDKClient(): Promise<any> {
  // Return cached client if available
  if (cachedClient) {
    return cachedClient;
  }

  // Load SDK first
  const UiPathClass = await loadSDK();

  // Try to load from stored tokens first
  const storedAuth = await loadTokens();

  if (storedAuth && storedAuth.accessToken) {
    // Use stored OAuth token as secret (bearer token)
    const baseUrl = getBaseUrl(storedAuth.domain || 'cloud');

    cachedClient = new UiPathClass({
      baseUrl,
      orgName: storedAuth.organizationId,
      tenantName: storedAuth.tenantName,
      secret: storedAuth.accessToken
    });

    return cachedClient;
  }

  // Fall back to environment variables
  const baseUrl = process.env.UIPATH_BASE_URL;
  const orgName = process.env.UIPATH_ORG_NAME;
  const tenantName = process.env.UIPATH_TENANT_NAME;
  const patToken = process.env.UIPATH_PAT_TOKEN;

  if (patToken && baseUrl && orgName && tenantName) {
    cachedClient = new UiPathClass({
      baseUrl,
      orgName,
      tenantName,
      secret: patToken
    });

    return cachedClient;
  }

  // No valid authentication found
  throw new Error(
    'No valid authentication found.\n\n' +
    'Please authenticate using one of these methods:\n\n' +
    '1. Interactive login:\n' +
    '   uipath auth\n\n' +
    '2. Environment variables:\n' +
    '   export UIPATH_BASE_URL=https://cloud.uipath.com\n' +
    '   export UIPATH_ORG_NAME=your-org\n' +
    '   export UIPATH_TENANT_NAME=your-tenant\n' +
    '   export UIPATH_PAT_TOKEN=your-pat-token'
  );
}

/**
 * Clear the cached client (useful after logout)
 */
export function clearSDKClient(): void {
  cachedClient = null;
}

/**
 * Check if there's valid authentication available
 */
export async function hasValidAuth(): Promise<boolean> {
  try {
    await getSDKClient();
    return true;
  } catch {
    return false;
  }
}
