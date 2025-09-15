export interface EnvironmentConfig {
  baseUrl: string;
  orgId: string;
  tenantId: string;
  tenantName: string;
  folderKey?: string;
  bearerToken: string;
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  systemName: string;
  appUrl: string;
  registeredAt: string;
}