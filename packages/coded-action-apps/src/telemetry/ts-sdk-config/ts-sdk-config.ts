// Base configuration with common required fields
export interface BaseConfig {
  baseUrl: string;
  orgName: string;
  tenantName: string;
}

// OAuth specific fields
export interface OAuthFields {
  clientId: string;
}

// Flexible partial type for constructor input (allows any combination of fields)
export type PartialUiPathConfig = Partial<BaseConfig & OAuthFields>;
