import { getLoginStatusAsync } from '@uipath/auth';

function setEnvIfPresent(envVar: string, value: string | undefined): void {
  if (value) {
    process.env[envVar] = value;
  }
}

/**
 * Load credentials from @uipath/auth into process.env so that
 * getEnvironmentConfig() in the cli package can resolve them.
 *
 * The auth package stores credentials in .uipath/.auth (not CWD .env),
 * so there are no conflicts with the user's project .env files.
 *
 * Only process.env is populated (in-memory). The user's CWD .env is
 * never touched.
 */
export async function loadAuthCredentials(): Promise<void> {
  try {
    const status = await getLoginStatusAsync({
      ensureTokenValidityMinutes: 5,
    });

    if (status.loginStatus !== 'Logged in') return;

    setEnvIfPresent('UIPATH_ACCESS_TOKEN', status.accessToken);
    setEnvIfPresent('UIPATH_BASE_URL', status.baseUrl);
    setEnvIfPresent('UIPATH_URL', status.baseUrl);
    setEnvIfPresent('UIPATH_ORG_ID', status.organizationId);
    setEnvIfPresent('UIPATH_ORGANIZATION_ID', status.organizationId);
    setEnvIfPresent('UIPATH_ORG_NAME', status.organizationName);
    setEnvIfPresent('UIPATH_TENANT_ID', status.tenantId);
    setEnvIfPresent('UIPATH_TENANT_NAME', status.tenantName);
  } catch {
    // Silently continue — credentials will need to be provided via env vars or CLI flags
  }
}
