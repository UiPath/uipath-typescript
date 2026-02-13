# @uipath/cli

UiPath CLI tool for authentication, packaging, publishing, deploying, and pushing web applications to UiPath.

## Installation

```bash
# Install globally
npm install -g @uipath/cli

# Or install locally in your project
npm install @uipath/cli
```

## Prerequisites

Before using the CLI, set up your environment variables in a `.env` file:

```bash
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_ID=your-org-id
UIPATH_TENANT_ID=your-tenant-id
UIPATH_TENANT_NAME=your-tenant-name
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_ACCESS_TOKEN=your-access-token
```

## Usage

### Authentication

Authenticate with UiPath services:

```bash
# Interactive authentication (opens browser)
uipath auth

# Authenticate with specific domain
uipath auth --alpha
uipath auth --cloud
uipath auth --staging

# Non-interactive authentication (client credentials)
uipath auth --staging --clientId 'your-client-id' --clientSecret 'your-client-secret'

# Force re-authentication
uipath auth --force
```

**Flags:**
| Flag | Short | Description |
|------|-------|-------------|
| `--clientId` | | OAuth client ID for non-interactive auth |
| `--clientSecret` | | OAuth client secret for non-interactive auth |
| `--scope` | | OAuth scope (optional) |
| `--force` | `-f` | Force re-authentication |
| `--logout` | `-l` | Clear stored credentials |

### Registering Apps

Register your app with UiPath to get the app URL for OAuth configuration:

```bash
# Interactive registration
uipath register app

# Register with name and version
uipath register app --name MyApp --version 1.0.0

# Register Action app
uipath register app --name MyApp --type Action

# Non-interactive registration (all flags)
uipath register app \
  --name 'MyApp' \
  --version '1.0.0' \
  --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --tenantName 'MyTenant' \
  --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --accessToken 'your-access-token'
```

