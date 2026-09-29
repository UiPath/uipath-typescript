# CLI Reference

The `uip` CLI manages the full deployment lifecycle of a coded action app.

## Installation

<!-- termynal -->
```bash
npm install -g @uipath/cli

uip tools install codedapp
```

!!! info "Minimum versions"
    Coded Action Apps requires **CLI version >= 0.9.0** and **codedapp tool version >= 0.9.0**. This reference reflects **CLI 1.202.1** and **codedapp tool 1.202.2**; some options are not available in older versions. The `validate` and `delete` commands require **codedapp tool version >= 1.202.2**.

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
| `--authority` | string | Custom authority URL | `https://cloud.uipath.com` |
| `-t, --tenant` | string | Tenant name (non-interactive mode) | — |
| `--organization` | string | Organization logical name to pre-select during browser login | — |
| `--interactive` | boolean | Prompt to select a tenant from a list | — |
| `--client-id` | string | Client ID of an [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications). Use `env.<NAME>` to read it from an environment variable | — |
| `--client-secret` | string | Client secret of the External App. Use `env.<NAME>` to read it from an environment variable | — |
| `-s, --scope` | string | Scopes to request for an External App, comma- or space-separated | — |
| `--no-browser` | boolean | Print the sign-in URL instead of opening a browser | — |

**Examples**

<!-- termynal -->

```bash
# Interactive login
$ uip login --interactive

# Specific tenant
$ uip login --tenant MyTenant

# Check login status
$ uip login status

# Log out and remove stored credentials
$ uip logout
```

---

## init

Create a starter app in a new or empty directory. Pass `--type Action` to create a coded action app.

```
$ uip codedapp init <path> [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--template` | string | Starter template: `form`, `dashboard`, or `inline-automation` | `form` |
| `--type` | string | App subtype. Omit for a coded app, or pass `Action` to create a coded action app | — |
| `--force` | boolean | Overwrite starter files in a non-empty directory | — |
| `--skip-solution-registration` | boolean | Do not register the project in the surrounding solution | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp init ./approve-invoice --type Action
```

---

## Build app

Before proceeding, make sure you build your coded action app using your framework's build command from the root of the project:

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
| `--display-name` | string | Display name of the app | Value of `--name` |
| `-v, --version` | string | Package version | `1.0.0` |
| `--output-dir` | string | Output directory | `./.uipath` |
| `--author` | string | Package author | `UiPath Developer` |
| `--description` | string | Package description | Package name |
| `--main-file` | string | Main entry file | `index.html` |
| `--content-type` | string | Content type: `webapp`, `library`, or `process` | `webapp` |
| `--release-notes` | string | Release notes for the package | — |
| `--repository-url` | string | Source repository URL (recorded in the package for traceability) | — |
| `--repository-commit` | string | Source repository commit hash (recorded in the package for traceability) | — |
| `--repository-branch` | string | Source repository branch | — |
| `--repository-type` | string | Source repository type | `git` when `--repository-url` is set |
| `--project-url` | string | Automation Hub idea URL | — |
| `--dry-run` | boolean | Show what would be packaged without creating it | — |

!!! info "Angular dist path"
    Angular 17+ outputs to `dist/<project-name>/browser/`. Angular 16 and earlier outputs to `dist/<project-name>/`.

**Output**: `.uipath/<name>.<version>.nupkg`

**Examples**

<!-- termynal -->

```bash
$ uip codedapp pack ./dist

$ uip codedapp pack ./dist --name MyApp

$ uip codedapp pack ./dist --name MyApp --version 1.0.0

$ uip codedapp pack ./dist --name my-app --display-name "My App" --version 1.0.0
```

---

## publish

Upload the `.nupkg` to Orchestrator and register it as a coded action app version. Pass `--type Action` so the app is registered as an Action Center task interface rather than a standalone web app.

```
$ uip codedapp publish --type Action [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name (non-interactive) | — |
| `-v, --version` | string | Package version (requires `--name`) | — |
| `-t, --type` | string | App type: `Web` or `Action`. Use `Action` for coded action apps | `Action` if `action-schema.json` exists in the current directory, otherwise `Web` |
| `--personal-workspace` | boolean | Publish to your Personal Workspace instead of the tenant | — |
| `--uipath-dir` | string | UiPath directory containing packages | `./.uipath` |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--org-name` | string | Organization name, used when `--org-id` is not provided | — |
| `--tenant-id` | string | Tenant ID | — |
| `--tenant-name` | string | Tenant name | — |
| `--access-token` | string | Access token | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp publish --type Action

$ uip codedapp publish --type Action --name MyApp

$ uip codedapp publish --type Action --name MyApp --version 2.0.0

$ uip codedapp publish --type Action --personal-workspace
```

---

## validate

Check whether a path name is free before deploying. A coded app is served at `https://<org>.uipath.host/<path-name>`, and path names are unique across the organization. When the name is taken, the command returns the app that holds it.

```
$ uip codedapp validate --path-name <name> [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--path-name` | string | Path name to check (**required**) | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--org-name` | string | Organization name | — |
| `--access-token` | string | Access token | — |

!!! note
    A taken name is a result, not an error, so both outcomes exit with code `0`. Read `Available` in the output; a non-zero exit means the lookup itself failed (for example, invalid credentials or missing permissions). The path name is sanitized to lowercase letters, digits, and hyphens before the check, the same way `deploy` sanitizes it.

**Examples**

<!-- termynal -->

```bash
$ uip codedapp validate --path-name my-app

$ uip codedapp validate --path-name my-app --output table
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
| `--display-name` | string | Display name of the deployed app | Value of `--name` |
| `--path-name` | string | App path name in the URL (`https://<org>.uipath.host/<path-name>`) | — |
| `--client-id` | string | Client ID of a non-confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications) | — |
| `-v, --version` | string | Target a specific published version | — |
| `--tags` | string | Comma-separated labels for the deployed app (e.g. `governance,insights`) | — |
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

