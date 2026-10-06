import { PartialUiPathConfig } from './sdk-config';
import { nonBlank, toHttpOrigin } from './config-utils';

/**
 * Platform coordinates a coded function receives, mirroring `PlatformContext`
 * from `@uipath/coded-functions-js-sdk`.
 */
export interface CodedFunctionPlatform {
  /**
   * Platform host, such as `https://cloud.uipath.com`. A longer URL is reduced to its origin; one
   * that is not http(s) counts as missing.
   */
  baseUrl: string;
  /** Organization id (GUID, not slug). */
  orgId: string;
  /** Tenant id (GUID, not slug). */
  tenantId: string;
  /**
   * Folder key of the invocation, if any. It becomes the default folder for calls that need one
   * and name none. Integration Service calls stay unscoped, so they reach a connection in any folder.
   */
  folderKey?: string | null;
}

/**
 * The function's own platform identity, mirroring `RobotContext` from
 * `@uipath/coded-functions-js-sdk`.
 */
export interface CodedFunctionRobot {
  /** Platform-issued token the SDK uses to authenticate its calls. */
  accessToken: string | null;
  /** Serverless robot key, sent where Orchestrator asks which robot is calling. */
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
 * Null when the context carries nothing — a local run, where `platform` and
 * `robot` are null — so the caller falls through to its other sources. A blank
 * coordinate is left out rather than copied, so the environment can still fill
 * it in the merge; a context that hands over a token but no platform
 * contributes the token alone.
 */
export function configFromFunctionContext(
  context: CodedFunctionContext,
): PartialUiPathConfig | null {
  const { platform, robot } = context;

  // Ids go where names go and the token is the bearer value; baseUrl is reduced to its origin (org
  // and tenant are appended to it) and left out when it is not http(s), for the error to name.
  const baseUrl = nonBlank(platform?.baseUrl);
  const config: PartialUiPathConfig = {
    baseUrl: baseUrl === undefined ? undefined : toHttpOrigin(baseUrl) ?? undefined,
    orgName: nonBlank(platform?.orgId),
    tenantName: nonBlank(platform?.tenantId),
    secret: nonBlank(robot?.accessToken),
  };

  return Object.values(config).some(Boolean) ? config : null;
}

/**
 * The invocation's folder key off a coded-function context, or undefined when it carries none
 * (null, empty or whitespace — a folder header must never be sent blank).
 */
export function folderKeyFromFunctionContext(context: CodedFunctionContext): string | undefined {
  return nonBlank(context.platform?.folderKey);
}

/**
 * The serverless robot's key off a coded-function context, or undefined when it carries none
 * (null, empty or whitespace — Orchestrator must never be sent a blank robot identifier).
 */
export function robotKeyFromFunctionContext(context: CodedFunctionContext): string | undefined {
  return nonBlank(context.robot?.key);
}
