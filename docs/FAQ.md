# Frequently Asked Questions

## CORS Issues

**Problem**: When developing locally and making requests to UiPath APIs, you may encounter CORS (Cross-Origin Resource Sharing) errors. This happens because browsers block requests from your local development server (e.g., `http://localhost:3000`) to external APIs due to same-origin policy restrictions.

**Solution**: Configure a proxy in your development server to forward API requests and avoid CORS issues.

For example, if you are using Vite, you could add the following proxy configuration to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Replace '/your-org' with your actual organization/tenant path
      '/your-org': {
        target: 'https://cloud.uipath.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
```

**Usage**: 
- Use `window.location.origin` as your base URL in your application
- Replace `/your-org` with your actual UiPath organization/tenant path

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