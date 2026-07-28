import { SDK_VERSIONS, type SdkModule } from './registry.gen';
import type { MethodManifest, ParamManifest, ServiceManifest } from '../types/manifest';

/**
 * Connection settings for the playground.
 *
 * SECURITY: the PAT (`secret`) lives only in React state (memory). It is never
 * written to localStorage/sessionStorage, never logged, and never included in
 * generated code snippets. Closing or reloading the tab discards it.
 *
 * OAuth fields (`clientId`, `redirectUri`, `scope`) are public identifiers,
 * not secrets — they are persisted to sessionStorage so the connection
 * survives the identity-server redirect round-trip.
 */
export interface ConnectionConfig {
  /**
   * 'default' — platform-injected meta tags (coded-app deployment).
   * 'custom'  — PAT/secret auth with explicit org and tenant.
   * 'oauth'   — external application (App ID) with PKCE redirect flow.
   */
  mode: 'default' | 'custom' | 'oauth';
  baseUrl: string;
  orgName: string;
  tenantName: string;
  secret: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export const DEFAULT_CONNECTION: ConnectionConfig = {
  mode: 'default',
  baseUrl: 'https://cloud.uipath.com',
  orgName: '',
  tenantName: '',
  secret: '',
  clientId: '',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  scope: '',
};

interface UiPathClientLike {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  isInOAuthCallback(): boolean;
  completeOAuth(): Promise<boolean>;
  isAuthenticated(): boolean;
}

type UiPathCtor = new (
  config?: { baseUrl: string; orgName: string; tenantName: string } & (
    | { secret: string }
    | { clientId: string; redirectUri: string; scope: string }
  )
) => UiPathClientLike;

/**
 * OAuth config persisted across the identity-server redirect. Contains only
 * public identifiers — never tokens or secrets (the SDK manages its own
 * token storage; PATs are never written here).
 */
const OAUTH_SESSION_KEY = 'sdk-playground.oauth-connection';

export interface StoredOAuthConnection {
  version: string;
  config: ConnectionConfig;
}

export function saveOAuthConnection(version: string, config: ConnectionConfig): void {
  const { secret: _secret, ...rest } = config;
  const safe: ConnectionConfig = { ...rest, secret: '' };
  sessionStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify({ version, config: safe }));
}

