# Authentication

The SDK supports multiple authentication methods depending on your use case.

## Coded Apps

Once your app is deployed as a [Coded App](coded-apps/getting-started.md), the platform injects all configuration automatically at deploy time. You can construct `UiPath` with no arguments — the SDK reads from the injected meta tags:

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath();
await sdk.initialize();
```

See [Coded Apps — Getting Started](coded-apps/getting-started.md) for the full setup guide.

---

## OAuth Authentication (Recommended)

For OAuth, first create a non confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications).

1. In UiPath Cloud: **Admin** → **External Applications**
2. Click **Add Application** → **Non Confidential Application**
3. Configure:
   - **Name**: Your app name
   - **Redirect URI**: For eg, `http://localhost:3000` (for development)
   - **Scopes**: Select permissions you need ([see scopes guide](/uipath-typescript/oauth-scopes))
4. Save and copy the **Client ID**

Add the Client ID and other config to your `uipath.json`. The `@uipath/coded-apps-dev` bundler plugin injects these as meta tags during local development; at deploy time the platform injects them automatically.

With config in place, initialize the SDK with no arguments — it reads everything from the injected meta tags:

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath();
await sdk.initialize();
```

## Secret-based Authentication

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath({
  baseUrl: 'https://api.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret', //PAT Token or Bearer Token
});
```

!!! info "Using externally obtained tokens"
If you have backend / external system that handles authentication and token generation, you can pass the token directly to the SDK via the `secret` parameter at initialization. When the token expires, your backend / external system can inject a refreshed token into the same instance via `sdk.updateToken()` to keep it authenticated. In this setup, token lifecycle management stays entirely on your side.

To Generate a PAT Token:

1. Log in to [UiPath Cloud](https://cloud.uipath.com)
2. Go to **User Profile** → **Preferences** → **Personal Access Token**
3. Click **Create Token**
4. Give it a name and expiration date
5. Provide relevant scopes

## SDK Initialization - The initialize() Method

### When to Use initialize()

The `initialize()` method completes the authentication process for the SDK:

- **Secret Authentication**: Auto-initializes when creating the SDK instance - **no need to call initialize()**
- **OAuth Authentication**: **MUST call** `await sdk.initialize()` before using any SDK services

### Example: Secret Authentication (Auto-initialized)

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Tasks } from '@uipath/uipath-typescript/tasks';

const sdk = new UiPath({
  baseUrl: 'https://api.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret', //PAT Token or Bearer Token
});

// Ready to use immediately - no initialize() needed
const tasks = new Tasks(sdk);
const allTasks = await tasks.getAll();
```

### Example: OAuth Authentication (Requires initialize)

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Tasks } from '@uipath/uipath-typescript/tasks';

const sdk = new UiPath({
  baseUrl: 'https://api.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000',
  scope: 'your-scopes',
});

// Must initialize before using services
try {
  await sdk.initialize();
  console.log('SDK initialized successfully');

  // Now you can use the SDK
  const tasks = new Tasks(sdk);
  const allTasks = await tasks.getAll();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

## OAuth Integration Patterns

### Auto-login on App Load

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath({ ...oauthConfig });

useEffect(() => {
  const initSDK = async () => {
    await sdk.initialize();
  };
  initSDK();
}, []);
```

### User-Triggered Login

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath({ ...oauthConfig });

const onLogin = async () => {
  await sdk.initialize();
};

// Handle OAuth callback
const oauthCompleted = useRef(false);
useEffect(() => {
  if (sdk.isInitialized() && !oauthCompleted.current) {
    oauthCompleted.current = true;
    sdk.completeOAuth();
  }
}, []);
```

### Available Auth Methods

- `sdk.initialize()` - Start OAuth flow (auto completes also based on callback state)
- `sdk.isInitialized()` - Check if SDK initialization completed
- `sdk.isAuthenticated()` - Check if user has valid token
- `sdk.isInOAuthCallback()` - Check if processing OAuth redirect
- `sdk.completeOAuth()` - Manually complete OAuth (advanced use)
- `sdk.getToken()` - Get the logged-in user's access token
- `sdk.logout()` - Logout and clear all authentication state (requires re-initialization to authenticate again)
- `sdk.updateToken()` - Inject a refreshed token into the SDK instance (useful for backend services managing token lifecycle)

---

## Quick Test Script

Create `.env` file:

```bash
# .env
UIPATH_BASE_URL=https://api.uipath.com
UIPATH_ORG_NAME=your-organization-name
UIPATH_TENANT_NAME=your-tenant-name
UIPATH_SECRET=your-pat-token
```

Verify your authentication setup:

```typescript
// test-auth.ts
import 'dotenv/config';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

async function testAuthentication() {
  const sdk = new UiPath({
    baseUrl: process.env.UIPATH_BASE_URL!,
    orgName: process.env.UIPATH_ORG_NAME!,
    tenantName: process.env.UIPATH_TENANT_NAME!,
    secret: process.env.UIPATH_SECRET!,
  });

  try {
    // Test with a simple API call
    const assets = new Assets(sdk);
    const allAssets = await assets.getAll();
    console.log('Authentication successful!');
    console.log(`Connected to ${process.env.UIPATH_ORG_NAME}/${process.env.UIPATH_TENANT_NAME}`);
    console.log(`Found ${allAssets.items.length} assets`);
  } catch (error) {
    console.error('Authentication failed:');
    console.error(error.message);
  }
}

testAuthentication();
```

Run it: `npx ts-node test-auth.ts`
