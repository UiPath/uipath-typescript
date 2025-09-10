export interface EnvironmentConfig {
  uipathUrl: string;
  orgId: string;
  tenantId: string;
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