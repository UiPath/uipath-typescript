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
UIPATH_BASE_URL=https://your-orchestrator.com
UIPATH_ORG_ID=your-org-id
UIPATH_TENANT_ID=your-tenant-id
UIPATH_TENANT_NAME=your-tenant-name
UIPATH_FOLDER_ID=your-folder-id
UIPATH_BEARER_TOKEN=your-bearer-token
```

## Usage

### Registering Apps

Register your app with UiPath to get the app URL for OAuth configuration:

```bash
# Register app to get URL
uipath register app --name MyApp

# Register with specific version
uipath register app --name MyApp --version 1.0.0
```

This command will:
- Register the app with UiPath
- Return the app URL for OAuth redirect URI
- Save app configuration to `.uipath/app.config.json`
- Save the URL to your .env file
- Display the public client ID

### Packaging

Package your built web applications (Angular, React, Vue, Next.js, etc.) as UiPath NuGet packages:

```bash
# Package a built application (uses registered app config)
uipath pack ./dist

# Override registered name/version
uipath pack ./dist --name MyApp --version 2.0.0

# Package with custom output directory
uipath pack ./dist --output ./.packages

# Package with custom metadata
uipath pack ./dist --author "Your Name" --description "My UiPath App"

# Preview packaging without creating files
uipath pack ./dist --dry-run
```

Note: If you've registered your app, the `pack` command will automatically use the saved app name and version.

### Publishing

#### Publish Package to Orchestrator

```bash
# Publish package (uploads .nupkg to Orchestrator)
uipath publish

# Publish specific package if multiple exist
uipath publish
# (CLI will prompt you to select from available packages)
```


## Commands

- [`uipath auth`](#authentication) - Manage UiPath authentication (OAuth, API key, username/password)
- [`uipath register app`](#registering-apps) - Register app with UiPath and get the app URL
- [`uipath pack`](#packaging) - Package web applications as UiPath NuGet packages with metadata
- [`uipath publish`](#publishing) - Publish packages to Orchestrator

## Requirements

- Node.js >= 18.0.0
- Valid UiPath Cloud or On-Premises instance with API access
- Bearer token with appropriate permissions for package upload and app deployment
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