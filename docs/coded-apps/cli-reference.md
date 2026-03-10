# CLI Reference

The `uipath` CLI manages the full lifecycle of a coded app.

---

## auth

Authenticate with the UiPath platform.

**Interactive mode** (default): Opens a browser for OAuth login, then prompts to select a tenant and folder. Credentials are saved to `.uipath/.auth.json`.

**Unattended mode**: Supply `--client-id`, `--client-secret`, `--base-url`, and `--scope` to use the client credentials flow — no browser required.

```
uipath auth [flags]
```

| Flag | Description |
|------|-------------|
| `--base-url <url>` | Platform base URL. Defaults to `UIPATH_BASE_URL` env var. |
| `--cloud` | Use `https://cloud.uipath.com` (default) |
| `--staging` | Use UiPath staging environment |
| `--alpha` | Use UiPath alpha environment |
| `--client-id <id>` | OAuth client ID (unattended mode) |
| `--client-secret <secret>` | OAuth client secret (unattended mode) |
| `--scope <scope>` | OAuth scopes, space-separated |
| `--org-id <id>` | Organization ID (skips interactive selection) |
| `--folder-key <key>` | Folder key (skips interactive selection) |

**Examples**

<!-- termynal -->

```bash
# Interactive login
$ uipath auth

# CI / unattended
$ uipath auth --base-url https://cloud.uipath.com \
    --client-id my-client --client-secret my-secret \
    --scope "OR.Execution OR.Folders"
```

---

## pack

Build a `.nupkg` package from a compiled app distribution directory.

Reads `uipath.json` from the project root (creates it with empty values if missing). For Web apps, validates that the `clientId` exists and is non-confidential before packaging.

```
uipath pack <dist-dir> [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--name <name>` | — | Package name. Allowed: lowercase letters, numbers, hyphens. Invalid chars are sanitized with a warning. |
| `--type <type>` | `Web` | App type: `Web` or `Action` |
| `--version <ver>` | `1.0.0` | Semantic version |
| `--org-id <id>` | from auth | Organization ID |
| `--tenant-id <id>` | from auth | Tenant ID |
| `--folder-key <key>` | from auth | Folder key |
| `--access-token <token>` | from auth | Bearer token |
| `--dry-run` | `false` | Preview without writing files |

**Name sanitization**

Names are automatically lowercased, underscores replaced with hyphens, and other invalid characters stripped. A warning is shown when the name is modified.

**clientId validation (Web apps)**

`clientId` in `uipath.json` is required for Web apps and must be a **non-confidential** OAuth client. `pack` validates this against the identity API before creating the package.

**Output**: `.uipath/<name>.<version>.nupkg`

**Examples**

<!-- termynal -->

```bash
$ uipath pack ./dist --name my-app
$ uipath pack ./dist --name my-app --type Action
$ uipath pack ./dist --name my-app --dry-run
```

---

## publish

Upload the package to Orchestrator and register it as a coded app version.

Discovers `.nupkg` files under `.uipath/`. If multiple exist, prompts you to choose. On success, writes `systemName` and `deployVersion` to `.uipath/app.config.json`.

```
uipath publish [flags]
```

| Flag | Description |
|------|-------------|
| `--org-id <id>` | Organization ID |
| `--tenant-id <id>` | Tenant ID |
| `--folder-key <key>` | Folder key |
| `--access-token <token>` | Bearer token |

**Examples**

<!-- termynal -->

```bash
$ uipath publish
```

---

## deploy

Deploy a published app version to a folder.

On **first deploy**: creates a new deployment, prompts for app name and folder if not supplied, and saves the deployment ID to `.uipath/app.config.json`.

On **subsequent deploys**: upgrades the existing deployment to the latest published version. The app URL is printed on completion.

```
uipath deploy [flags]
```

| Flag | Description |
|------|-------------|
| `--name <name>` | App name (required if not in `app.config.json`) |
| `--folder-key <key>` | Target folder key |
| `--org-id <id>` | Organization ID |
| `--tenant-id <id>` | Tenant ID |
| `--access-token <token>` | Bearer token |

**Examples**

<!-- termynal -->

```bash
# Interactive
$ uipath deploy

# Non-interactive
$ uipath deploy --name my-app --folder-key <key>
```

---

## Environment Variables

All flags can be supplied as environment variables for CI/CD pipelines:

| Variable | Description |
|----------|-------------|
| `UIPATH_BASE_URL` | Platform base URL |
| `UIPATH_ORG_ID` | Organization ID |
| `UIPATH_TENANT_ID` | Tenant ID |
| `UIPATH_FOLDER_KEY` | Deployment folder key |
| `UIPATH_ACCESS_TOKEN` | Bearer token (skips interactive login) |
| `UIPATH_CLIENT_ID` | OAuth client ID |
| `UIPATH_CLIENT_SECRET` | OAuth client secret |

---

## Config Files

| File | Written by | Purpose |
|------|-----------|---------|
| `.uipath/.auth.json` | `uipath auth` | Access tokens, org/tenant selection. **Do not commit.** |
| `.uipath/app.config.json` | `uipath publish` / `uipath deploy` | App `systemName`, `deployVersion`, `deploymentId` for subsequent runs |
| `uipath.json` | developer / `uipath pack` | SDK config — read by `pack` and the `@uipath/coded-apps` dev plugin |