**Flags:**
| Flag | Short | Description |
|------|-------|-------------|
| `--name` | `-n` | App name |
| `--version` | `-v` | App version (default: 1.0.0) |
| `--type` | `-t` | App type: Web or Action (default: Web) |
| `--baseUrl` | | UiPath base URL (default: https://cloud.uipath.com) |
| `--orgId` | | UiPath organization ID |
| `--tenantId` | | UiPath tenant ID |
| `--tenantName` | | UiPath tenant name |
| `--folderKey` | | UiPath folder key |
| `--accessToken` | | UiPath access token |

This command will:
- Register the app with UiPath
- Return the app URL for OAuth redirect URI
- Save app configuration to `.uipath/app.config.json`
- Save the URL to your .env file

### Packaging

Package your built web applications (Angular, React, Vue, etc.) as UiPath NuGet packages:

```bash
# Package a built application (uses registered app config)
uipath pack ./dist

# Override registered name/version
uipath pack ./dist --name MyApp --version 2.0.0

```

**Flags:**
| Flag | Short | Description |
|------|-------|-------------|
| `--name` | `-n` | Package name |
| `--version` | `-v` | Package version (default: 1.0.0) |
| `--output` | `-o` | Output directory (default: ./.uipath) |

Note: If you've registered your app, the `pack` command will automatically use the saved app name and version.

### Publishing

Publish packages to UiPath Orchestrator:

```bash
# Interactive publish (uses .env or prompts)
uipath publish

# Publish from custom directory
uipath publish --uipathDir ./packages

# Non-interactive publish (all flags)
uipath publish \
  --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --tenantName 'MyTenant' \
  --accessToken 'your-access-token'
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--uipathDir` | Directory containing .nupkg files (default: ./.uipath) |
| `--baseUrl` | UiPath base URL (default: https://cloud.uipath.com) |
| `--orgId` | UiPath organization ID |
| `--tenantId` | UiPath tenant ID |
| `--tenantName` | UiPath tenant name |
| `--accessToken` | UiPath access token |

### Deploying

Deploy or upgrade apps to UiPath:

```bash
# Interactive deploy (uses .env or app config)
uipath deploy

# Deploy with app name
uipath deploy --name MyApp

# Non-interactive deploy (all flags)
uipath deploy \
  --name 'MyApp' \
  --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  --accessToken 'your-access-token'
```

**Flags:**
| Flag | Short | Description |
|------|-------|-------------|
| `--name` | `-n` | App name |
| `--baseUrl` | | UiPath base URL (default: https://cloud.uipath.com) |
| `--orgId` | | UiPath organization ID |
| `--tenantId` | | UiPath tenant ID |
| `--folderKey` | | UiPath folder key |
| `--accessToken` | | UiPath access token |

This command will:
- Check if the app is already deployed
- If deployed: upgrade to the latest published version
- If not deployed: perform initial deployment
- Display the app URL after successful deployment

### Push (Studio Web)

Push your local web app build to a Studio Web project. Syncs files under a build directory to the remote project and optionally imports referenced resources (assets, processes, connections, etc.) from `bindings.json`.

**Prerequisites:**
- Environment variables set (see [Prerequisites](#prerequisites)), or pass `--orgId`, `--tenantId`, `--accessToken` (and optionally `--baseUrl`, `--tenantName`) for non-interactive use. `UIPATH_PROJECT_ID` can be used instead of passing `<project-id>`.
- A built app (e.g. `dist/`, `build/`, or `out/`) at the project root.
- Optional: `bindings.json` at the project root for resource import; `.uipath/studio_metadata.json` for metadata.

```bash
# Push using project ID from environment
uipath push

# Push with project ID
uipath push <project-id>

# Non-interactive (e.g. CI): pass org, tenant, and token via flags
uipath push <project-id> --orgId <org-id> --tenantId <tenant-id> --accessToken <token>

# Use a different build directory (e.g. Create React App uses "build")
uipath push <project-id> --build-dir build

# Push and skip importing referenced resources from bindings.json
uipath push <project-id> --ignore-resources

# Combine flags
uipath push <project-id> --build-dir out --ignore-resources --orgId <org-id> --tenantId <tenant-id> --accessToken <token>
```

**Arguments:**
| Argument     | Description |
|-------------|-------------|
| `project-id` | WebApp Project ID (solution ID). Optional if `UIPATH_PROJECT_ID` is set in `.env`. |

**Flags:**
| Flag | Description |
|------|-------------|
| `--build-dir` | Relative path to the build output directory (e.g. `dist`, `build`, `out`). Default: `dist`. |
| `--ignore-resources` | Skip importing referenced resources (assets, processes, connections, etc.) to the Studio Web solution. Default: false. |
| `--baseUrl` | UiPath base URL (default: https://cloud.uipath.com). Overrides env. |
| `--orgId` | UiPath organization ID. Overrides env. |
| `--tenantId` | UiPath tenant ID. Overrides env. |
| `--tenantName` | UiPath tenant name. Overrides env. |
| `--accessToken` | UiPath bearer token for authentication. Overrides env. |

This command will:
- Validate the build directory exists and required files are present
- Acquire a lock on the remote project, then sync your build files (add/update/delete) under the project’s content root
- Optionally import resources referenced in `bindings.json` into the solution

## Commands

- [`uipath auth`](#authentication) - Authenticate with UiPath (interactive or client credentials)
- [`uipath register app`](#registering-apps) - Register app with UiPath and get the app URL
- [`uipath pack`](#packaging) - Package web applications as UiPath NuGet packages
- [`uipath publish`](#publishing) - Publish packages to Orchestrator
- [`uipath deploy`](#deploying) - Deploy or upgrade apps to UiPath
- [`uipath push`](#push-studio-web) - Push local build to Studio Web project (atomic sync)


## Workflow

**Pack → Publish → Deploy:**
1. **Register the app**: `uipath register app --name MyApp` (gets app URL for OAuth)
2. **Build your application**: Use your framework's build command (e.g., `npm run build`, `ng build`)
3. **Pack the application**: `uipath pack ./dist` (uses saved app config)
4. **Publish the package**: `uipath publish` (uploads to Orchestrator)
5. **Deploy the app**: `uipath deploy` (deploys or upgrades the app)

**Push (Studio Web):**
1. **Build your application**: Use your framework's build command.
2. **Push to Studio Web**: `uipath push <project-id>` from the project root. Use `--build-dir build` (or `out`, etc.) if your framework uses a different output folder than `dist`.

## Framework Support

This CLI works with any web framework that produces a static build:
- Angular (`ng build`) — default output: `dist/`
- React / Create React App (`npm run build`) — use `--build-dir build` with push
- Vite, Vue, static HTML/CSS/JS — default `dist/` or use `--build-dir` for custom output

## Development

This CLI is built using:
- [oclif](https://oclif.io/) - CLI framework for TypeScript
- [JSZip](https://stuk.github.io/jszip/) - Pure JavaScript ZIP file creation
- [Inquirer](https://www.npmjs.com/package/inquirer) - Interactive command line prompts
- [Chalk](https://www.npmjs.com/package/chalk) - Terminal styling
- [Ora](https://www.npmjs.com/package/ora) - Progress indicators
