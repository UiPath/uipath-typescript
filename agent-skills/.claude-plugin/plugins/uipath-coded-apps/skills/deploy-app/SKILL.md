---
description: Use when the user asks to deploy uipath coded app. this will deploy the app to uipath platform
---

# Deployment Reference

## Step 0: Ensure UiPath CLI is installed (agent MUST do this)

The CLI package `@uipath/uipath-ts-cli` is a **private** GitHub Package as of today. It requires `~/.npmrc` to be configured with a GitHub token before installation.

**Required version: `1.0.0-beta.7`**

Follow these sub-steps in order:

### 0a: Check if `uipath` command exists and verify version

```bash
command -v uipath && uipath -v
```

- **If `uipath` is not found** → go to step 0b
- **If `uipath` is found** → check the version output. It should contain `1.0.0-beta.7`. If the version is different, uninstall and reinstall:
  ```bash
  npm uninstall -g @uipath/uipath-ts-cli
  ```
  Then go to step 0b.
- **If version matches `1.0.0-beta.7`** → skip to Step 1.

### 0b: Ensure `~/.npmrc` is configured

Check if `~/.npmrc` exists and has the GitHub Packages registry for `@uipath`:

```bash
cat ~/.npmrc 2>/dev/null
```

The file must contain these two lines:
```
//npm.pkg.github.com/:_authToken=<GITHUB_TOKEN>
@uipath:registry=https://npm.pkg.github.com
```

- **If `~/.npmrc` exists and has both lines** → go to step 0c
- **If `~/.npmrc` is missing or doesn't have the `@uipath` registry** → ask the user for their GitHub token, then create/update the file

**Ask the user for their GitHub token:**

> I need a GitHub Personal Access Token (classic) to install the UiPath CLI from GitHub Packages.
>
> **If you already have one**, paste it here.
>
> **If you need to create one:**
> 1. Go to https://github.com/settings/tokens
> 2. Click **"Generate new token"** → **"Generate new token (classic)"**
> 3. Give it a name (e.g., "uipath-cli")
> 4. Select the **`read:packages`** scope (this is the only scope needed)
> 5. Click **"Generate token"**
> 6. Copy the token and paste it here

Once the user provides the token, write `~/.npmrc`:

```bash
# Use Write tool to create/update ~/.npmrc with:
//npm.pkg.github.com/:_authToken=<USER_PROVIDED_TOKEN>
@uipath:registry=https://npm.pkg.github.com
```

**IMPORTANT:** If `~/.npmrc` already has other content (e.g., other registries), use Edit to append the two lines — do NOT overwrite existing content.

### 0c: Install the CLI

```bash
npm install -g @uipath/uipath-ts-cli@1.0.0-beta.7
```

Verify installation:
```bash
uipath -v
```

If installation fails with 401/403, the GitHub token is invalid or missing the `read:packages` scope. Ask the user to regenerate it.

---

## Step 1: Authenticate (agent handles this fully)

The agent runs the full OAuth PKCE flow using `auth-helper.mjs`. This script opens the user's **actual browser** (which has their UiPath session — login may be automatic), captures the callback, exchanges the code for tokens, and fetches available tenants. No interactive terminal prompts.

### 1a: Check for existing valid authentication

```bash
cd <app-directory> && node -e "
const fs = require('fs');
try {
  const auth = JSON.parse(fs.readFileSync('.uipath/.auth.json', 'utf8'));
  const now = Date.now();
  const valid = auth.expiresAt > now;
  console.log(JSON.stringify({ valid, domain: auth.domain, orgName: auth.organizationName, tenantName: auth.tenantName, folderKey: auth.folderKey || null, expiresIn: valid ? Math.round((auth.expiresAt - now) / 60000) + ' minutes' : 'EXPIRED' }));
} catch(e) { console.log(JSON.stringify({ valid: false })); }
"
```

- **If token is valid AND has all needed fields** → skip to Step 2 (use existing auth)
- **If token is expired or `.auth.json` doesn't exist** → proceed to 1b

### 1b: Run the auth helper script

