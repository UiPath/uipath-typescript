# CI/CD: GitHub Actions

A sample GitHub Actions workflow to pack, publish, and deploy a Coded App using the `uip` CLI with external app authentication.

## Prerequisites

Before copying the YAML below:

1. **Create a Confidential External Application** in UiPath Admin portal with application scopes: `Apps`, `OR.Folders.Read`, `OR.Execution`.
2. **Assign the external app** to the Orchestrator folder where you will be deploying your app (Settings → Manage Access → Assign external app).
3. **Store the secrets** in the repository settings:
    - Settings → Secrets and variables → Actions → New repository secret.
    - Add `UIPATH_CLIENT_ID` and `UIPATH_CLIENT_SECRET` as **secrets**.

## .github/workflows/deploy.yml

```yaml
name: Deploy Coded App

permissions:
  contents: read

on:
  workflow_dispatch:
    inputs:
      app-name:
        description: "App name to deploy"
        required: true
      path-name:
        description: "URL path name (https://<org>.uipath.host/<path-name>)"
        required: true
      org:
        description: "UiPath organization name"
        required: true
      tenant:
        description: "UiPath tenant name"
        required: true
      folder-key:
        description: "Orchestrator folder key (UUID)"
        required: true

env:
  NODE_VERSION: "20"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      # you can also pin to a specific version for reproducible builds
      - name: Install uip CLI
        run: npm install -g @uipath/cli

      - name: Install codedapp tool
        run: uip tools install codedapp

      # Authenticates using external app client credentials
      - name: Login to UiPath
        run: |
          uip login \
            --organization "${{ inputs.org }}" \
            --tenant "${{ inputs.tenant }}" \
            --client-id "${{ secrets.UIPATH_CLIENT_ID }}" \
            --client-secret "${{ secrets.UIPATH_CLIENT_SECRET }}" \
            --scope "Apps OR.Folders.Read OR.Execution"

      # Creates a .nupkg package from the built app
      - name: Pack
        run: uip codedapp pack ./dist --name "${{ inputs.app-name }}"

      # Uploads .nupkg to Orchestrator and registers the app version
      - name: Publish
        run: uip codedapp publish --name "${{ inputs.app-name }}"

      # Deploys to the specified folder — app becomes available at https://<org>.uipath.host/<path-name>
      - name: Deploy
        run: |
          uip codedapp deploy \
            --name "${{ inputs.app-name }}" \
            --path-name "${{ inputs.path-name }}" \
            --folder-key "${{ inputs.folder-key }}"
```

## Common variations

### Deploy on push to main

Replace `workflow_dispatch` with a push trigger and use `env` variables instead of `inputs`:

```yaml
name: Deploy Coded App

permissions:
  contents: read

on:
  push:
    branches: [main]

env:
  NODE_VERSION: "20"
  APP_NAME: "my-app"
  PATH_NAME: "my-app"
  ORG: "myorg"
  TENANT: "mytenant"
  FOLDER_KEY: "<your-folder-key>"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run build
      - run: npm install -g @uipath/cli
      - run: uip tools install codedapp
      - name: Login
        run: |
          uip login \
            --organization "${{ env.ORG }}" \
            --tenant "${{ env.TENANT }}" \
            --client-id "${{ secrets.UIPATH_CLIENT_ID }}" \
            --client-secret "${{ secrets.UIPATH_CLIENT_SECRET }}" \
            --scope "Apps OR.Folders.Read OR.Execution"
      - run: uip codedapp pack ./dist --name "${{ env.APP_NAME }}"
      - run: uip codedapp publish --name "${{ env.APP_NAME }}"
      - name: Deploy
        run: |
          uip codedapp deploy \
            --name "${{ env.APP_NAME }}" \
            --path-name "${{ env.PATH_NAME }}" \
            --folder-key "${{ env.FOLDER_KEY }}"
```

### Pin CLI version

```yaml
- name: Install uip CLI
  run: npm install -g @uipath/cli@1.4.0
```
