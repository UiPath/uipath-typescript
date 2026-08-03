# PLT-107228 — Offer Cloud logout in the SDK (design & plan)

**Status:** Proposed · **Type:** Core-auth enhancement · **Semver impact:** minor (additive, backward-compatible)
**Owner:** Shivendra Tripathi · **Reporter:** Naren Venkateswaran
**Ticket:** [PLT-107228](https://uipath.atlassian.net/browse/PLT-107228)

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

## 5. Current code (facts this plan is built on)

- `src/utils/constants/endpoints/identity.ts` — `IDENTITY_ENDPOINTS` has only `TOKEN` and `AUTHORIZE`; **no end-session endpoint**. (`IDENTITY_BASE = 'identity_'`, a relative path on `baseUrl`, so an endsession URL correctly targets uipath.com.)
- `src/core/auth/service.ts` — `logout()` (~L258) calls `tokenManager.clearToken()` + removes `OAUTH_CONTEXT`/`CODE_VERIFIER` from `sessionStorage`. **No navigation, no cookie touch, no network call.**
- `token-manager.ts` — `clearToken()` removes `uipath_sdk_user_token-<clientId>`.
- `types.ts` — `AuthToken` = `{ access_token, token_type, expires_in, scope, refresh_token? }` — **no `id_token`**; `_getAccessToken` never reads one.
- `getAuthorizationUrl` requests `scope + ' offline_access'` — **`openid` is not requested**, so no `id_token` is issued today. (Relevant to Tier 2 only.)

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

### 7.3 Extend `logout()` — opt-in, backward-compatible
```ts
public logout(options?: { endSession?: boolean; postLogoutRedirectUri?: string }): void {
  const idTokenHint = this.tokenManager.getIdToken?.();     // undefined in Tier 1 / for old sessions
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
      postLogoutRedirectUri: options.postLogoutRedirectUri,
    });
  }
}
```
The public `UiPath.logout()` wrapper (`src/core/uipath.ts`) threads the same options through.

### 7.4 Two implementation tiers

| | **Tier 1 — minimal (recommended for v1)** | **Tier 2 — seamless (follow-up)** |
|---|---|---|
| Sent to endsession | `client_id` (+ optional `post_logout_redirect_uri`) | `id_token_hint` (+ optional `post_logout_redirect_uri`) |
| Extra plumbing | none | request `openid`; add/capture/store `id_token`; `TokenManager.getIdToken()` |
| Identity UX | may show a "Sign out?" confirmation page (see §8, finding 3) | fully silent logout |
| Works for already-logged-in users after update | ✅ immediately | ⚠️ only after re-login (old sessions have no `id_token`) |

**Recommendation:** ship **Tier 1** to unblock the customer; treat Tier 2 as a follow-up. If Tier 2 lands, `id_token` absence **must degrade gracefully** (fall back to `client_id`) — never require a re-login as a precondition.

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
- **Axis B — Identity registration: no migration in v1.** If a `post_logout_redirect_uri` is sent, it typically must be pre-registered on the External App. v1 **omits** it (Identity lands on its own signed-out page), so **no per-app registration change**. Optional auto-return (reuse the registered login `redirect_uri` as a post-logout target) is a Tier-2 / Identity-supported enhancement.
- **Axis C — existing live sessions: no migration; graceful.** Users logged in before the update have no stored `id_token`; Tier 1 doesn't need one. Tier 2 must skip `id_token_hint` when absent.

## 10. Dependencies to confirm with Identity

- [x] **Does endsession clear the correct session given the uipath.host/uipath.com split?** — **Resolved by §8**: endsession kills the uipath.com session (portal logged out); no separate uipath.host auth session exists (isolation test). SDK-only fix is sufficient.
- [ ] Does `connect/endsession` work with `post_logout_redirect_uri` **omitted** (lands on Identity's signed-out page) — and can the registered login `redirect_uri` optionally be reused as a post-logout target (for auto-return, Tier 2)?
- [ ] Confirm in writing that end-session **invalidates the refresh token** (verbal yes from Calin Popa: *"if it initiates an endsession flow, then it will"*).
- [ ] Is `openid` scope grantable for coded-app external apps? (Tier 2 only.)
- [ ] Confirm `UiPathSessionId` on uipath.host is telemetry/correlation (not an auth gate) — behavior in §8 already indicates it is not.

## 11. Testing (auth paths require 100% coverage per `agent_docs/rules.md`)

Unit (`tests/unit/core/auth/`):
- End-session URL construction: with/without `id_token_hint`, with/without `post_logout_redirect_uri`, `client_id` fallback.
- `logout()` / `logout({ endSession: false })` → **no navigation**, storage cleared (proves Axis-A back-compat).
- `logout({ endSession: true })` in browser → `window.location.href` set to the end-session URL.
- Non-browser (`isBrowser === false`) → no navigation.

Manual E2E (redirect flow — not headlessly assertable, like login; note the skip per rules): on the deployed `uipath.host` app, `logout({ endSession: true })` → confirm the app logs out **and** the next sign-in shows the Identity login screen (not a silent return). This is the single-flow test that reflects the actual fix (the two-tab endsession-only test does not).

## 12. Docs & release
- JSDoc on the public `logout()`: the opt-in flag, redirect behavior, and the caveat that an already-issued access token stays valid ~60 min (no revocation — SMBC #1, out of scope).
- Short logout guide / auth-docs update showing `logout({ endSession: true })`.
- `docs/oauth-scopes.md` only if Tier 2 adds `openid`.
- **Two PRs** per repo rule: (1) feature (no version bump); (2) a **separate** version-bump PR (minor).

## 13. Rollout summary
1. Implement Tier 1 (§7.1–7.3) — `logout({ endSession: true })` = clear token **+** endsession redirect (with `client_id`; `id_token_hint` if/when Tier 2).
2. Unit tests (§11) + the single-flow manual E2E on the deployed `uipath.host` app.
3. Docs (§12); feature PR; separate version-bump PR.
4. Customer message: on `logout({ endSession: true })` the app session and Identity/cloud session (and refresh token) are terminated and the next sign-in prompts; **already-issued access tokens remain valid ~60 min** (separate Identity item).
5. (Later) Tier 2 for prompt-free logout + optional auto-return, pending the §10 Identity confirmations.
```
