import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';
import { isBrowser } from '../../utils/platform';
import { UiPathMetaTags } from '../../utils/runtime/constants';
import { UiPathEnvVars } from './environment';

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
  const missingBase = (['baseUrl', 'orgName', 'tenantName'] as const).filter((field) => !found[field]);
  if (missingBase.length > 0) gaps.push(`missing ${missingBase.join(', ')}`);

  // Read both first: chaining the predicates leaves the second nothing to test.
  const foundSecret = hasSecretConfig(found);
  const foundOAuth = hasOAuthConfig(found);

  // An auth gap only when NEITHER method is complete — otherwise the clause names nothing.
  if (!foundSecret && !foundOAuth) {
    const named = (['clientId', 'redirectUri', 'scope'] as const).filter((field) => found[field]);
    gaps.push(named.length > 0
      ? `the OAuth configuration is incomplete — ${named.join(', ')} set, ` +
        `${(['clientId', 'redirectUri', 'scope'] as const).filter((f) => !found[f]).join(', ')} missing`
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
 */
export function missingConfigMessage(found?: PartialUiPathConfig): string {
  // Ordered by likelihood: on a runner the environment is never populated, so
  // leading with it would point the reader at the one option that cannot work.
  const guidance = isBrowser
    ? 'Ensure @uipath/coded-apps plugin is set up in your bundler to inject configuration during development and build.'
    : 'In a UiPath coded function, pass the handler context: new UiPath(ctx). ' +
      'Otherwise pass { baseUrl, orgName, tenantName, secret }, ' +
      'or set UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME and UIPATH_ACCESS_TOKEN.';

  if (!found) return `UiPath SDK configuration not found. ${guidance}`;
  return `UiPath SDK configuration is incomplete: ${describeGaps(found)}. ${guidance}`;
}

/** The fields that decide the authentication method. */
const AUTH_FIELDS = ['secret', 'clientId', 'redirectUri', 'scope'] as const;

type AuthField = typeof AUTH_FIELDS[number];

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
