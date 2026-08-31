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

### Enforcing sign-in through the organization's identity provider

By default users see the UiPath account sign-in screen. Set `enforceSso: true` to send them
straight to the organization's configured identity provider instead.

```typescript
const sdk = new UiPath({ enforceSso: true });
```

!!! warning "Only where everyone signs in through SSO"
    Users who sign in with a UiPath account do not exist in the organization's identity
    provider and will be rejected by it.

!!! note "Needs the organization id"
    This uses the organization id, which the platform and `uipath.json` supply for you. If
    you instead pass configuration directly to the constructor, set `orgName` to the
    organization id, otherwise `enforceSso` is ignored and a warning is logged.


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


## Coded Functions

A coded function receives its platform coordinates as the handler's `ctx`. Pass
that straight to the SDK — it maps the context itself, so the handler names no
credential fields and never touches the workload token:

```typescript
import { defineFunction } from '@uipath/coded-functions-js-sdk';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';

export default defineFunction({
  name: 'list-entities',
  handler: async (_input, ctx) => {
    const sdk = new UiPath(ctx);

    const entities = await new Entities(sdk).getAll();
    return { entityCount: entities.length };
  },
});
```

Construct the SDK **inside the handler**, once per invocation. A single instance
hoisted to module scope would keep serving the org, tenant and token of whichever
invocation created it.

## Server-side and scripts (environment contract)

Outside the browser — a script, a test, a CI job — the SDK configures itself
from environment variables, so `new UiPath()` needs no arguments:

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath();
```

```bash
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_NAME=<organization>          # an id works here as well as a name
UIPATH_TENANT_NAME=<tenant>
UIPATH_ACCESS_TOKEN=<accessToken>       # PAT or bearer token
```

These are the names this SDK already uses elsewhere for the same values, so one
`.env` serves a script and a test run alike.

The variables are read from `process.env` or `Deno.env`, whichever the runtime
provides.

To state the configuration explicitly instead, pass it to the constructor — this
takes precedence over both the environment and meta tags:

```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: '<organizationId>',   // an id works here as well as a name
  tenantName: '<tenantId>',
  secret: '<accessToken>'        // any bearer token
});
```

The access token is consumed internally and is never exposed on `sdk.config`.

!!! info "Precedence"
    Constructor arguments win over meta tags, which win over the environment.
    Meta tags apply in the browser only; the environment contract applies
    outside it.

## SDK Initialization - The initialize() Method

### When to Use initialize()

The `initialize()` method completes the authentication process for the SDK:

- **Secret Authentication**: Auto-initializes when creating the SDK instance - **no need to call initialize()**. This covers `secret`, `accessToken`, a coded function's `ctx`, and the environment contract.
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
- `sdk.logout()` - Logout and clear all authentication state (requires re-initialization to authenticate again). By default the UiPath session (Automation Cloud or Automation Suite) stays active, so the next sign-in completes silently. Pass `sdk.logout({ endSession: true })` to also sign the user out of UiPath session — the browser is redirected to end the session and returns to your app.
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
    secret: process.env.UIPATH_SECRET!
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
