import { z } from 'zod';

export const ConfigSchema = z.object({
  baseUrl: z.string().url().default('https://cloud.uipath.com'),
  orgName: z.string().min(1),
  tenantName: z.string().min(1),
  secret: z.string().optional(),
  clientId: z.string().optional(),
  redirectUri: z.string().url().optional(),
  scope: z.string().optional(),
  runtimeAuthMode: z.string().optional(),
  appId: z.string().optional(),
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
  runtimeAuthMode?: string;
  appId?: string;
}

export class UiPathConfig {
  public readonly baseUrl: string;
  public readonly orgName: string;
  public readonly tenantName: string;
  public readonly secret?: string;
  public readonly clientId?: string;
  public readonly redirectUri?: string;
  public readonly scope?: string;
  /** 'anonymous' when the app runs in public mode (no user login). */
  public readonly runtimeAuthMode?: string;
  /** Deployment id used to build Apps-gateway routes in public mode. */
  public readonly appId?: string;

  constructor(options: ConfigOptions) {
    this.baseUrl = options.baseUrl;
    this.orgName = options.orgName;
    this.tenantName = options.tenantName;
    this.secret = options.secret;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.scope = options.scope;
    this.runtimeAuthMode = options.runtimeAuthMode;
    this.appId = options.appId;
  }
}

export type { ConfigOptions };