Determine the environment from context (from create-app skill, `.env`, or ask the user).

Run the auth helper **in the background**:

```bash
cd <app-directory> && node <skill-base-dir>/scripts/auth-helper.mjs <domain>
```

Where `<domain>` is `cloud`, `staging`, or `alpha`.

**How the script works:**
1. Finds an available port (8104, 8055, or 42042)
2. Starts a local HTTP callback server
3. Opens the user's default browser to the UiPath auth URL
4. Outputs: `{"step":"auth_url","url":"...","port":8104}`
5. Waits for the OAuth callback (up to 5 minutes)
6. Exchanges the authorization code for tokens
7. Fetches available tenants and organization info
8. Outputs: `{"step":"complete","tokens":{...},"organization":{...},"tenants":[...]}`

**The user's browser opens automatically.** If they're already logged into UiPath, the OAuth flow may complete without any interaction. If they need to log in, they do so in their browser — the script waits for the callback.

Tell the user:
> **Your browser is opening for UiPath authentication.** If you're already logged in, it should complete automatically. If not, please log in when prompted.

### 1c: Process the auth helper output

Read the script output. Parse each JSON line:

1. **`{"step":"auth_url",...}`** — the auth URL was generated and browser opened. Wait for completion.
2. **`{"step":"code_received"}`** — user logged in successfully. Token exchange in progress.
3. **`{"step":"complete",...}`** — authentication finished. Extract:
   - `tokens.accessToken` — the access token
   - `tokens.refreshToken` — the refresh token
   - `tokens.expiresIn` — token lifetime in seconds
   - `tokens.scope` — granted scopes
   - `organization.id` — organization ID
   - `organization.name` — organization name (slug)
   - `organization.displayName` — organization display name
   - `tenants[]` — array of `{ id, name, displayName }` objects
4. **`{"step":"error",...}`** — something failed. Show `message` to user and retry or fall back to manual `uipath auth`.

### 1d: Select tenant

- **If only one tenant** → auto-select it
- **If multiple tenants** → use `AskUserQuestion` to let the user pick:
  ```
  question: "Which tenant should I deploy to?"
  options: [{ label: tenant.displayName || tenant.name, description: tenant.name } for each tenant]
  ```

### 1e: Fetch and select folder

Using the access token and selected tenant, fetch available folders.

**IMPORTANT: Never pass the access token as a shell argument or in a `curl -H` flag** — JWTs are too long and break shell argument parsing. Always use Node.js `fetch` to make authenticated API calls:

```bash
cd <app-directory> && node -e "
const auth = require('./.uipath/.auth.json');
const baseUrls = { alpha: 'https://alpha.uipath.com', cloud: 'https://cloud.uipath.com', staging: 'https://staging.uipath.com' };
const baseUrl = baseUrls[auth.domain];
const url = baseUrl + '/' + auth.organizationName + '/' + '<tenantName>' + '/orchestrator_/api/Folders/GetAllForCurrentUser';
fetch(url, { headers: { 'Authorization': 'Bearer ' + auth.accessToken } })
  .then(r => r.json())
  .then(data => {
    const folders = data.PageItems || data.value || [];
    folders.forEach(f => console.log(JSON.stringify({ key: f.Key, name: f.DisplayName, path: f.FullyQualifiedName })));
    if (folders.length === 0) console.log('NO_FOLDERS');
  })
  .catch(e => console.error('Error:', e.message));
"
```

Replace `<tenantName>` with the selected tenant's `name` from Step 1d.

The response items have `Key` (the folderKey), `DisplayName`, and `FullyQualifiedName`.

- **If only one folder** → auto-select it
- **If multiple folders** → `AskUserQuestion` supports a max of 4 options, so when there are many folders:
  1. **First, display ALL folders** to the user as a numbered list in your message text (e.g., "Available folders:\n1. Shared (Shared/)\n2. Dev (Shared/Dev)\n...")
  2. **Then use `AskUserQuestion`** with the 3 most common/likely folders as options (prefer top-level folders like "Shared", personal workspaces). The user can always select "Other" and type the folder name if theirs isn't listed.
