# GitHub Actions Workflows

## Overview

The publishing system consists of three separate workflows:

### 1. Auto Version and Publish SDK (`auto-version-and-publish.yml`)
- **Trigger**: Manual only (`workflow_dispatch`)
- **Purpose**: Publishes SDK to npm registry with automatic beta version increments
- **Scope**: SDK only (no CLI publishing)

### 2. Publish to GitHub Packages (`publish-github-packages.yml`)  
- **Trigger**: Manual only (`workflow_dispatch`)
- **Purpose**: Publishes SDK to GitHub Packages registry
- **Scope**: SDK only

### 3. Deploy Documentation (`docs.yml`)
- **Trigger**: Push to main branch or manual
- **Purpose**: Builds and deploys documentation to GitHub Pages

## Auto Version and Publish SDK

### How It Works

1. **Telemetry Constants Update**
   - Updates `CONNECTION_STRING` from GitHub secrets
   - Updates `CLI_VERSION` from `packages/cli/package.json`
   - Updates `SDK_VERSION` from root `package.json`

2. **Automatic Beta Versioning**
   - Current: `1.0.0-beta.8` → New: `1.0.0-beta.9`
   - Automatically increments the beta number
   - If not a beta version, adds `-beta.1`

3. **Build and Publish Process**
   - `npm install` - Install dependencies
   - Update telemetry constants with secrets
   - `npm run build` - Build the SDK
   - Auto-increment version
   - `npm pack` - Create package
   - `npm publish` - Publish to npm registry
   - Create git tag and commit changes

### Manual Trigger

1. Go to **GitHub Actions** → **Auto Version and Publish SDK**
2. Click **"Run workflow"**
3. Select branch (usually `main`)
4. Click **"Run workflow"**

## Publish to GitHub Packages

### Features

- **Optional Version Input**: Specify custom version or use current package.json
- **Same Build Process**: Includes telemetry updates and full build
- **Independent**: Doesn't affect main publishing workflow

### Manual Trigger

1. Go to **GitHub Actions** → **Publish to GitHub Packages**
2. Click **"Run workflow"**
3. Optionally enter specific version (leave blank for current)
4. Click **"Run workflow"**


## Documentation Deployment

### How It Works

1. **Python Environment Setup**
   - Creates Python virtual environment
   - Installs dependencies from `requirements.txt`

2. **Build Process**
   - `npm run docs:api` - Generate TypeDoc API documentation
   - `mkdocs build` - Build MkDocs site
   - `mkdocs gh-deploy --force` - Deploy to GitHub Pages

### Manual Trigger

Documentation builds automatically on push to main, but can also be triggered manually.

## Required Secrets

Make sure these secrets are configured in your repository:

- **`NPM_TOKEN`**: For publishing to npm registry
- **`CONNECTION_STRING`**: For telemetry configuration
- **`GITHUB_TOKEN`**: Automatically provided (for GitHub Packages)

## Local Development

### Build Commands

```bash
npm install              # Install all dependencies
npm run build           # Build SDK and all packages
npm run docs:api        # Generate API documentation
npm run verify          # Verify package configurations
```

### Testing Workflows Locally

```bash
# Test the build process
npm install
npm run build
npm pack

# Test documentation
npm run docs:api
# Then use MkDocs locally (requires Python setup)
```

## Troubleshooting

- **Build failures**: Check TypeScript compilation and dependencies
- **Publish failures**: Verify npm token and package.json configuration
- **Documentation failures**: Check Python environment and MkDocs configuration
- **Telemetry constants**: Ensure CONNECTION_STRING secret is set
- **Version conflicts**: Check if version already exists in registry