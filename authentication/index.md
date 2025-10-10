# Authentication

The SDK supports two authentication methods:

## OAuth Authentication (Recommended)

For OAuth, first create a non confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications).

1. In UiPath Cloud: **Admin** → **External Applications**
1. Click **Add Application** → **Non Confidential Application**
1. Configure:

- **Name**: Your app name
- **Redirect URI**: For eg, `http://localhost:3000` (for development)
- **Scopes**: Select permissions you need ([see scopes guide](/uipath-typescript/oauth-scopes))

4. Save and copy the **Client ID**

```
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
  scope: 'your-scopes'
});

// IMPORTANT: OAuth requires calling initialize()
await sdk.initialize();
```

## Secret-based Authentication

```
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token 
});
```

To Generate a PAT Token:

1. Log in to [UiPath Cloud](https://cloud.uipath.com)
1. Go to **User Profile** → **Preferences** → **Personal Access Token**
1. Click **Create Token**
1. Give it a name and expiration date
1. Provide relevant scopes

## SDK Initialization - The initialize() Method

### When to Use initialize()

The `initialize()` method completes the authentication process for the SDK:

- **Secret Authentication**: Auto-initializes when creating the SDK instance - **no need to call initialize()**
- **OAuth Authentication**: **MUST call** `await sdk.initialize()` before using any SDK services

### Example: Secret Authentication (Auto-initialized)

```
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token 
});

// Ready to use immediately - no initialize() needed
const tasks = await sdk.tasks.getAll();
```

### Example: OAuth Authentication (Requires initialize)

```
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000',
  scope: 'your-scopes'
});

// Must initialize before using services
try {
  await sdk.initialize();
  console.log('SDK initialized successfully');

  // Now you can use the SDK
  const tasks = await sdk.tasks.getAll();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

## OAuth Integration Patterns

### Auto-login on App Load

```
useEffect(() => {
  const initSDK = async () => {
    const sdk = new UiPath({...oauthConfig});
    await sdk.initialize();
  };
  initSDK();
}, []);
```

### User-Triggered Login

```
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

### Available OAuth Methods

- `sdk.initialize()` - Start OAuth flow (auto completes also based on callback state)
- `sdk.isInitialized()` - Check if SDK initialization completed
- `sdk.isAuthenticated()` - Check if user has valid token
- `sdk.isInOAuthCallback()` - Check if processing OAuth redirect
- `sdk.completeOAuth()` - Manually complete OAuth (advanced use)

______________________________________________________________________

## Quick Test Script

Create `.env` file:

```
# .env
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_NAME=your-organization-name
UIPATH_TENANT_NAME=your-tenant-name
UIPATH_SECRET=your-pat-token
```

Verify your authentication setup:

```
// test-auth.ts
import 'dotenv/config';
import { UiPath } from '@uipath/uipath-typescript';

async function testAuthentication() {
  const sdk = new UiPath({
    baseUrl: process.env.UIPATH_BASE_URL!,
    orgName: process.env.UIPATH_ORG_NAME!,
    tenantName: process.env.UIPATH_TENANT_NAME!,
    secret: process.env.UIPATH_SECRET!
  });

  try {
    // Test with a simple API call
    const assets = await sdk.assets.getAll();
    console.log('🎉 Authentication successful!');
    console.log(`✅ Connected to ${process.env.UIPATH_ORG_NAME}/${process.env.UIPATH_TENANT_NAME}`);
    console.log(`✅ Found ${assets.length} assets`);

  } catch (error) {
    console.error('❌ Authentication failed:');
    console.error(error.message);
  }
}

testAuthentication();
```

Run it: `npx ts-node test-auth.ts`
