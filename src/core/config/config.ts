import { z } from 'zod';
import type { TokenStorage } from './sdk-config';

export const ConfigSchema = z.object({
  baseUrl: z.string().url().default('https://cloud.uipath.com'),
  orgName: z.string().min(1),
  tenantName: z.string().min(1),
  organizationId: z.string().optional(),
  secret: z.string().optional(),
  clientId: z.string().optional(),
  redirectUri: z.string().url().optional(),
  scope: z.string().optional(),
  enforceSso: z.boolean().optional(),
  tokenStorage: z.enum(['sessionStorage', 'localStorage']).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

interface ConfigOptions {
  baseUrl: string;
  orgName: string;
  tenantName: string;
  organizationId?: string;
  secret?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  enforceSso?: boolean;
  tokenStorage?: TokenStorage;
}

export class UiPathConfig {
  public readonly baseUrl: string;
  public readonly orgName: string;
  public readonly tenantName: string;
  /** Organization (partition) GUID when supplied explicitly; otherwise resolved lazily by the SDK. */
  public readonly organizationId?: string;
  public readonly secret?: string;
  public readonly clientId?: string;
  public readonly redirectUri?: string;
  public readonly scope?: string;
  public readonly enforceSso?: boolean;
  public readonly tokenStorage?: TokenStorage;

  constructor(options: ConfigOptions) {
    this.baseUrl = options.baseUrl;
    this.orgName = options.orgName;
    this.tenantName = options.tenantName;
    this.organizationId = options.organizationId;
    this.secret = options.secret;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.scope = options.scope;
    this.enforceSso = options.enforceSso;
    this.tokenStorage = options.tokenStorage;
  }
}

export type { ConfigOptions };
