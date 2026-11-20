# CLI Reference

The `uip` CLI manages the full deployment lifecycle of a coded app.

## Installation

<!-- termynal -->
```bash
npm install -g @uipath/cli

uip tools install codedapp
```

!!! info "Minimum versions"
    Coded Apps requires **CLI version >= 0.9.0** and **codedapp tool version >= 0.9.0**. This reference reflects **CLI 1.202.1** and **codedapp tool 1.202.2**; some options are not available in older versions. The `validate` and `delete` commands require **codedapp tool version >= 1.202.2**.

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

!!! note
    For **automated / non-interactive** deploys (CI/CD, AI app builders), authenticate with a **confidential external app** using `--client-id` and `--client-secret` (requires CLI 1.1.0+). See [CI/CD: GitHub Actions](ci-cd-github-actions.md) and [App Builder Integrations](../ai-app-builders/getting-started.md). Interactive browser login (`uip login --interactive`) is intended for local development.

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

Create a starter coded app in a new or empty directory.

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
$ uip codedapp init ./expense-app

$ uip codedapp init ./expense-app --template dashboard
```

---

## convert

Convert an exported low-code app into a React + TypeScript coded app you own. The conversion runs on your machine: it contacts no tenant and needs no login.

```
$ uip codedapp convert <file> [options]
```

`<file>` is one of two exports:

- A `.uiapp` file: a **VB app**, exported from Apps Studio. A VB app is a low-code app whose expressions are written in VB.
- A `.uis` file: a **Unified Build Solution**, which is a solution built in Studio Web and exported from it (right-click the solution, then **Export**). Its apps keep their event logic in workflows, which become TypeScript handlers in the coded app. A solution can hold several apps, and each one becomes a project of its own.

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `<file>` | string | The export: a `.uiapp` file (VB app) or a `.uis` file (Unified Build Solution). Put it before `--app` | required |
| `--out` | string | Output directory. It must be missing or empty unless you pass `--force` | `./<file name>` |
| `--app` | string[] | For a `.uis` that holds several apps: the names of the apps to convert, or `all`. Not needed when the solution holds one app, and not accepted for a `.uiapp` | — |
| `--skip-solution-registration` | boolean | Write a standalone coded app: do not extract the `.uis` into `--out`, and do not register the app in a solution | — |
| `--client-id` | string | Client ID of the non-confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications) the coded app signs users in with. Written to `uipath.json` as `clientId` and, for an app registered in a solution, to its solution resource as `externalClientId` | — |
| `--force` | boolean | Convert into a non-empty directory (a re-conversion). The generated code is replaced, hand edits included; `uipath.json` and `node_modules` are kept | — |
| `--refresh` | boolean | Bind every expression afresh instead of reusing the output directory's bind cache | — |

!!! info "Requirements"
    - The **.NET 10 Runtime** must be installed on the machine that runs `convert`. Check with `dotnet --list-runtimes`: the output must include a line starting with `Microsoft.NETCore.App 10.`. The converter itself ships with the codedapp tool.
    - `convert` requires **codedapp tool version >= 1.205.0**. Converting a Unified Build Solution (`.uis`), and the `--app`, `--skip-solution-registration` and `--client-id` options, require **codedapp tool version >= 1.207.0**.

**What you get**

A Vite + React + TypeScript project with one component per page and typed data access through `@uipath/uipath-typescript`. Beside the code:

- `conversion-report.json` lists what converted, what did not, and where each gap comes from: `converter`, `source-app` (already broken in the low-code app) or `by-design`.
- The `fix-converted-app` skill for your coding agent. Run `uip skills install --repo ./.uipath/agent-skills --path .` from the converted project, then ask your agent to run `fix-converted-app`: it works through the gaps the report attributes to the converter.
- For an action app, `action-schema.json` with the task's inputs, outputs and outcomes. The result is a coded action app.

**Where the output goes**

A `.uiapp` converts into a standalone project in `--out`. Configure, build and deploy it like any other coded app: [`pack`](#pack), [`publish`](#publish), [`deploy`](#deploy).

A `.uis` converts **into its solution**, so the coded app can keep using the solution's resources (connections, queues, buckets). The solution is extracted into `--out` and each selected app is added beside the original as a project named `<App>_Coded`:

```
invoices/                  # --out: the extracted solution
  Invoices.uipx            # now lists both apps
  Invoices/                # the original low-code app, untouched
  Invoices_Coded/          # the converted app, registered in the solution
    source/                # the React + TypeScript project: run npm install and npm run build here
