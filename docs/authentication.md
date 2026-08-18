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

## Zero-config (execution context)

Outside the browser the SDK configures itself from the execution-context
environment contract, so `new UiPath()` needs no arguments and no credential
code:

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath();
await sdk.initialize();
```

On a UiPath runner the contract is already populated. Off-runner — a script, a
test, a local `uip functions serve` — set the variables yourself:

```bash
UIPATH_URL=https://cloud.uipath.com
UIPATH_ORGANIZATION_ID=<organizationId>   # a logical org name also works
UIPATH_TENANT_ID=<tenantId>               # a logical tenant name also works
UIPATH_ACCESS_TOKEN=<accessToken>         # PAT or bearer token
```

| Variable | Also accepted |
|----------|---------------|
| `UIPATH_URL` | `UIPATH_BASE_URL` |
| `UIPATH_ORGANIZATION_ID` | `UIPATH_ORG_ID`, `UIPATH_ORGANIZATION_NAME`, `UIPATH_ORG_NAME` |
| `UIPATH_TENANT_ID` | `UIPATH_TENANT_NAME` |
| `UIPATH_ACCESS_TOKEN` | `UIPATH_SECRET` |

To state the context explicitly instead, pass it to the constructor — this
takes precedence over the environment:

```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgId: '<organizationId>',
  tenantId: '<tenantId>',
  accessToken: '<accessToken>'
});
await sdk.initialize();
```

The access token is consumed internally and is never exposed on `sdk.config`.

!!! info "Precedence"
    Constructor config wins over meta tags, which win over the environment.
    Meta tags apply in the browser only; the environment contract applies
    outside it.

## Secret-based Authentication
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath({
  baseUrl: 'https://api.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token
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

### Confidential App-scoped External App (client-credentials)

You can also authenticate the SDK with a token issued to a confidential, app-scoped [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications) via the client-credentials grant. Your backend requests the token using the app's Client ID and Client Secret, then passes it to the SDK through the `secret` parameter — like any other bearer token above.

To create a confidential app-scoped External App:

1. In UiPath Cloud: **Admin** → **External Applications**
2. Click **Add Application** → **Confidential Application**
3. Configure:
    - **Name**: Your app name
    - **Scopes**: Select the permissions you need ([see scopes guide](/uipath-typescript/oauth-scopes)). All scopes must be added as **Application** scopes, not **User** scopes.
4. Save and copy the **Client ID** and the **Client Secret** — you will not be shown the Client Secret again
5. Follow the [official UiPath documentation](https://docs.uipath.com/automation-cloud/automation-cloud/latest/api-guide/accessing-uipath-resources-using-external-applications) on how to request client-credentials tokens for a confidential app with application scopes
6. Pass this token as your `secret`, as shown in the Secret-based Authentication example above

!!! warning "Keep the Client Secret confidential"
    The Client Secret must never be exposed to public or client-side consumers. If it is exposed, revoke it immediately and generate a new one.

!!! note "No refresh tokens"
    The client-credentials flow does **not** support refresh tokens. To refresh, request a new token directly using the External App's client-credentials.


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
  secret: 'your-secret' //PAT Token or Bearer Token
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
  scope: 'your-scopes'
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

const sdk = new UiPath({...oauthConfig});

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

const sdk = new UiPath({...oauthConfig});

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

Create `.env` file — the SDK reads these itself:
```bash
# .env
UIPATH_URL=https://cloud.uipath.com
UIPATH_ORGANIZATION_ID=your-organization
UIPATH_TENANT_ID=your-tenant
UIPATH_ACCESS_TOKEN=your-pat-token
```

Verify your authentication setup:

```typescript
// test-auth.ts
import 'dotenv/config';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

async function testAuthentication() {
  const sdk = new UiPath();
  await sdk.initialize();

  try {
    // Test with a simple API call
    const assets = new Assets(sdk);
    const allAssets = await assets.getAll();
    console.log('Authentication successful!');
    console.log(`Connected to ${sdk.config.orgName}/${sdk.config.tenantName}`);
    console.log(`Found ${allAssets.items.length} assets`);

  } catch (error) {
    console.error('Authentication failed:');
    console.error(error.message);
  }
}

testAuthentication();
```

Run it: `npx ts-node test-auth.ts`
