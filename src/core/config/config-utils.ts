import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';
import type { CodedFunctionContext } from './function-context';
import { isBrowser } from '../../utils/platform';
import { UiPathMetaTags } from '../../utils/runtime/constants';
import { UiPathEnvVars } from './environment';

/** The base fields every configuration needs, whichever authentication method it carries. */
const BASE_FIELDS = ['baseUrl', 'orgName', 'tenantName'] as const;

/** The three fields that together make one complete OAuth configuration. */
const OAUTH_FIELDS = ['clientId', 'redirectUri', 'scope'] as const;

/** The fields that decide the authentication method. */
const AUTH_FIELDS = ['secret', ...OAUTH_FIELDS] as const;

type AuthField = typeof AUTH_FIELDS[number];

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Check if config has all required base fields
 */
function hasRequiredBaseFields(config: PartialUiPathConfig): boolean {
  return Boolean(config.baseUrl && config.orgName && config.tenantName);
}

/**
 * Check if config has exactly one authentication method (secret XOR oauth)
 * Returns true if exactly one auth method is present, false otherwise
 */
function hasValidAuthConfig(config: PartialUiPathConfig): boolean {
  const hasSecret = hasSecretConfig(config);
  const hasOAuth = hasOAuthConfig(config);

  // XOR: exactly one auth method, not both, not neither
  return hasSecret !== hasOAuth;
}

/**
 * `value` trimmed, or undefined when it is null, undefined or blank: a coordinate a host left empty
 * is missing, not set.
 */
export function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The http(s) origin of `value` — scheme, host and port — or null when it is not an absolute
 * http(s) URL.
 */
export function toHttpOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    console.warn(`[UiPath SDK] baseUrl "${value}" is not a URL:`, error);
    return null;
  }
  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    console.warn(`[UiPath SDK] baseUrl "${value}" is not an http(s) URL; ignored.`);
    return null;
  }
  return url.origin;
}

/** `names` as prose: "A", "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.slice(-1).join('')}`;
}

/**
 * Check if partial config has all required fields for a complete SDK config
 * Requires base fields and exactly one authentication method (secret XOR oauth)
 */
export function isCompleteConfig(config: PartialUiPathConfig): config is UiPathSDKConfig {
  return hasRequiredBaseFields(config) && hasValidAuthConfig(config);
}

/**
 * Drop keys whose value is undefined so a sparse higher-precedence layer never
 * blanks out a value supplied by a lower-precedence one during a merge.
 */
export function compactConfig(config: PartialUiPathConfig): PartialUiPathConfig {
  // Cast: Object.fromEntries resolves to its any-returning overload for a
  // mutable [string, string | undefined][] input.
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  ) as PartialUiPathConfig;
}

export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function describeGaps(found: PartialUiPathConfig): string {
  const gaps: string[] = [];
  const missingBase = BASE_FIELDS.filter((field) => !found[field]);
  if (missingBase.length > 0) gaps.push(`missing ${missingBase.join(', ')}`);

  // Read both first: chaining the predicates leaves the second nothing to test.
  const foundSecret = hasSecretConfig(found);
  const foundOAuth = hasOAuthConfig(found);

  // An auth gap only when NEITHER method is complete — otherwise the clause names nothing.
  if (!foundSecret && !foundOAuth) {
    const named = OAUTH_FIELDS.filter((field) => found[field]);
    gaps.push(named.length > 0
      ? `the OAuth configuration is incomplete — ${named.join(', ')} set, ` +
        `${OAUTH_FIELDS.filter((field) => !found[field]).join(', ')} missing`
      : 'no authentication method set (needs `secret`, or clientId, redirectUri and scope)');
  }

  return gaps.join('; ');
}

/**
 * Configuration-not-found guidance, matched to where the SDK is running.
 *
 * Shared so the registry can reuse it when a service is constructed from a
 * UiPath instance that never resolved a configuration — otherwise the caller
 * only learns their instance is "invalid", not why.
 *
 * When a coded app's injected config carries base fields but a required OAuth
 * field is empty (clientId or redirectUri), name the missing field(s) instead
 * of claiming nothing was found. scope is not required here: Identity falls
 * back to the client's registered scopes when it is omitted.
 *
 * @param found - The merged configuration that came up incomplete, when there is one
 * @param context - The coded-function context the instance was built from, when there was one; the
 *   message then names the coordinates that context lacks instead of advising to pass it
 */
export function missingConfigMessage(found?: PartialUiPathConfig, context?: CodedFunctionContext): string {
  if (context) {
    return missingContextMessage(found ?? {}, context);
  }

  if (isBrowser) {
    // An injected-but-empty clientId/redirectUri is the likeliest cause in a
    // coded app and names its own fix, so it precedes the generic text.
    if (found && hasRequiredBaseFields(found) && !hasSecretConfig(found)) {
      const missing: string[] = [];
      if (!found.clientId) missing.push('clientId');
      if (!found.redirectUri) missing.push('redirectUri');
      // Only when the plugin injected some OAuth field — a page with none is
      // "not configured", handled by the generic message below.
      if (missing.length > 0 && (found.clientId || found.redirectUri || found.scope)) {
        const fields = missing.join(' and ');
        const verb = missing.length > 1 ? 'are' : 'is';
        const clientHint = missing.includes('clientId')
          ? ' clientId must be a non-confidential OAuth client, or pass one with --client-id at deploy.'
          : '';
        return `UiPath SDK configuration is incomplete: ${fields} ${verb} empty. Set ${missing.length > 1 ? 'them' : 'it'} in uipath.json and redeploy.${clientHint}`;
      }
    }
    return 'UiPath SDK configuration not found. ' +
      'Ensure @uipath/coded-apps plugin is set up in your bundler to inject configuration during development and build.';
  }

  // Ordered by likelihood: on a runner the environment is never populated, so
  // leading with it would point the reader at the one option that cannot work.
  const guidance =
    'In a UiPath coded function, pass the handler context: new UiPath(ctx). ' +
    'Otherwise pass { baseUrl, orgName, tenantName, secret }, ' +
    'or set UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME and UIPATH_ACCESS_TOKEN.';

  if (!found) return `UiPath SDK configuration not found. ${guidance}`;
  return `UiPath SDK configuration is incomplete: ${describeGaps(found)}. ${guidance}`;
}