export function loadOAuthConnection(): StoredOAuthConnection | null {
  const raw = sessionStorage.getItem(OAUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredOAuthConnection;
    return parsed.config?.mode === 'oauth' && parsed.version ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOAuthConnection(): void {
  sessionStorage.removeItem(OAUTH_SESSION_KEY);
}

type ServiceCtor = new (client: UiPathClientLike) => Record<string, unknown>;

export interface PlaygroundClient {
  version: string;
  client: UiPathClientLike;
}

function getExport(mod: SdkModule, name: string): unknown {
  return mod[name];
}

/** Builds an uninitialized UiPath instance for the selected version/config. */
async function constructClient(version: string, config: ConnectionConfig): Promise<UiPathClientLike> {
  const entry = SDK_VERSIONS[version];
  if (!entry) throw new Error(`Unknown SDK version: ${version}`);

  const core = await entry.core();
  const UiPath = getExport(core, 'UiPath');
  if (typeof UiPath !== 'function') {
    throw new Error(`SDK ${version} does not export a UiPath class from /core`);
  }
  const Ctor = UiPath as UiPathCtor;

  if (config.mode === 'custom') {
    return new Ctor({
      baseUrl: config.baseUrl.trim(),
      orgName: config.orgName.trim(),
      tenantName: config.tenantName.trim(),
      secret: config.secret,
    });
  }
  if (config.mode === 'oauth') {
    return new Ctor({
      baseUrl: config.baseUrl.trim(),
      orgName: config.orgName.trim(),
      tenantName: config.tenantName.trim(),
      clientId: config.clientId.trim(),
      redirectUri: config.redirectUri.trim(),
      scope: config.scope.trim(),
    });
  }
  return new Ctor();
}

/**
 * Creates and initializes a UiPath client for the selected SDK version.
 * Always builds a fresh instance — never reuses a client across connection
 * changes, so a token obtained for one org/tenant can't leak into another.
 *
 * In OAuth mode this is interactive: unless a callback code or cached token
 * is present, it navigates away to the identity sign-in page.
 */
export async function createClient(version: string, config: ConnectionConfig): Promise<PlaygroundClient> {
  const client = await constructClient(version, config);

  if (config.mode === 'oauth') {
    if (client.isInOAuthCallback()) {
      // returning from the identity server — exchange the single-use code
      await client.completeOAuth();
    } else if (!client.isAuthenticated()) {
      // no cached token — this navigates to the sign-in page
      await client.initialize();
    }
  } else {
    // secret auth resolves immediately; platform mode reads injected meta tags
    await client.initialize();
  }
  return { version, client };
}

/**
 * Non-interactive resume of a stored OAuth connection: completes a pending
 * callback or reuses the SDK's cached token, but NEVER starts a redirect.
 * Returns null when sign-in would be required.
 */
export async function resumeClient(version: string, config: ConnectionConfig): Promise<PlaygroundClient | null> {
  if (config.mode !== 'oauth') return null;
  const client = await constructClient(version, config);

  if (client.isInOAuthCallback()) {
    await client.completeOAuth();
  }
  return client.isAuthenticated() ? { version, client } : null;
}

/** Best-effort teardown before a client is replaced (release sockets, timers, tokens). */
export function disposeClient(playground: PlaygroundClient | null): void {
  if (!playground) return;
  const candidate = playground.client as unknown as Record<string, unknown>;
  for (const name of ['destroy', 'dispose', 'close']) {
    const fn = candidate[name];
    if (typeof fn === 'function') {
      try {
        (fn as () => unknown).call(candidate);
      } catch {
        // teardown is best-effort; the instance is dropped either way
      }
      return;
    }
  }
}

/** Instantiates a service class from the selected version's module for the given manifest entry. */
export async function createService(
  playground: PlaygroundClient,
  service: ServiceManifest
): Promise<Record<string, unknown>> {
  const entry = SDK_VERSIONS[playground.version];
  const loader = entry.modules[service.subpath];
  if (!loader) throw new Error(`Module '${service.subpath}' is not available in SDK ${playground.version}`);
  const mod = await loader();
  const raw = getExport(mod, service.className) ?? getExport(mod, service.name);
  if (typeof raw !== 'function') {
    throw new Error(`SDK ${playground.version} does not export ${service.className} from /${service.subpath}`);
  }
  const Ctor = raw as ServiceCtor;
  return new Ctor(playground.client);
}

/** Converts a raw form value into the typed argument the SDK method expects. */
export function convertParamValue(param: ParamManifest, raw: string): unknown {
  const value = raw.trim();
  if (value === '') {
    if (param.optional) return undefined;
    throw new Error(`Parameter '${param.name}' is required`);
  }
  switch (param.kind) {
    case 'number': {
      const n = Number(value);
      if (Number.isNaN(n)) throw new Error(`Parameter '${param.name}' must be a number`);
      return n;
    }
    case 'boolean':
      return value === 'true';
    case 'date': {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new Error(`Parameter '${param.name}' must be a valid date`);
      return d;
    }
    case 'enum': {
      const numeric = param.enumValues?.every((v) => typeof v === 'number');
      return numeric ? Number(value) : value;
    }
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`Parameter '${param.name}' must be valid JSON`);
      }
    default:
      return value;
  }
}

/** Invokes a method on a service instance with ordered, converted arguments. */
export async function invokeMethod(
  instance: Record<string, unknown>,
  method: MethodManifest,
  values: Record<string, string>
): Promise<unknown> {
  const args = method.params.map((p) => convertParamValue(p, values[p.name] ?? ''));
  // drop trailing undefined optionals so default-parameter handling applies
  while (args.length > 0 && args[args.length - 1] === undefined) args.pop();

  const fn = instance[method.name];
  if (typeof fn !== 'function') {
    throw new Error(`Method '${method.name}' not found on service instance`);
  }
  return (fn as (...a: unknown[]) => unknown).call(instance, ...args);
}