- **If no folders** → folderKey is null (skip folder selection)

### 1f: Write `.auth.json`

Write the auth file in the same format the CLI uses (so subsequent CLI commands can read it):

```json
{
  "accessToken": "<from tokens>",
  "refreshToken": "<from tokens>",
  "expiresAt": <Date.now() + (tokens.expiresIn * 1000)>,
  "tokenType": "Bearer",
  "scope": "<from tokens>",
  "organizationId": "<organization.id>",
  "domain": "<domain>",
  "tenantId": "<selectedTenant.id>",
  "tenantName": "<selectedTenant.name>",
  "organizationName": "<organization.name>"
}
```

Write to `<app-directory>/.uipath/.auth.json` (create `.uipath/` directory if it doesn't exist).

### 1g: Fallback — if auth-helper fails

If the auth helper script fails (e.g., port conflicts, network issues, browser doesn't open), fall back to asking the user:

> **Automated auth didn't work. Please run this command in your terminal:**
>
> ```
> cd <app-directory> && uipath auth --<environment>
> ```
>
> **Let me know once it's done.**

Then read `.uipath/.auth.json` after the user confirms.

---

## Step 2: Gather deployment parameters (agent does this)

After Step 1, you have all auth values either from the auth helper output or from `.auth.json`. Collect the deployment parameters:

### 2a: Read auth values

If you used the auth helper (Step 1b-1f), you already have all values in memory. Otherwise read from `.auth.json`:

```bash
cd <app-directory> && node -e "
const auth = require('./.uipath/.auth.json');
console.log(JSON.stringify({
  accessToken: auth.accessToken.substring(0, 20) + '...',
  orgId: auth.organizationId,
  tenantId: auth.tenantId,
  tenantName: auth.tenantName,
  orgName: auth.organizationName,
  domain: auth.domain
}, null, 2));
"
```

### 2b: Resolve the base URL

| domain | Base URL |
|---|---|
| `cloud` | `https://cloud.uipath.com` |
| `staging` | `https://staging.uipath.com` |
| `alpha` | `https://alpha.uipath.com` |

### 2c: Get app name

Read from `package.json` in the app directory:

```bash
node -e "console.log(require('./package.json').name)"
```

Or if the user specified a different name, use that.

### 2d: Summary of values needed for subsequent steps

- `accessToken` — from auth
- `orgId` — `organizationId` from auth
- `tenantId` — from auth
- `tenantName` — from auth
- `folderKey` — from folder selection in Step 1e
- `baseUrl` — resolved from `domain`
- `appName` — from `package.json` or user input

---

## Step 3: Build the app (agent does this)

```bash
cd <app-directory> && npm run build
```

Verify the `dist/` directory was created. If the build fails, fix errors first.

---

## Step 4: Register the app (agent does this — non-interactive with flags)

Check if already registered:
```bash
cat <app-directory>/.uipath/app.config.json 2>/dev/null
```

If `app.config.json` exists with a valid `systemName`, skip registration.

Otherwise, register using CLI flags. **Pass the access token via the `UIPATH_ACCESS_TOKEN` env var** (not `--accessToken` flag) because JWTs are too long for shell arguments:

```bash
cd <app-directory> && UIPATH_ACCESS_TOKEN="$(node -p "require('./.uipath/.auth.json').accessToken")" \
  uipath register app \
  --name "<appName>" \
  --version "1.0.0" \
  --type Web \
  --baseUrl "<baseUrl>" \
  --orgId "<orgId>" \
  --tenantId "<tenantId>" \
  --tenantName "<tenantName>" \
  --folderKey "<folderKey>"
```

Verify it created `.uipath/app.config.json`.

---

## Step 5: Package the app (agent does this — non-interactive)

**IMPORTANT: Always pass `--description` to avoid an interactive prompt** for the package description. Without it, `uipath pack` opens an inquirer prompt that blocks the agent.

```bash
cd <app-directory> && uipath pack ./dist \
  --name "<appName>" \
  --version "1.0.0" \
  --description "UiPath coded app <appName>"
```

Verify it created a `.nupkg` file in `.uipath/`.

---

## Step 6: Publish to Orchestrator (agent does this — non-interactive)

Pass the access token via env var (JWT is too long for shell args):

```bash
cd <app-directory> && UIPATH_ACCESS_TOKEN="$(node -p "require('./.uipath/.auth.json').accessToken")" \
  uipath publish \
  --baseUrl "<baseUrl>" \
  --orgId "<orgId>" \
  --tenantId "<tenantId>" \
  --tenantName "<tenantName>"
```

---

## Step 7: Deploy (agent does this — non-interactive)

Pass the access token via env var:

```bash
cd <app-directory> && UIPATH_ACCESS_TOKEN="$(node -p "require('./.uipath/.auth.json').accessToken")" \
  uipath deploy \
  --name "<appName>" \
  --baseUrl "<baseUrl>" \
  --orgId "<orgId>" \
  --tenantId "<tenantId>" \
  --folderKey "<folderKey>"
```

The deploy command should output the app URL. Display it to the user.

---

## Token Expiry Handling

Access tokens typically expire in ~1 hour. If any command fails with a 401/authentication error mid-deployment:

1. Check if the token is expired:
   ```bash
   node -e "const a = require('./.uipath/.auth.json'); console.log(a.expiresAt < Date.now() ? 'EXPIRED' : 'VALID')"
   ```
2. If expired, re-run the auth helper (Step 1b) to get a fresh token
3. After re-auth, re-read `.auth.json` and continue from the failed step

---

## Known Pitfalls

These issues WILL break the deployment if not handled. Follow the patterns in the steps above to avoid them.

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **JWT too long for shell args** | `curl: option : blank argument` or truncated token errors when passing `--accessToken` on the command line | **Never pass tokens as CLI flags or `curl -H` arguments.** Use `UIPATH_ACCESS_TOKEN` env var with `$(node -p "require('./.uipath/.auth.json').accessToken")`, or use Node.js `fetch` for API calls. |
| **`uipath pack` prompts for description** | `Enter package description:` interactive prompt blocks the agent | **Always pass `--description "..."` flag** to `uipath pack`. |
| **`echo "" \|` piping as workaround** | Works for some prompts but is fragile and non-portable | Prefer using the proper CLI flag (`--description`, etc.) instead of piping empty input. |
| **Port 8104 in use** | Auth helper fails to start callback server | The script auto-tries ports 8104, 8055, and 42042. If all fail, kill the process using the port: `lsof -ti:8104 \| xargs kill -9` |

---

## CLI Commands Reference

| Command | Description | Agent can run? |
|---------|-------------|----------------|
| `uipath auth` | OAuth browser flow + tenant selection | **Yes** — via `auth-helper.mjs` (opens user's browser, no terminal prompts) |
| `uipath register app` | Register coded app | **Yes** — with `--orgId`, `--tenantId`, `--tenantName`, `--folderKey`, `--accessToken` flags |
| `uipath pack <dist-path>` | Package built app as `.nupkg` | **Yes** — fully non-interactive |
| `uipath publish` | Upload `.nupkg` to Orchestrator | **Yes** — with `--orgId`, `--tenantId`, `--tenantName`, `--accessToken` flags |
| `uipath deploy` | Deploy/upgrade app, returns app URL | **Yes** — with `--name`, `--orgId`, `--tenantId`, `--folderKey`, `--accessToken` flags |
| `uipath push [project-id]` | Sync local build to Studio Web project | **Yes** — non-interactive |

## CI Environment Variables

| Variable | Description |
|----------|-------------|
| `UIPATH_BASE_URL` | UiPath base URL (default: `https://cloud.uipath.com`) |
| `UIPATH_ORG_ID` | Organization ID |
| `UIPATH_TENANT_ID` | Tenant ID |
| `UIPATH_ACCESS_TOKEN` | Bearer token for authentication |
| `UIPATH_PROJECT_ID` | WebApp project ID (alternative to CLI arg) |
