# @uipath/cli

UiPath CLI tool for authentication, packaging, and publishing web applications to UiPath.

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
uipath auth --dalpha
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

Package your built web applications (Angular, React, Vue, Next.js, etc.) as UiPath NuGet packages:

```bash
# Package a built application (uses registered app config)
uipath pack ./dist

# Override registered name/version
uipath pack ./dist --name MyApp --version 2.0.0

# Package with custom output directory
uipath pack ./dist --output ./.packages
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


## Commands

- [`uipath auth`](#authentication) - Authenticate with UiPath (interactive or client credentials)
- [`uipath register app`](#registering-apps) - Register app with UiPath and get the app URL
- [`uipath pack`](#packaging) - Package web applications as UiPath NuGet packages
- [`uipath publish`](#publishing) - Publish packages to Orchestrator

## Requirements

- Node.js >= 18.0.0
- Valid UiPath Cloud or On-Premises instance with API access
- Access token with appropriate permissions for package upload and app deployment
- Built web application (dist folder) for packaging

## Workflow

1. **Register the app**: `uipath register app --name MyApp` (gets app URL for OAuth)
2. **Build your application**: Use your framework's build command (e.g., `npm run build`, `ng build`)
3. **Pack the application**: `uipath pack ./dist` (uses saved app config)
4. **Publish the package**: `uipath publish` (uploads to Orchestrator)

## Framework Support

This CLI works with any web framework that generates a `dist` folder:
- Angular (`ng build`)
- React (`npm run build`)
- Vue (`npm run build`)
- Next.js (`npm run build && npm run export`)
- Static HTML/CSS/JS projects

## Development

This CLI is built using:
- [oclif](https://oclif.io/) - CLI framework for TypeScript
- [JSZip](https://stuk.github.io/jszip/) - Pure JavaScript ZIP file creation
- [Inquirer](https://www.npmjs.com/package/inquirer) - Interactive command line prompts
- [Chalk](https://www.npmjs.com/package/chalk) - Terminal styling
- [Ora](https://www.npmjs.com/package/ora) - Progress indicators

## Troubleshooting

### Missing Environment Variables
If you see environment variable errors, ensure all required variables are set in your `.env` file.

### Package Not Found
If `uipath publish --app` says package not found, run `uipath publish` first to upload the package to Orchestrator.

### Build Errors
Ensure your application builds successfully before packaging. The CLI requires a valid `dist` directory with your built application files.