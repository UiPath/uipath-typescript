/** UiPath SDK configuration. */
import { UiPath } from '@uipath/uipath-typescript';
import { setCurrentUser } from './runtime';

let sdk: UiPath | null = null;
let initError: string | null = null;

/** One `<meta name="uipath:…">` value, when the page carries it. */
function metaTag(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.querySelector('meta[name="uipath:' + name + '"]');
  return el?.getAttribute('content') || undefined;
}

/**
 * Whether this app has a connection at all.
 *
 * The client id is the one value nothing can default, so its presence is the signal.
 * Absent means `uipath.json` was never filled in (locally) or the app is being served
 * outside the platform. So does the `<external-application-clientId>` placeholder the
 * converter writes there: taken as a real id, it sent the browser to UiPath's sign-in,
 * which answered `unauthorized_client` — and the app never rendered at all.
 */
export function isConfigured(): boolean {
  const clientId = metaTag('client-id')?.trim();
  return clientId !== undefined && clientId !== '' && !/^<.*>$/.test(clientId);
}

/** The tenant this app is pointed at, for callers that must name it. */
export function tenantName(): string {
  return metaTag('tenant-name') ?? '';
}

/**
 * Initialise the SDK, if configured.
 *
 * `new UiPath()` with NO argument: the SDK reads the meta tags itself. Passing a
 * config here would mean re-deriving what the platform already stated, and would
 * diverge the local path from the deployed one.
 */
export async function initUiPath(): Promise<UiPath | null> {
  if (sdk) return sdk;
  if (!isConfigured()) {
    initError = 'UiPath is not configured — fill in uipath.json';
    // eslint-disable-next-line no-console
    console.warn('[uiapp-convert] ' + initError + '. The UI renders; data operations will fail.');
    return null;
  }
  const instance = new UiPath();
  /*
   * Remember where the user was going. The SDK's login redirect returns to the
   * configured redirect URI — the app ROOT — and strips only `code` and `state` from
   * it, so a deep link (`/display`, a shared page URL) landed on the home page after
   * signing in. The path is stashed before the redirect can happen and restored once
   * the callback has been exchanged, before the router mounts. Only a load that IS the
   * callback restores, so a plain reload never jumps anywhere. With deep links off (the default —
   * `DEEP_LINKS` in routes.tsx) the shell then sends a cold start on an inner page to the
   * start page; the stash still matters for a login that began there.
   */
  const isCallback = new URLSearchParams(window.location.search).has('code');
  const RETURN_KEY = 'uiapp-convert:return-to';
  if (!isCallback) {
    try {
      sessionStorage.setItem(RETURN_KEY,
        window.location.pathname + window.location.search + window.location.hash);
    } catch { /* storage unavailable: the redirect simply lands on the root */ }
  }
  await instance.initialize();
  if (isCallback && instance.isAuthenticated()) {
    try {
      const back = sessionStorage.getItem(RETURN_KEY);
      sessionStorage.removeItem(RETURN_KEY);
      if (back && back !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, '', back);
      }
    } catch { /* nothing stashed */ }
  }
  if (!instance.isAuthenticated()) {
    /*
     * The SDK has just SENT THE BROWSER TO THE LOGIN PAGE: `initialize()` starts the
     * redirect and resolves, and the navigation lands a moment later. Rendering in that
     * moment ran every source loader once against no token — one console error per
     * data-bound control, all of it discarded by the redirect, and the first thing anyone
     * reading the console saw. Hold the first render until the browser has left. The
     * timeout is for a redirect that never happens (blocked, offline): the UI still
     * appears, and every data call then says why it failed.
     */
    await new Promise<void>((resolve) => { setTimeout(resolve, 10000); });
    if (!instance.isAuthenticated()) {
      initError = 'not signed in to UiPath — the login redirect did not complete';
      // eslint-disable-next-line no-console
      console.warn('[uiapp-convert] ' + initError + '. The UI renders; data operations will fail.');
      return null;
    }
  }
  sdk = instance;
  initError = null;
  // The tenant rides with the user: both are session context, and a workflow's trigger
  // (CurrentJobInfo.TenantName) asks for it alongside the user's email.
  const user = { ...userFromToken(instance.getToken()), TenantName: tenantName() };
  setCurrentUser(user);
  // Before the first render, so a page that gates on a group never flashes the other view.
  const groups = await userGroups(instance);
  if (groups) setCurrentUser({ ...user, Groups: groups });
  return sdk;
}

