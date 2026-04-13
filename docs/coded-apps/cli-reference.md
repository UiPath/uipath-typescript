# CLI Reference

The `uip` CLI manages the full deployment lifecycle of a coded app.

## Installation

<!-- termynal -->
```bash
npm install -g @uipath/cli

uip tools install codedapp
```

!!! info "Minimum versions"
    Coded Apps requires **CLI version >= 0.1.21** and **codedapp tool version >= 0.1.14**.

    Check your installed CLI version:

    ```bash
    uip --version
    ```

    Check your installed codedapp tool version:

    ```bash
    uip tools list
    ```

    To update the codedapp tool to the latest version:

    ```bash
    uip tools update
    ```

---

## login

Authenticate with the UiPath platform.

```
$ uip login [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-f, --file` | string | Path to credentials folder | — |
| `--authority` | string | Custom authority URL | — |
| `--client-id` | string | Client ID or Application ID | — |
| `--client-secret` | string | Client secret or Application secret | — |
| `-s, --scope` | string | Custom scopes (space-separated) | — |
| `-t, --tenant` | string | Tenant name (non-interactive mode) | — |
| `--it, --interactive` | boolean | Interactively select tenant from list | — |

**Examples**

<!-- termynal -->

```bash
# Interactive login
$ uip login -it

# Specific tenant
$ uip login --tenant MyTenant

# Check login status
$ uip login status
```

---

## Build app

Before proceeding, make sure you build your coded app using your framework's build command from the root of the project:

```
$ npm run build
```
This will create the `dist` (or build) folder.

## pack

Package a built app into a `.nupkg`.

```
$ uip codedapp pack <dist> [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name | — |
| `--version` | string | Package version | `1.0.0` |
| `-o, --output` | string | Output directory | `./.uipath` |
| `--author` | string | Package author | `UiPath Developer` |
| `--description` | string | Package description | — |
| `--main-file` | string | Main entry file | `index.html` |
| `--content-type` | string | Content type: `webapp`, `library`, or `process` | `webapp` |
| `--dry-run` | boolean | Show what would be packaged without creating it | — |
| `--reuse-client` | boolean | Reuse existing clientId from uipath.json | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--tenant-id` | string | Tenant ID | — |
| `--access-token` | string | Access token | — |

!!! info "Angular dist path"
    Angular 17+ outputs to `dist/<project-name>/browser/`. Angular 16 and earlier outputs to `dist/<project-name>/`.

**Output**: `.uipath/<name>.<version>.nupkg`

**Examples**

<!-- termynal -->

```bash
$ uip codedapp pack ./dist

$ uip codedapp pack ./dist --name MyApp

$ uip codedapp pack ./dist --name MyApp --version 1.0.0

```

---

## publish

Upload the `.nupkg` to Orchestrator and register it as a coded app version.

```
$ uip codedapp publish [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name (non-interactive) | — |
| `--version` | string | Package version (requires `--name`) | — |
| `-t, --type` | string | App type: `Web` or `Action` | `Web` |
| `--uipath-dir` | string | UiPath directory containing packages | `./.uipath` |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--tenant-id` | string | Tenant ID | — |
| `--tenant-name` | string | Tenant name | — |
| `--access-token` | string | Access token | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp publish

$ uip codedapp publish --name MyApp

$ uip codedapp publish --name MyApp --version 2.0.0
```

---

## deploy

Deploy a published app version to a folder.

```
$ uip codedapp deploy [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | App name | — |
| `--version` | string | Target a specific published version | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--org-name` | string | Organization name | — |
| `--tenant-id` | string | Tenant ID | — |
| `--folder-key` | string | Folder key | — |
| `--access-token` | string | Access token | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp deploy

$ uip codedapp deploy --name MyApp
```

---


## Upgrading / Deploying new version of a coded app

When updating a deployed app, just repeat the build-pack-publish-deploy cycle with a bumped version:
<!-- termynal -->
```bash
# 1. Rebuild
npm run build
# 2. Pack with new version
uip codedapp pack dist -n my-webapp --version 2.0.0
# 3. Publish
uip codedapp publish
# 4. Deploy (auto-detects upgrade)
uip codedapp deploy
``` 

## Environment Variables

All flags can be supplied as environment variables (set by `uip login` or manually for CI/CD):

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
| `.uipath/.auth` | `uip login` | Access tokens and org/tenant selection. |
| `.uipath/app.config.json` | `uip codedapp publish` / `uip codedapp deploy` | App `systemName`, `deployVersion`, `deploymentId` for subsequent runs |
| `uipath.json` | developer / `uip codedapp pack` | SDK config — read by `pack` and the `@uipath/coded-apps-dev` dev plugin |
