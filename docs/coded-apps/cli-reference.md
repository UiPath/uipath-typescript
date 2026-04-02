# CLI Reference

The `uipcli` CLI with the `codedapp` tool manages the full lifecycle of a coded app.

## Installation

```bash
npm install -g @uipath/uipcli
```

---

## login

Authenticate with the UiPath platform. Opens a browser for OAuth PKCE login, then prompts to select a tenant and folder. Credentials are saved to `.uipath/.auth`.

```
uipcli login [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--authority` | string | Platform base URL | `https://cloud.uipath.com` |
| `--tenant` | string | Tenant name — skips interactive tenant selection | — |
| `--client-id` | string | OAuth client ID (unattended mode) | — |
| `--client-secret` | string | OAuth client secret (unattended mode) | — |
| `--interactive` | boolean | Force interactive mode | `false` |

**Examples**

<!-- termynal -->

```bash
# Interactive login (cloud)
$ uipcli login

# Specific tenant
$ uipcli login --tenant MyTenant

# Check login status
$ uipcli login status
```

---

## codedapp pack

Package a built app distribution directory into a `.nupkg` file.

Reads `uipath.json` from the project root (creates it with empty values if missing). For **Web** apps, `clientId` in `uipath.json` is required and validated against the identity API — it must exist and be non-confidential. For **Action** apps, `clientId` is optional but validated if provided.

```
uipcli codedapp pack <dist> [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name. Allowed: lowercase letters, numbers, hyphens. Invalid chars are sanitized with a warning. | — |
| `-v, --version` | string | Semantic version | `1.0.0` |
| `-t, --type` | string | App type: `Web` or `Action` | `Web` |
| `-o, --output` | string | Output directory for the `.nupkg` | `./.uipath` |
| `--content-type` | string | Content type: `webapp`, `library`, or `process` | `webapp` |
| `--dry-run` | boolean | Preview without writing files | `false` |
| `--baseUrl` | string | Platform base URL | from auth |
| `--orgId` | string | Organization ID | from auth |
| `--tenantId` | string | Tenant ID | from auth |
| `--accessToken` | string | Bearer token | from auth |

The `<dist>` folder must contain an `index.html` at its root. Use `--main-file` to specify a different entry point.

!!! info "Angular dist path"
    Angular 17+ outputs to `dist/<project-name>/browser/`. Angular 16 and earlier outputs to `dist/<project-name>/`.

**Output**: `.uipath/<name>.<version>.nupkg`

**Examples**

<!-- termynal -->

```bash
# Vite / React / Vue
$ uipcli codedapp pack dist -n my-app

# Angular 17+ (output is in dist/<project>/browser/)
$ uipcli codedapp pack dist/my-app/browser -n my-app

# Action app
$ uipcli codedapp pack dist -n my-action-app -t Action

$ uipcli codedapp pack dist -n my-app -v 2.0.0
```

---

## codedapp publish

Upload the `.nupkg` to Orchestrator and register it as a coded app version.

```
uipcli codedapp publish [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name (non-interactive) | — |
| `-v, --version` | string | Package version (requires `--name`) | — |
| `-t, --type` | string | App type: `Web` or `Action` | `Web` |
| `--uipathDir` | string | Directory containing the `.nupkg` | `./.uipath` |
| `--baseUrl` | string | Platform base URL | from auth |
| `--orgId` | string | Organization ID | from auth |
| `--tenantId` | string | Tenant ID | from auth |
| `--accessToken` | string | Bearer token | from auth |

**Examples**

<!-- termynal -->

```bash
$ uipcli codedapp publish
$ uipcli codedapp publish -t Action
```

---

## codedapp deploy

Deploy a published app version to a folder. Handles both first-time deploys and upgrades to the latest published version.

```
uipcli codedapp deploy [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | App name | — |
| `--folderKey` | string | Target folder key | — |
| `--orgId` | string | Organization ID | from auth |
| `--orgName` | string | Organization name | from auth |
| `--tenantId` | string | Tenant ID | from auth |
| `--accessToken` | string | Bearer token | from auth |

**Examples**

<!-- termynal -->

```bash
# Interactive
$ uipcli codedapp deploy
```

---

## Studio Web (push / pull)

The following commands are for syncing your local project with **UiPath Studio Web**. They are not part of the standard pack → publish → deploy workflow and are only needed if you want to edit or manage your project in Studio Web.

## codedapp push

Upload local source code to UiPath Studio Web.

```
uipcli codedapp push [project-id] [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `project-id` | string | Studio Web project ID (optional, reads `UIPATH_PROJECT_ID` from `.env`) | from `.env` |
| `--buildDir` | string | Build output directory | `dist` |
| `--ignoreResources` | boolean | Skip importing referenced resources | `false` |
| `--baseUrl` | string | Platform base URL | from auth |
| `--orgId` | string | Organization ID | from auth |
| `--tenantId` | string | Tenant ID | from auth |
| `--accessToken` | string | Bearer token | from auth |

**Examples**

<!-- termynal -->

```bash
# First push — prompts to create a new project
$ uipcli codedapp push

# Push to a specific project
$ uipcli codedapp push abc-123-def
```

---

## codedapp pull

Download project files from UiPath Studio Web to your local machine.

```
uipcli codedapp pull [project-id] [flags]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `project-id` | string | Studio Web project ID | from `.env` |
| `--overwrite` | boolean | Overwrite existing local files without prompting | `false` |
| `--targetDir` | string | Local directory to write pulled files | — |
| `--baseUrl` | string | Platform base URL | from auth |
| `--orgId` | string | Organization ID | from auth |
| `--tenantId` | string | Tenant ID | from auth |
| `--accessToken` | string | Bearer token | from auth |

**Examples**

<!-- termynal -->

```bash
$ uipcli codedapp pull
$ uipcli codedapp pull --overwrite
$ uipcli codedapp pull abc-123-def --targetDir ./src
```

---

## Environment Variables

All flags can be supplied as environment variables (set by `uipcli login` or manually for CI/CD):

| Variable | Description |
|----------|-------------|
| `UIPATH_URL` | Platform base URL |
| `UIPATH_ORGANIZATION_NAME` | Organization name |
| `UIPATH_ORGANIZATION_ID` | Organization ID |
| `UIPATH_TENANT_NAME` | Tenant name |
| `UIPATH_TENANT_ID` | Tenant ID |
| `UIPATH_ACCESS_TOKEN` | Bearer token (skips interactive login) |
| `UIPATH_REFRESH_TOKEN` | Refresh token |
| `UIPATH_PROJECT_ID` | Studio Web project ID (for push/pull) |

---

## Config Files

| File | Written by | Purpose |
|------|-----------|---------|
| `.uipath/.auth` | `uipcli login` | Access tokens and org/tenant selection. **Do not commit.** |
| `.env` | `uipcli codedapp push` | `UIPATH_PROJECT_ID` for Studio Web push/pull |
| `.uipath/app.config.json` | `uipcli codedapp publish` / `deploy` | App `systemName`, `deployVersion`, `deploymentId` for subsequent runs |
| `uipath.json` | developer / `uipcli codedapp pack` | SDK config — read by `pack` and the `@uipath/coded-apps` dev plugin |
