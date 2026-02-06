import { z } from 'zod';
import { TokenStorage, TOKEN_STORAGE_OPTIONS } from './sdk-config';

export const ConfigSchema = z.object({
  baseUrl: z.string().url().default('https://cloud.uipath.com'),
  orgName: z.string().min(1),
  tenantName: z.string().min(1),
  secret: z.string().optional(),
  clientId: z.string().optional(),
  redirectUri: z.string().url().optional(),
  scope: z.string().optional(),
  tokenStorage: z.enum(TOKEN_STORAGE_OPTIONS).optional()
});

export type Config = z.infer<typeof ConfigSchema>;

interface ConfigOptions {
  baseUrl: string;
  orgName: string;
  tenantName: string;
  secret?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  tokenStorage?: TokenStorage;
}

export class UiPathConfig {
  public readonly baseUrl: string;
  public readonly orgName: string;
  public readonly tenantName: string;
  public readonly secret?: string;
  public readonly clientId?: string;
  public readonly redirectUri?: string;
  public readonly scope?: string;
  public readonly tokenStorage: TokenStorage; // Always defined (defaults to 'sessionStorage')

  constructor(options: ConfigOptions) {
    this.baseUrl = options.baseUrl;
    this.orgName = options.orgName;
    this.tenantName = options.tenantName;
    this.secret = options.secret;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.scope = options.scope;
    this.tokenStorage = options.tokenStorage || 'sessionStorage'; // Default to sessionStorage
  }
}

export type { ConfigOptions };