/**
 * The context was passed and the environment merged in, yet the configuration is still incomplete:
 * name each coordinate the merge lacks by its place on the context and the variable that could fill
 * it. Judged on the merged config, so a coordinate the environment did supply is never reported.
 */
function missingContextMessage(config: PartialUiPathConfig, context: CodedFunctionContext): string {
  const missing: string[] = [];
  if (!hasRequiredBaseFields(config)) {
    if (!context.platform) {
      const variables: string[] = [];
      if (!config.baseUrl) variables.push(UiPathEnvVars.BASE_URL);
      if (!config.orgName) variables.push(UiPathEnvVars.ORG_NAME);
      if (!config.tenantName) variables.push(UiPathEnvVars.TENANT_NAME);
      missing.push(`ctx.platform is null (or set ${joinNames(variables)})`);
    } else {
      if (!config.baseUrl) {
        const baseUrl = nonBlank(context.platform.baseUrl);
        const problem = baseUrl === undefined ? 'is empty' : `"${baseUrl}" is not an http(s) URL`;
        missing.push(`ctx.platform.baseUrl ${problem} (or set ${UiPathEnvVars.BASE_URL})`);
      }
      if (!config.orgName) missing.push(`ctx.platform.orgId is empty (or set ${UiPathEnvVars.ORG_NAME})`);
      if (!config.tenantName) missing.push(`ctx.platform.tenantId is empty (or set ${UiPathEnvVars.TENANT_NAME})`);
    }
  }
  if (!hasSecretConfig(config) && !hasOAuthConfig(config)) {
    missing.push(`ctx.robot.accessToken is null (or set ${UiPathEnvVars.ACCESS_TOKEN})`);
  }
  if (missing.length === 0) {
    return 'UiPath SDK configuration is incomplete: ' +
      'the handler context passed to new UiPath(ctx) does not form a complete configuration.';
  }
  return `UiPath SDK configuration is incomplete: ${missing.join('; ')}. ` +
    'A deployed Function receives these coordinates on the handler context; a local run sets the variables named.';
}

/**
 * Non-constructor source per auth field. `secret` has no meta tag and no OAuth field
 * has an env var, so a both-methods merge always has a constructor argument on one side.
 */
const AUTH_FIELD_SOURCES: Record<AuthField, { metaTag?: UiPathMetaTags; envVar?: string }> = {
  secret: { envVar: UiPathEnvVars.ACCESS_TOKEN },
  clientId: { metaTag: UiPathMetaTags.CLIENT_ID },
  redirectUri: { metaTag: UiPathMetaTags.REDIRECT_URI },
  scope: { metaTag: UiPathMetaTags.SCOPE },
};

/** The configuration layers, highest precedence first. */
export interface ConfigSources {
  config?: PartialUiPathConfig | null;
  metaConfig?: PartialUiPathConfig | null;
  environment?: PartialUiPathConfig | null;
}

/** The layer that supplied a field, if any. */
function sourceOf(field: AuthField, sources: ConfigSources): string | undefined {
  if (sources.config?.[field]) return 'the constructor argument';
  const { metaTag, envVar } = AUTH_FIELD_SOURCES[field];
  if (metaTag && sources.metaConfig?.[field]) return `<meta name="${metaTag}">`;
  if (envVar && sources.environment?.[field]) return `the ${envVar} environment variable`;
  return undefined;
}

/** Names every auth field and the layer that supplied it, so both halves are visible. */
export function conflictingAuthMessage(sources: ConfigSources): string {
  const inventory = AUTH_FIELDS
    .map((field) => ({ field, source: sourceOf(field, sources) }))
    .filter((entry): entry is { field: AuthField; source: string } => Boolean(entry.source))
    .map(({ field, source }) => `  ${field}: ${source}`)
    .join('\n');

  const namedOAuth = AUTH_FIELDS.filter(
    (field) => field !== 'secret' && Boolean(sources.config?.[field]),
  );

  // Dropping the caller's OAuth fields is what makes the merge discard the injected ones.
  const remedy = namedOAuth.length > 0
    ? `Remove ${namedOAuth.join(', ')} from the constructor argument to authenticate with secret, ` +
      'or remove secret to authenticate with OAuth.'
    : 'Pass exactly one authentication method.';

  return 'Invalid UiPath SDK configuration: it carries both authentication methods. ' +
    'The SDK authenticates with secret, or with OAuth (clientId, redirectUri and scope), never both.\n' +
    `${inventory}\n` +
    'Every field the constructor argument leaves unset is inherited from the meta tags and the ' +
    'environment, so naming one field of each method ends up carrying both. ' +
    remedy;
}
