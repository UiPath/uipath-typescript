# Frequently Asked Questions

## CORS Issues

**Problem**: Requests to UiPath APIs may be blocked by CORS — both during local development and from deployed app domains.

**Solution**: Use `https://api.uipath.com` as the `baseUrl` in your `uipath.json`.

```json
{
  "baseUrl": "https://api.uipath.com"
}
```

---

## Authentication Errors

**Problem**: During authentication, you may encounter errors related to invalid redirect URIs, scopes, or other configuration issues.

**Error URL Example**: 
```
https://cloud.uipath.com/identity_/web/?errorCode=invalid_request&errorId=eyJDcmWRpcmVjdFVyaSI6bnVsbCwiUmVzcG9uc2VNb2RlIjpudWxsLCJDbGllbnRJZCI6IjhmZjMyM2FlLTAwZTEtNDU2NC1hOGMyLWVmZDg0YWY2Njc1MiJ9fQ
```

**Solution**: 
1. **Extract the Error Details**:
   - Copy the `errorId` value from the URL (the long encoded string after `errorId=`)
   - Go to [jwt.io](https://jwt.io)
   - Paste the `errorId` value into the "Encoded" section
   - The decoded payload will show you the specific error details

2. **Example Decoded Error**:
```json
{
  "Created": 638900000000000000,
  "Data": {
    "DisplayMode": null,
    "UiLocales": null,
    "Error": "invalid_request",
    "ErrorDescription": "Invalid redirect_uri",
    "RequestId": "ABC123XYZ:00000001",
    "ActivityId": "00-11111111111111111111111111111111-2222222222222222-01",
    "RedirectUri": null,
    "ResponseMode": null,
    "ClientId": "00000000-0000-0000-0000-000000000000"
  }
}
```

### Scope Changes Not Taking Effect

**Scenario**: You grant a new scope to the External Application, but calls still fail with a permission error.

**Cause**: Two things hold on to the old scopes.

First, the app requests the scopes it had when it was last deployed. What you need to change depends on how those scopes are set:

| How scopes are set | What to do after granting the scope |
| --- | --- |
| `uipath.json` with no `scope` field | Redeploy. Every scope granted to the client is picked up automatically at deploy time, so no code change is needed. |
| `uipath.json` with `scope` set | Add the scope to `scope`, then rebuild, pack, publish, and deploy. |
| `scope` passed to `UiPath()` in code | Add the scope in the code, then rebuild, pack, publish, and deploy. |

Second, the token is cached in `sessionStorage`. The SDK only checks that it is well formed and not expired, never that its scopes still match, so an open session keeps using the old token.

**Solution**:

1. Add the scope in **Admin → External Applications**.
2. Update and deploy the app as shown in the table above.
3. Sign out and sign back in, or close the browser tab and reopen the app.

```typescript
// Sign out (clears the cached token)
sdk.logout();

// Sign out of UiPath as well, so the next sign in asks for credentials
sdk.logout({ endSession: true });
```

Refreshing the page won't help. `sessionStorage` belongs to the browser tab and survives reloads, including a hard reload. Closing the tab clears it, as does **DevTools → Application → Clear site data**.
