# Common Authentication Errors in UiPath TypeScript SDK Apps

## Error URL Format

When OAuth authentication fails, UiPath Identity redirects to an error page with the error encoded in the URL:

```
https://cloud.uipath.com/identity_/web/?errorCode=<CODE>&errorId=<BASE64_ENCODED_DETAILS>
```

Or errors may appear directly on the redirect URI:

```
http://localhost:5173/?error=<ERROR>&error_description=<DESCRIPTION>
```

## Decoding the errorId

The `errorId` parameter is a base64-encoded JSON string (JWT-like). Decode it with:

```bash
node -e "
const errorId = process.argv[1];
const parts = errorId.split('.');
const payload = parts.length === 3 ? parts[1] : errorId;
const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
const decoded = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
try { console.log(JSON.stringify(JSON.parse(decoded), null, 2)); }
catch { console.log(decoded); }
" "THE_ERROR_ID_VALUE"
```

Decoded structure:
```json
{
  "Created": 638900000000000000,
  "Data": {
    "Error": "invalid_request",
    "ErrorDescription": "Invalid redirect_uri",
    "ClientId": "00000000-0000-0000-0000-000000000000"
  }
}
```

---

## Error Catalog

### 1. Invalid Redirect URI

**Error:** `invalid_request` / `Invalid redirect_uri`

**Cause:** The redirect URI in the OAuth request doesn't match any URI registered in the UiPath External Application.

**Common causes:**
- Trailing slash: `http://localhost:5173` vs `http://localhost:5173/`
- Wrong port: app runs on 5173 but configured for 3000
- Protocol: `http://` vs `https://`
- Path difference: `/callback` suffix present/missing
- Using `window.location.origin` which resolves differently than expected

**Fix:**
1. Determine the actual app URL (check what port the dev server runs on)
2. Make the `.env` redirect URI match exactly
3. Update the External Application redirect URI to match exactly

---

### 2. Invalid Scope

**Error:** `invalid_scope`

**Cause:** The scopes requested in the OAuth authorization don't match what's configured in the External Application.

**Common causes:**
- App requests scopes not registered in External Application
- Typo in scope names
- Using deprecated scope names

**Fix:**
1. Check which SDK services the app uses
2. Map to required scopes (see oauth-scopes.md)
3. Update `.env` and External Application to include all required scopes

---

### 3. Invalid Client

**Error:** `invalid_client`

**Cause:** The Client ID is not recognized by UiPath Identity.

**Common causes:**
- Typo in Client ID
- External Application was deleted
- Using Client ID from wrong environment (prod vs staging vs alpha)

**Fix:**
1. Verify the Client ID in `.env` matches the External Application
2. Check you're pointing to the correct UiPath environment (`cloud.uipath.com` vs `staging.uipath.com`)

---

### 4. Unauthorized Client

**Error:** `unauthorized_client`

**Cause:** The application type doesn't support the requested grant type.

**Common causes:**
- External Application is configured as **Confidential** instead of **Non-Confidential**
- Browser apps MUST use Non-Confidential applications (they can't securely store a client secret)

**Fix:**
1. Go to Admin → External Applications in UiPath Cloud
2. Verify the application type is **Non-Confidential**
3. If it's Confidential, create a new Non-Confidential application

---

### 5. Access Denied

**Error:** `access_denied`

**Cause:** The user denied consent on the OAuth authorization screen.

**Fix:**
1. Retry the login flow
2. Click "Allow" when the consent screen appears
3. If the user doesn't see a consent screen, the scopes may not be properly configured

---

### 6. CORS Errors (Browser Console)

**Error:** Typically shows as:
- `"Unexpected token '<', '<!doctype ...' is not valid JSON"` - requests hitting the dev server's HTML instead of the API
- `Access to fetch has been blocked by CORS policy`
- `strict-origin-when-cross-origin` referrer policy errors in the Network tab
- Requests going to `localhost:5173/orgName/...` returning 304 with HTML content instead of JSON

**Cause:** The app's `baseUrl` is set to `cloud.uipath.com` (or `alpha.uipath.com`, `staging.uipath.com`) which does not have CORS headers enabled for browser requests from localhost.

**Fix:** Change the `baseUrl` to use the **API subdomain** which has proper CORS headers:

| Environment | Wrong Base URL | Correct Base URL |
|---|---|---|
| Production | `https://cloud.uipath.com` | `https://cloud.api.uipath.com` |
| Staging | `https://staging.uipath.com` | `https://staging.api.uipath.com` |
| Alpha | `https://alpha.uipath.com` | `https://alpha.api.uipath.com` |

Update the `.env` file (e.g., `VITE_UIPATH_BASE_URL`) to use the correct API subdomain. No Vite proxy or build tool configuration is needed.

---

### 7. Code Verifier Missing / OAuth Flow Interrupted

**Error:** `Code verifier not found in session storage` or blank page after redirect

**Cause:** The OAuth PKCE flow was interrupted. The code verifier stored in sessionStorage was lost (page refresh, storage cleared mid-flow, or navigating away).

**Relevant sessionStorage keys:**
- `uipath_sdk_code_verifier` - PKCE code verifier
- `uipath_sdk_oauth_context` - Full OAuth context (clientId, redirectUri, baseUrl, etc.)

**Fix:**
1. Clear all browser storage (localStorage, sessionStorage, cookies)
2. Retry the login flow from the beginning

---

### 8. Token Expired / Stale Token

**Error:** 401 Unauthorized on API calls after initially successful login

**Cause:** The access token has expired and automatic refresh failed or wasn't configured.

**Fix:**
1. Clear browser storage to remove the stale token
2. Re-authenticate
3. Ensure `offline_access` is in the requested scopes (the SDK adds this automatically)

---

### 9. Organization/Tenant Not Found

**Error:** 404 or routing errors when the OAuth flow starts

**Cause:** The `orgName` or `tenantName` in the SDK configuration is incorrect.

**Fix:**
1. Verify `VITE_UIPATH_ORG_NAME` and `VITE_UIPATH_TENANT_NAME` in `.env`
2. These should match exactly what you see in the UiPath Cloud URL: `https://cloud.uipath.com/{orgName}/{tenantName}/`

---

### 10. Server Error (500)

**Error:** `server_error` from UiPath Identity

**Cause:** Internal error in the UiPath Identity service.

**Fix:**
1. Wait a few minutes and retry
2. Check UiPath status page for known outages
3. If persistent, verify all configuration values are correct

---

## Debugging Checklist

When any OAuth error occurs, verify these in order:

1. **Browser state is clean** - Clear localStorage, sessionStorage, cookies
2. **Client ID is correct** - Matches the External Application
3. **App type is Non-Confidential** - Required for browser apps
4. **Redirect URI matches exactly** - Same in `.env` AND External Application
5. **Scopes are configured** - All needed scopes in `.env` AND External Application
6. **Org/Tenant names are correct** - Match the UiPath Cloud URL
7. **Base URL uses API subdomain** - `cloud.api.uipath.com` not `cloud.uipath.com` (prevents CORS errors)
8. **Dev server URL matches redirect URI** - Port and protocol match
