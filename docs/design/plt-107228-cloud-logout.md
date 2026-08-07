# PLT-107228 — Offer Cloud logout in the SDK (design & plan)

**Status:** Implemented (draft PR [#636](https://github.com/UiPath/uipath-typescript/pull/636)) — pending the §11 alpha E2E matrix · **Type:** Core-auth enhancement · **Semver impact:** minor (additive, backward-compatible)
**Owner:** Shivendra Tripathi · **Reporter:** Naren Venkateswaran
**Ticket:** [APPS-35767](https://uipath.atlassian.net/browse/APPS-35767) — moved from `PLT-107228`, which no longer resolves as a key (branch and commit names keep the old key)
**Identity dependency:** [PLT-108129](https://uipath.atlassian.net/browse/PLT-108129) — `post_logout_redirect_uri` support · **Merged, deployed to alpha 2026-08-06**

---

## 1. Scope (read this first)

Per Raina Middha (clarifying the ticket): **"The task for this ticket is to provide an option in the SDK to log out of `cloud.uipath.com`."**

- **In scope:** add an SDK capability to terminate the **Automation Cloud / Identity session** (uipath.com), on top of the local token clear `logout()` already does.
- **Out of scope (explicitly):** the `setMultiLogin` / account-picker behavior discussed in the originating Slack thread. Raina: *"ignore all the messages in the thread."* The account picker is **not** a requirement — it is a natural *side effect* of the session being gone (see §6). Access-token revocation and configurable token lifetime are **separate Identity items** (SMBC questions #1 and #2), not this ticket.

## 2. Problem

Today `sdk.logout()` clears only **browser-side** state (the SDK's `sessionStorage` token). It does **not** end the Automation Cloud / Identity session. Result: after `logout()`, the next `initialize()` → `/authorize` finds the still-alive Identity session and **silently re-authenticates** the user — no login screen, no chance to switch account. The customer's logout button does not truly log the user out of the platform.

## 3. The three sessions across two domains (the core mental model)

A logged-in coded app actually holds **three** pieces of auth state, living on **two** domains:

| # | State | Storage | Domain | Cleared by |
|---|---|---|---|---|
| 1 | **App session** — SDK access token | `sessionStorage` (`uipath_sdk_user_token-<clientId>`) | **uipath.host** (the coded app) | `sdk.logout()` (already) |
| 2 | **Cloud / Identity session** — SSO cookie (`idsrv.session`, `.AspNetCore.Identity`, `UiPathIdentity…`) | cookie | **uipath.com** (Identity) | **nothing today** ← the gap |
| 3 | **Refresh token** — mints new access tokens | Identity, server-side | uipath.com | endsession (side effect of #2) |

- The **app** decides "am I logged in?" from **#1**.
- The **whole Automation Cloud** (portal + silent login into any app) is gated by **#2**.
- "**Cloud logout**" in the ticket = terminate **#2** (which, via the endsession flow, also invalidates **#3**).

## 4. Why the fix is inherently two-part (cross-origin boundary)

`#1` and `#2` live on different origins and can only be cleared by different actors — a hard browser rule, not a design choice:

| Cleanup | Who can do it | Why only them |
|---|---|---|
| Clear the **sessionStorage token** (#1) on uipath.host | the **SDK's `logout()`** (JS in the app) | `sessionStorage` is **per-origin**; only JS on the app's origin can touch it. No server endpoint can. |
| Kill the **Identity session** (#2) + refresh token (#3) on uipath.com | **`/connect/endsession`** (browser navigation to uipath.com) | Only Identity, on its own domain, can clear its own cookie + refresh token. endsession is cross-origin to the app and **cannot** touch the app's sessionStorage. |

Neither can do the other's job. Therefore a complete logout **must** do both — this is the crux of the fix.

## 5. Code before this change (the facts the plan was built on)

- `src/utils/constants/endpoints/identity.ts` — `IDENTITY_ENDPOINTS` has only `TOKEN` and `AUTHORIZE`; **no end-session endpoint**. (`IDENTITY_BASE = 'identity_'`, a relative path on `baseUrl`, so an endsession URL correctly targets uipath.com.)
- `src/core/auth/service.ts` — `logout()` (~L258) calls `tokenManager.clearToken()` + removes `OAUTH_CONTEXT`/`CODE_VERIFIER` from `sessionStorage`. **No navigation, no cookie touch, no network call.**
- `token-manager.ts` — `clearToken()` removes `uipath_sdk_user_token-<clientId>`.
- `types.ts` — `AuthToken` = `{ access_token, token_type, expires_in, scope, refresh_token? }` — **no `id_token`**; `_getAccessToken` never reads one.
- `getAuthorizationUrl` requests `scope + ' offline_access'` — `openid` was never appended automatically, so no `id_token` was issued unless the consumer put `openid` in their configured scope. (Unchanged by this work — see §7.4 for why.)

## 6. What "cloud logout" does and does NOT do (account picker clarification)

- **endsession logs the user *out* — it does not *show* a login screen.** It kills session #2 and lands the browser on a logged-out page (Identity's signed-out page, or back at the app).
- The **login / account picker only appears on the next `/authorize`**, which is reached by `initialize()`. Once #2 is dead, that `/authorize` **prompts** instead of silently re-authenticating. So the picker is a *consequence* of the session being gone — the SDK does not render it, Identity does.
- Two consumer intents therefore differ:
  - **Plain logout** → `logout({ endSession: true })` only. User ends logged out. (No picker.)
  - **Logout-then-relogin** (switch account) → still requires `initialize()` afterward to reach `/authorize`. Whether the prompt is a full account picker vs. a tenant-pinned login is the `setMultiLogin`/`acr_values` behavior — **out of scope** here.
- **Sequencing note:** `logout({ endSession: true })` **navigates the page away** to endsession, so any `setMultiLogin()`/`initialize()` calls placed *after* it will not execute in the same tick. In a relogin flow, the re-login runs when the browser returns from endsession and the app re-mounts (its normal `initialize()`).

## 7. Design

### 7.1 New endpoint constant — `src/utils/constants/endpoints/identity.ts`
```ts
export const IDENTITY_ENDPOINTS = {
  BASE_PATH:   `${IDENTITY_BASE}/connect`,
  TOKEN:       `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE:   `${IDENTITY_BASE}/connect/authorize`,
  END_SESSION: `${IDENTITY_BASE}/connect/endsession`,   // NEW
} as const;
```
> The interactive `…/ui/account/logout?logoutId=…` URL is IdentityServer's UI page with a server-minted `logoutId` — an SPA cannot construct it. `connect/endsession` is the correct RP-initiated logout endpoint.

### 7.2 End-session URL builder — `src/core/auth/service.ts` (mirrors `getAuthorizationUrl`)
```ts
private buildEndSessionUrl(params: { idTokenHint?: string; postLogoutRedirectUri?: string }): string {
  const q = new URLSearchParams();
  if (params.idTokenHint) q.set('id_token_hint', params.idTokenHint);
  else q.set('client_id', this.config.clientId);            // identifier when no id_token available
  if (params.postLogoutRedirectUri) q.set('post_logout_redirect_uri', params.postLogoutRedirectUri);
  return `${this.config.baseUrl}/${IDENTITY_ENDPOINTS.END_SESSION}?${q.toString()}`;
}
```

### 7.3 Extend `logout()` — opt-in, backward-compatible (as implemented)
```ts
public logout(options?: LogoutOptions): void {
  // Capture the ID token before clearToken() wipes it.
  const idTokenHint = options?.endSession ? this.tokenManager.getIdToken() : undefined;

  // Identity needs id_token_hint to sign out without a confirmation prompt
  // and to accept post_logout_redirect_uri (§10) — warn so the missing
  // `openid` scope is discoverable instead of failing silently.
  if (options?.endSession && isBrowser && !idTokenHint) {
    console.warn("Cloud logout: no OIDC ID token is available … Add the 'openid' scope …");
  }

  this.tokenManager.clearToken();                           // #1: clears the sessionStorage token
  if (isBrowser) {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.OAUTH_CONTEXT);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.CODE_VERIFIER);
    } catch (e) { console.warn('Failed to clear OAuth context', e); }
  }
  // NEW: opt-in cloud logout. Default path is byte-for-byte today's behavior.
  if (options?.endSession && isBrowser) {
    window.location.href = this.buildEndSessionUrl({       // #2: kills the Identity session
      idTokenHint,
      // Caller-supplied; Identity validates it against the app's registered
      // redirect URIs by exact string match (§10).
      postLogoutRedirectUri: options.postLogoutRedirectUri,
    });
  }
}
```
The `id_token` is captured from token responses (`AuthToken.id_token` → `TokenInfo.idToken`), survives page reloads (the whole `TokenInfo` is persisted to `sessionStorage`), and survives refreshes (a refresh response may omit `id_token`; the one from initial login is kept).
The public `UiPath.logout()` wrapper (`src/core/uipath.ts`) threads the same options through.

### 7.4 Both tiers ship together; `openid` selects which one runs

Both paths are implemented, and which one a consumer gets is decided by whether their SDK config requests the `openid` scope. There is no flag and no version gate.

| | **Without `openid`** (fallback) | **With `openid`** (recommended) |
|---|---|---|
| Sent to endsession | `client_id` | `id_token_hint` |
| Identity UX | asks the user to confirm sign-out (§10) | signs out silently |
| `postLogoutRedirectUri` | **ignored** by Identity (§10) | honored |
| Cloud session terminated | ✅ (once confirmed) | ✅ |
| SDK behavior | logs a warning naming `openid` | silent |

Exactly one client identifier is sent, never both: RP-initiated logout requires Identity to reject a request whose `id_token_hint` and `client_id` disagree, so `client_id` is strictly the fallback branch.

**Why `openid` is not appended automatically** (the SDK does append `offline_access`): Calin confirmed `openid` *should* be granted by default for non-confidential apps, but "should" is not a guarantee for every already-registered External Application. If a registration lacked it, `/authorize` would fail and **login would break outright** — an unacceptable trade for a logout nicety. Consumers opt in, and the warning makes the missing scope discoverable. Revisit once alpha validation confirms `openid` is universally granted.

## 8. Live verification on the real `uipath.host` topology

The data-fabric coded-app sample was deployed via the `uip` CLI to **`appsdev.alpha.uipath.host`** (org `appsdev`, tenant `appsdevDefault`, `baseUrl` alpha) and tested against `alpha.uipath.com` Identity. Findings:

1. **endsession targets the correct (uipath.com) session.** Hitting `/identity_/connect/endsession` logged the user out of the **Cloud portal** — confirming it terminates the uipath.com Identity session, not merely a host cookie.

2. **Killing the Cloud session alone does NOT log out the coded app.** With the Identity session gone but the **sessionStorage token still present**, the app kept working — it runs on its cached access token (~60 min), which endsession cannot touch. → confirms the token-clear half is required.

3. **Bare endsession may not complete without a hint.** `/connect/endsession` with no `id_token_hint` can show a "Do you want to sign out?" confirmation; if not confirmed, the session isn't terminated. → the fix should pass `id_token_hint`/`client_id` so it completes without a prompt.

4. **Domain-split concern (Raina) — RESOLVED: there is no gateway/auth session on `uipath.host`.** Isolation test:
   - Cleared the `sessionStorage` token, **left every `uipath.host` cookie intact**, killed the uipath.com Identity session via endsession, then reloaded the app.
   - **Result: the app required a fresh login — it did not let the user in.**
   - Therefore the `uipath.host` cookies do **not** gate access. They are preferences/telemetry — `UiPathSessionId`, `lastUsedLoginEmail-alp`, `currentLoginMethod-alp`, `language-*`, `_gcl_au` — and non-HttpOnly. The Identity auth cookies (`idsrv.session`, etc.) live only on uipath.com and are not visible to the host page.
   - **Conclusion:** the coded app's auth is exactly (#1) the sessionStorage token + (#2) the uipath.com Identity session — both reachable from the SDK side. **No platform/gateway dependency; the SDK-only fix is sufficient.**

Access-state matrix established by the tests:

| Token (#1) | Identity session (#2) | uipath.host cookies | Result |
|---|---|---|---|
| present | killed | — | stays in (runs on token) |
| cleared | killed | **intact** | **login required** ✅ (isolation test) |

→ App access is governed by (#1 **or** #2) only; uipath.host cookies are irrelevant to auth.

## 9. Backward compatibility & migration

**No coded app — existing or new — requires migration or re-registration, by design.**

- **Axis A — SDK consumer code: no migration.** The new behavior is opt-in. Every existing `sdk.logout()` call behaves exactly as today (local clear, synchronous, no redirect). Adopting cloud logout is a one-line change (`logout({ endSession: true })`), not a migration. The default is **not** flipped to `true` (that would silently turn a non-navigating call into a full-page redirect — a breaking change); revisit the default only in a future major version.
- **Axis B — Identity registration: none required.** Per §10, Identity never persisted a `PostLogoutRedirectUris` collection for External Application clients, so there is no place to register one. PLT-108129 changed Identity to validate the passed URI against the app's **registered redirect URIs** (exact match) instead. Callers pass a registered URI — typically the app's login redirect — via `postLogoutRedirectUri`; omitted or mismatched values land the user on the Automation Cloud portal.
- **Axis C — existing live sessions: no migration; graceful.** Users logged in before the update have no stored `id_token`; the endsession redirect still happens without one. Only the prompt-free experience and `post_logout_redirect_uri` need it, and the SDK warns rather than failing.

## 10. Identity dependencies — all resolved

- [x] **Does endsession clear the correct session given the uipath.host/uipath.com split?** — **Resolved by §8**: endsession kills the uipath.com session (portal logged out); no separate uipath.host auth session exists (isolation test). SDK-only fix is sufficient.
- [x] **Why was `post_logout_redirect_uri` ignored?** — Root-caused in the Identity repo: `/connect/endsession` dropped it for coded-app / External Application clients because Identity **never persisted a `PostLogoutRedirectUris` value for that client type at all**. Duende IdentityServer (pinned at 7.4.3) can only validate the URI against a client resolved from `id_token_hint`; with that client's collection always empty, validation failed, the URI was dropped, and Identity's `UsePortalBaseUrlAsFallbackPostLogoutUrl` setting (on in every cloud ring) sent the user to the portal. **Session termination itself was never affected — only the final redirect target.**
- [x] **Is `client_id` alone sufficient to validate `post_logout_redirect_uri`, or is `id_token_hint` required?** — **`id_token_hint` is required.** Calin Popa: *"id_token is required (otherwise it is a security risk, endsession is an unauthenticated endpoint); w/o it the current experience is to prompt the users & validate their intention."* This is why the SDK sends `client_id` **only** as a fallback and warns when no ID token is available.
- [x] **Is `openid` in the default allowed-scopes list for coded-app external apps?** — Yes for **non-confidential** apps (the SDK's browser OAuth flow). **Confidential apps cannot be granted `openid` at all** — Calin: *"openid's purpose is for the client to obtain information about the user; for confidential apps there is no user involved (and not endsession either)."* Consistent with `UiPath.logout()` already skipping end-session for secret-based config.
- [x] **Is the fix shipped?** — **PLT-108129 is merged and deployed to alpha** (Swapnil Shah, 2026-08-06: *"The change is merged and currently deploying to alpha … Please perform any validations from your end and let us know"*).
- [x] Confirm end-session **invalidates the refresh token** — Calin Popa: *"if it initiates an endsession flow, then it will."*
- [x] Confirm `UiPathSessionId` on uipath.host is telemetry/correlation, not an auth gate — established by the §8 isolation test.

**Answered during alpha validation (2026-08-07):** Identity does **not** honor arbitrary URIs (Naren's original ask) — it validates `post_logout_redirect_uri` by **exact string match against the app's registered redirect URI**, and on any mismatch silently falls back to the portal. Observed with the localhost registration `http://localhost:5173`: passing `http://localhost:5173/` (trailing slash) → portal; passing it verbatim → returned to the app. Deployed, `https://appsdev.alpha.uipath.host/data-fabric-app` was honored verbatim. This is OAuth's simple-string-comparison rule (RFC 6749 §3.1.2.3) applied to post-logout URIs — consumers must pass the URI exactly as registered, trailing slash included.

## 11. Testing (auth paths require 100% coverage per `agent_docs/rules.md`)

Unit (`tests/unit/core/auth/`):
- End-session URL construction: with/without `id_token_hint`, with/without `post_logout_redirect_uri`, `client_id` fallback.
- `client_id` is **never** sent alongside `id_token_hint`.
- Missing-ID-token warning: fires for `endSession: true` without an ID token, names `postLogoutRedirectUri` when one was passed, silent when an ID token exists, silent for local-only logout.
- `logout()` / `logout({ endSession: false })` → **no navigation**, storage cleared (proves Axis-A back-compat).
- `logout({ endSession: true })` in browser → `window.location.href` set to the end-session URL.
- Non-browser (`isBrowser === false`) → no navigation.

Manual E2E (redirect flow — not headlessly assertable, like login; note the skip per rules). Run on the `data-fabric-app` sample against **alpha**, first on `localhost:5173`, then deployed to `https://appsdev.alpha.uipath.host/data-fabric-app`. The sample's **Sign out** button performs the full flow — `logout({ endSession: true, postLogoutRedirectUri })` in `AuthContext.tsx`, passing the app URL (origin + pathname, trailing slash stripped, so it equals the registered redirect URI):

| # | Config | Action | Expected |
|---|---|---|---|
| 1 | `openid` in scope (default) | click **Sign out** | no confirmation page; browser bounces through Identity and returns **to the app**, signed out — the PLT-108129 fix. Before it: portal. |
| 2 | `openid` in scope | after #1, sign in again | Identity **prompts** for credentials — no silent re-auth (the original bug) |
| 3 | `openid` **removed** from `uipath.json` scope (restart dev server) | click **Sign out** | console warning naming `openid`; Identity shows its confirm-sign-out page; after confirming, lands on the **portal** (redirect ignored) |
| 4 | `openid` in scope; a `postLogoutRedirectUri` that differs from the registered redirect URI | click **Sign out** | ✅ **Answered 2026-08-07** (accidentally — a trailing-slash mismatch): exact-match validation, mismatch → silent portal fallback. See §10. |

Case 1 ✅ (deployed) and case 2 ✅ (Entra number-matching MFA prompt on re-login — the org's login federates to Microsoft via `idp: auth0|microsoft`, so a *real* logout surfaces the IdP's MFA policy) were validated on 2026-08-07. The exact-match finding drove two design iterations: an SDK-side default to `config.redirectUri` was implemented and validated, then **dropped by product decision (2026-08-08)** in favor of the explicit `postLogoutRedirectUri` option — the parameter is Identity's new capability (PLT-108129) and the SDK surfaces it directly rather than coupling logout to the login redirect. Consequence: consumers (and the sample) must pass the URI exactly as registered — the sample strips the trailing slash from `origin + pathname` for this reason.

**Identity-side confirmation (Swapnil Shah, telemetry, 2026-08-08):** with the SDK default in place, both environments' UX flows were captured as curls and checked server-side — `post_logout_redirect_uri=http://localhost:5173` **accepted**, `post_logout_redirect_uri=https://appsdev.alpha.uipath.host/data-fabric-app` **also worked**. Notes from the captures: (a) both flows carried `id_token_hint` with `aud` = the app's clientId — both environments run on the **same** External Application (`17945bbd-…`), whose registered redirect URIs include both values, which is exactly the set Identity validates against; (b) the deployed flow hits end-session on `alpha.api.uipath.com` (the platform-injected `baseUrl`) while the token `iss` is `alpha.uipath.com/identity_` — same Identity behind both hosts, session termination confirmed by the re-login prompt; (c) ID tokens are **5-minute** tokens — both tests logged out seconds after login, and per the OIDC RP-initiated-logout spec (and Duende defaults) an *expired* ID token is still valid as a hint, but a logout after a >5-minute session is a cheap sanity test still worth running once.

## 12. Docs & release
- JSDoc on the public `logout()`: the opt-in flag, redirect behavior, and the caveat that an already-issued access token stays valid ~60 min (no revocation — SMBC #1, out of scope).
- Short logout guide / auth-docs update showing `logout({ endSession: true })`.
- No `docs/oauth-scopes.md` entry: that file maps API methods to `OR.*` resource scopes; `openid` is an OIDC identity scope on the consumer's own config, documented in `docs/authentication.md` and the `LogoutOptions` JSDoc.
- **Two PRs** per repo rule: (1) feature (no version bump); (2) a **separate** version-bump PR (minor).

## 13. Rollout summary
1. ✅ Implement §7.1–7.3 — `logout({ endSession: true })` = clear token **+** endsession redirect, `id_token_hint` when `openid` is configured and `client_id` otherwise.
2. ✅ Unit tests (§11).
3. **Now:** run the §11 alpha E2E matrix on `data-fabric-app` (localhost, then deployed) and report back on the PLT-108129 thread — Swapnil explicitly asked for validation.
4. Docs (§12); undraft the feature PR; separate version-bump PR.
5. Customer message: on `logout({ endSession: true })` the app session and Identity/cloud session (and refresh token) are terminated and the next sign-in prompts; pass `postLogoutRedirectUri` (exactly a registered redirect URI) plus the `openid` scope to return the user to the app afterwards; **already-issued access tokens remain valid ~60 min** (separate Identity item, SMBC #1).
```
