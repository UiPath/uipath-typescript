declare module "@uipath/auth" {
  export type LoginStatusValue = "Logged in" | "Not logged in" | "Expired";

  export interface LoginStatus {
    loginStatus: LoginStatusValue;
    accessToken?: string;
    refreshToken?: string;
    baseUrl?: string;
    organizationName?: string;
    organizationId?: string;
    tenantName?: string;
    tenantId?: string;
    expiration?: Date;
    hint?: string;
  }

  export function getLoginStatusAsync(options?: {
    envFilePath?: string;
    ensureTokenValidityMinutes?: number;
  }): Promise<LoginStatus>;

  export function resolveEnvFilePathAsync(
    envFilePath?: string,
  ): Promise<{ absolutePath: string | undefined; errorMessage?: string }>;

  export function saveEnvFileAsync(options: {
    envPath: string;
    data: Record<string, string | undefined>;
    merge?: boolean;
  }): Promise<void>;
}