$ uip codedapp deploy --name my-app --display-name "My App" --path-name my-app
```

---

## delete

Delete a deployed app from a folder. The published package and deployments in other folders are not affected.

```
$ uip codedapp delete --display-name <name> --yes [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--display-name` | string | Display name of the deployed app. Case-sensitive (**required**) | — |
| `--folder-key` | string | Key of the folder that contains the deployed app. Required unless `UIPATH_FOLDER_KEY` is set | — |
| `-y, --yes` | boolean | Confirm the deletion (**required**) | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--org-name` | string | Organization name | — |
| `--tenant-id` | string | Tenant ID | — |
| `--access-token` | string | Access token | — |

!!! warning
    Deletion cannot be undone.

**Examples**

<!-- termynal -->

```bash
$ uip codedapp delete --display-name "My App" --folder-key <folderKey> --yes
```

---

## push

Push local source code to a Studio Web project.

```
$ uip codedapp push [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--project-id` | string | Studio Web project ID. If omitted and `UIPATH_PROJECT_ID` is not set, you are prompted to create or select a solution | — |
| `--build-dir` | string | Build output directory | `dist` |
| `-v, --version` | string | Code version to set (e.g. `2.0.0`) | — |
| `--ignore-resources` | boolean | Skip importing referenced resources | — |
| `--verbose` | boolean | Show detailed progress logs | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--tenant-id` | string | Tenant ID | — |
| `--access-token` | string | Access token | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp push --project-id <projectId>

$ uip codedapp push --project-id <projectId> --build-dir build
```

---

## pull

Pull project files from a Studio Web project.

```
$ uip codedapp pull [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--project-id` | string | Studio Web project ID. Required unless `UIPATH_PROJECT_ID` is set | — |
| `--target-dir` | string | Local directory to write the files to | Current directory |
| `--overwrite` | boolean | Allow overwriting existing local files | — |
| `--verbose` | boolean | Show detailed progress logs | — |
| `--base-url` | string | UiPath base URL | — |
| `--org-id` | string | Organization ID | — |
| `--tenant-id` | string | Tenant ID | — |
| `--access-token` | string | Access token | — |

**Examples**

<!-- termynal -->

```bash
$ uip codedapp pull --project-id <projectId>

$ uip codedapp pull --project-id <projectId> --target-dir ./my-app --overwrite
```

---

## Upgrading / Deploying new version of a coded action app

When updating a deployed app, just repeat the build-pack-publish-deploy cycle with a bumped version:
<!-- termynal -->
```bash
# 1. Rebuild
npm run build
# 2. Pack with new version
uip codedapp pack dist -n <appName> --version 2.0.0
# 3. Publish
uip codedapp publish --type Action
# 4. Deploy (auto-detects upgrade)
uip codedapp deploy
``` 

## Global Options

These options work with every command.

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `--output` | string | Output format: `table`, `json`, `yaml`, or `plain` | `json` |
| `--output-filter` | string | JMESPath expression applied to the `Data` field of the output | — |
| `--log-level` | string | Log level: `debug`, `info`, `warn`, or `error` | `info` |
| `--log-file` | string | Write logs to a file instead of stderr | — |
| `--profile` | string | Use a named login profile | — |

## Environment Variables

Connection settings can also be set as environment variables (e.g. in CI/CD). Flags override them, and an active `uip login` session overrides the token, URL, organization, and tenant variables.

| Variable | Description |
|----------|-------------|
| `UIPATH_BASE_URL` | Platform base URL (`UIPATH_URL` is also accepted) |
| `UIPATH_ORG_ID` | Organization ID (`UIPATH_ORGANIZATION_ID` is also accepted) |
| `UIPATH_ORG_NAME` | Organization name |
| `UIPATH_TENANT_NAME` | Tenant name |
| `UIPATH_TENANT_ID` | Tenant ID |
| `UIPATH_FOLDER_KEY` | Folder key |
| `UIPATH_ACCESS_TOKEN` | Bearer token (skips interactive login) |
| `UIPATH_PROJECT_ID` | Studio Web project ID for push/pull. Also read from a `.env` file in the current directory |

---

## Config Files

| File | Written by | Purpose |
|------|-----------|---------|
| `.uipath/.auth` | `uip login` | Access tokens and org/tenant selection. Uses the nearest `.uipath/.auth` in the current or a parent directory, otherwise `~/.uipath/.auth` |
| `.uipath/app.config.json` | `uip codedapp publish` / `uip codedapp deploy` | App `systemName`, `deployVersion`, `deploymentId` for subsequent runs |
| `uipath.json` | developer / `uip codedapp pack` | SDK config — read by `pack` and the `@uipath/coded-apps-dev` dev plugin |
