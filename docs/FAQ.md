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