```

Deploy an app converted this way with the solution, not with `uip codedapp pack`, `publish` or `deploy`:

<!-- termynal -->

```bash
$ cd invoices/Invoices_Coded/source && npm install && npm run build && cd ../..

$ uip solution pack . ./pack

$ uip solution publish ./pack/<package>_<version>.zip --wait

$ uip solution deploy run -n <deployment> --package-name <package> --package-version <version> --folder-name <folder>
```

To open the solution in Studio Web instead, run `uip solution upload .`. See [Coded App inside Solution](ci-cd-github-actions.md#coded-app-inside-solution) for the same flow in a pipeline.

A solution deploy requires the coded app's External App. Pass it with `--client-id` when you convert, or set `clientId` in `source/uipath.json` and convert again with `--force`. The app's deployed URL must be one of that External App's redirect URLs.

Pass `--skip-solution-registration` to get a standalone project from a `.uis` instead.

**Result**

`Code` in the result tells a script how the conversion went:

| `Result` | `Code` | Meaning |
|----------|--------|---------|
| `Success` | `ConvertCompleted` | Everything converted; the report attributes nothing to the converter |
| `Success` | `ConvertCompletedWithGaps` | The project builds and runs, but `conversion-report.json` lists things the converter did not manage |
| `Failure` | `ConvertOutputCannotRun` | The project was written but cannot run as it is; the report says why |
| `Failure` | `ConvertNotRegistered` | The project was written into a solution but is not registered in it; `Instructions` says how to register it |
| `Failure` | `CONVERT_*` | The command stopped before converting, for example an unreadable file, a non-empty `--out` without `--force`, a missing .NET runtime, or a solution with several apps and no `--app`. `Message` and `Instructions` say what to change |

**Examples**

<!-- termynal -->

```bash
# VB app: the coded app lands in ./expense-app
$ uip codedapp convert ./expense-app.uiapp

# Choose the output directory
$ uip codedapp convert ./expense-app.uiapp --out ./apps/expense

# Convert again into the same directory, binding every expression afresh
$ uip codedapp convert ./expense-app.uiapp --force --refresh

# Unified Build Solution with one app: converted into the solution in ./Invoices
$ uip codedapp convert ./Invoices.uis

# Solution with several apps: convert all of them, or name the ones you want
$ uip codedapp convert ./HR.uis --app all --out ./hr
$ uip codedapp convert ./HR.uis --app Onboarding Leave --out ./hr

# Set the External App the coded app signs users in with
$ uip codedapp convert ./Invoices.uis --out ./invoices --client-id <client-id>

# A standalone coded app, outside any solution
$ uip codedapp convert ./Invoices.uis --out ./invoices-app --skip-solution-registration
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

Upload the `.nupkg` to Orchestrator and register it as a coded app version.

```
$ uip codedapp publish [options]
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `-n, --name` | string | Package name (non-interactive) | — |
| `-v, --version` | string | Package version (requires `--name`) | — |
| `-t, --type` | string | App type: `Web` or `Action` | `Action` if `action-schema.json` exists in the current directory, otherwise `Web` |
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
$ uip codedapp publish

$ uip codedapp publish --name MyApp

$ uip codedapp publish --name MyApp --version 2.0.0

$ uip codedapp publish --personal-workspace
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
| `--project-id` | string | Studio Web project ID. If omitted and `UIPATH_PROJECT_ID` is not set, you are prompted to create or select a solution (use `--solution-name`/`--project-name` to skip the prompts) | — |
| `--solution-name` | string | Name of the Studio Web solution to create when no project ID is set. Required with `--project-name` when the CLI cannot prompt | Prompted |
| `--project-name` | string | Name of the Coded App project to create in that solution | Prompted |
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

$ uip codedapp push --solution-name "Product Announcements" --project-name "Announcements Portal"
```

The first push saves the new project ID to `.env` as `UIPATH_PROJECT_ID`, and later pushes use it. `--solution-name` and `--project-name` only apply when no project ID is set. If one is set by `--project-id`, `UIPATH_PROJECT_ID`, or `.env`, push fails instead of pushing into that project, so running the same command with these flags a second time fails.

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

## Upgrading / Deploying new version of a coded app

When updating a deployed app, just repeat the build-pack-publish-deploy cycle with a bumped version:
<!-- termynal -->
```bash
# 1. Rebuild
npm run build
# 2. Pack with new version
uip codedapp pack dist -n <appName> --version 2.0.0
# 3. Publish
uip codedapp publish
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
