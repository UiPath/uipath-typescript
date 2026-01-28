export interface EnvironmentConfig {
  baseUrl: string;
  orgId: string;
  orgName: string;
  tenantId: string;
  tenantName?: string;
  folderKey?: string;
  accessToken: string;
}

/**
 * CLI flags for environment configuration - same shape as EnvironmentConfig but all optional
 */
export type EnvironmentFlags = Partial<EnvironmentConfig>;

/**
 * Build a partial EnvironmentConfig from CLI flags, filtering out undefined values
 */
export function buildConfigFromFlags(flags: EnvironmentFlags): Partial<EnvironmentConfig> {
  return Object.fromEntries(
    Object.entries(flags).filter(([_, value]) => value !== undefined)
  ) as Partial<EnvironmentConfig>;
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  systemName: string;
  appUrl: string | null;
  registeredAt: string;
  deploymentId?: string;
  deployedAt?: string;
}

/**
 * SDK configuration type for uipath.json
 * Note: scope is optional when clientId is provided (uses client's registered scopes)
 */
export interface SdkConfig {
  scope?: string;
  clientId: string;
  orgName: string;
  tenantName: string;
  baseUrl: string;
  redirectUri: string;
}