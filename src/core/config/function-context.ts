import { PartialUiPathConfig } from './sdk-config';

/**
 * Platform coordinates a coded function receives, mirroring `PlatformContext`
 * from `@uipath/coded-functions-js-sdk`.
 */
export interface CodedFunctionPlatform {
  /** Platform host, without a path — for example `https://cloud.uipath.com`. */
  baseUrl: string;
  /** Organization id (GUID, not slug). */
  orgId: string;
  /** Tenant id (GUID, not slug). */
  tenantId: string;
  /** Folder key of the invocation, if any. The SDK ignores it. */
  folderKey?: string | null;
}

/**
 * The function's own platform identity, mirroring `RobotContext` from
 * `@uipath/coded-functions-js-sdk`.
 */
export interface CodedFunctionRobot {
  /** Platform-issued token the SDK uses to authenticate its calls. */
  accessToken: string | null;
  /** Serverless robot key. The SDK ignores it. */
  key?: string | null;
}

/**
 * The execution context a coded function receives, which can be passed straight
 * to the {@link UiPath} constructor.
 *
 * Mirrors `FunctionContext` from `@uipath/coded-functions-js-sdk` by shape, so
 * neither package depends on the other. Fields the SDK does not read — `user`,
 * `params`, `headers` — are ignored.
 */
export interface CodedFunctionContext {
  /** Coordinates for outbound calls. Null when the host supplies none. */
  platform: CodedFunctionPlatform | null;
  /** The function's identity, carrying the token. Null on a local run. */
  robot: CodedFunctionRobot | null;
}

/**
 * Distinguishes a coded-function context from SDK configuration.
 *
 * The shapes are disjoint — configuration never carries `platform` or `robot` —
 * so the caller never has to say which one it passed.
 */
export function isFunctionContext(
  value: PartialUiPathConfig | CodedFunctionContext,
): value is CodedFunctionContext {
  return 'platform' in value || 'robot' in value;
}

/**
 * Maps a coded-function context onto SDK configuration.
 *
 * Null when the context has no coordinates — a local run, where `platform` is
 * null — so the caller falls through to its other sources.
 */
export function configFromFunctionContext(
  context: CodedFunctionContext,
): PartialUiPathConfig | null {
  const { platform, robot } = context;
  if (!platform) return null;

  // Org and tenant ids go where orgName/tenantName go — the platform accepts
  // either in that URL position — and the token goes to `secret`, used verbatim
  // as the bearer value. `baseUrl` must already be host-only: a host that holds
  // a longer URL has to reduce it, or org and tenant appear in the path twice.
  const config: PartialUiPathConfig = {
    baseUrl: platform.baseUrl,
    orgName: platform.orgId,
    tenantName: platform.tenantId,
    secret: robot?.accessToken ?? undefined,
  };

  return Object.values(config).some(Boolean) ? config : null;
}