/** The access token's claims, or nothing for a token that is not a JWT. */
function claimsOf(token: string | undefined): Record<string, unknown> {
  const payload = token?.split('.')[1];
  if (!payload) return {};
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * `UserContext.User.CurrentUser.Groups` — the NAMES of the signed-in user's groups.
 *
 * They are not in the token. Identity holds them: the user record carries the group ids,
 * and one bulk read turns the ids into names (`name`, which is what an app compares
 * against — `Groups.Contains("Finance_Admins")`). Two calls, once per session.
 *
 * Only for an app that asked. The converter adds `PM.User.Read PM.Group.Read` to
 * `uipath.json` exactly when the app reads `Groups`; without them Identity answers 401,
 * so their presence in the scope is the switch — an app that never reads its groups makes
 * no Identity call at all. Directory (AD / Entra) groups are not local groups and do not
 * resolve; a failure of either call leaves `Groups` unset, as before, with one warning.
 */
async function userGroups(instance: UiPath): Promise<string[] | undefined> {
  const scopes = (metaTag('scope') ?? '').split(/\s+/);
  if (!scopes.includes('PM.User.Read')) return undefined;
  const token = instance.getToken();
  const claims = claimsOf(token);
  const userId = claims.sub;
  const partition = claims.prt_id;
  if (!token || typeof userId !== 'string' || typeof partition !== 'string') return undefined;
  const config = instance.config;
  const base = config.baseUrl.replace(/\/$/, '') + '/' + config.orgName + '/identity_/api';
  const headers: Record<string, string> = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  try {
    const user = await fetch(base + '/User/' + encodeURIComponent(userId), { headers });
    if (!user.ok) throw new Error('HTTP ' + user.status + ' reading the user');
    const ids = ((await user.json()) as { groupIDs?: string[] }).groupIDs ?? [];
    if (!ids.length) return [];
    const groups = await fetch(base + '/Group/BulkLoadByIds/' + encodeURIComponent(partition), {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(ids),
    });
    if (!groups.ok) throw new Error('HTTP ' + groups.status + ' reading the groups');
    return ((await groups.json()) as { name?: unknown }[])
      .map((g) => g.name).filter((n): n is string => typeof n === 'string');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uiapp-convert] the signed-in user\'s groups could not be read, so '
      + 'CurrentUser.Groups is empty: ' + (err instanceof Error ? err.message : String(err)));
    return undefined;
  }
}

/**
 * The signed-in user, read from the access token's claims.
 *
 * The SDK exposes no user-info call, only the token; Identity's access token is a JWT
 * carrying `name`, `email`, `preferred_username` and `sub`. `CurrentUser.Email` and
 * friends resolved to nothing in every converted app because nothing ever populated the
 * store — the accessor existed, the writer had no caller. Decoded locally, never sent
 * anywhere; a token that is not a JWT (an Action Center bootstrap token, a secret)
 * yields an empty user, as before.
 */
function userFromToken(token: string | undefined): {
  DisplayName?: string; FirstName?: string; LastName?: string; Email?: string;
} {
  const claims = claimsOf(token);
  if (!Object.keys(claims).length) return {};
  {
    const text = (k: string) => {
      const v = claims[k];
      return typeof v === 'string' && v !== '' ? v : undefined;
    };
    /*
     * Identity's own spellings first. On this platform `name` and `preferred_username`
     * are both the EMAIL, while `first_name`/`last_name` carry the real name — and Apps
     * shows the person's full name where reading `name` showed the address twice. The
     * OpenID spellings are kept as the fallback for an identity provider that uses them.
     */
    const first = text('first_name') ?? text('given_name');
    const last = text('last_name') ?? text('family_name');
    const email = text('email') ?? text('preferred_username');
    const joined = first && last ? first + ' ' + last : first ?? last;
    const display = joined ?? text('name') ?? text('preferred_username') ?? email;
    return {
      ...(display ? { DisplayName: display } : {}),
      ...(first ? { FirstName: first } : {}),
      ...(last ? { LastName: last } : {}),
      ...(email ? { Email: email } : {}),
    };
  }
}

/** The initialised SDK, or null when the app has no connection — for controls that can degrade. */
export function uiPathOrNull(): UiPath | null {
  return sdk;
}

/** The initialised SDK. Throws if unavailable — a data call cannot proceed without it. */
export function getUiPath(): UiPath {
  if (!sdk) {
    throw new Error(initError ?? 'UiPath SDK has not been initialised; call initUiPath() first');
  }
  return sdk;
}

/**
 * The default folder for folder-scoped operations.
 *
 * `uip codedapp deploy` records the folder the app was installed into, and it arrives
 * as a meta tag like the rest of the connection. An Action Center task states its own
 * folder as well — see `getHostFolderId` in `lib/runtime`, which the data layer
 * prefers because a task is more specific than the app's install location.
 */
export function defaultFolderKey(): string | undefined {
  return metaTag('folder-key');
}

/*
 * The authenticated-REST escape hatch (`authenticatedFetch`) lived here until the
 * typed SDK closed its one consumer: queue writes were REST-only at v1.6.0, and
 * v1.6.2 added `queues.insertItemByName`. Removed rather than kept "just in
 * case" — an unused auth-bearing helper in every data app is surface without a
 * caller, and the next genuinely missing operation should re-derive the typed
 * contract first (docs/sdk-contract.md) before reaching for REST again.
 */
