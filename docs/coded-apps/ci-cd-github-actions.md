# CI/CD: GitHub Actions

This page gives you a complete `.github/workflows/deploy.yml` that **installs the CLI, authenticates with an External Application, packs, publishes, and deploys a Coded App**. Drop it into your repo, add two secrets, and it runs.

## Prerequisites

Before copying the YAML below:

1. **Create an External Application** in UiPath Cloud Portal with scopes: `Apps`, `OR.Folders.Read`, `OR.Administration`, `OR.Execution`.
2. **Assign the external app** to the target Orchestrator folder (Settings → Manage Access → Assign external app).
3. **Store the secrets** in the repository settings:
    - Settings → Secrets and variables → Actions → New repository secret.
    - Add `UIPATH_CLIENT_ID` and `UIPATH_CLIENT_SECRET` as **secrets**.
    - Add `UIPATH_ORG` and `UIPATH_TENANT` as **variables** (not secrets — they're not sensitive).

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
      environment:
        description: "Target environment"
        required: true
        default: "alpha"
        type: choice
        options:
          - alpha
          - staging
          - cloud

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

      - name: Install uip CLI
        run: npm install -g @uipath/uip

      - name: Login to UiPath
        run: |
          uip login \
            --authority "https://${{ inputs.environment }}.uipath.com" \
            --organization "${{ vars.UIPATH_ORG }}" \
            --tenant "${{ vars.UIPATH_TENANT }}" \
            --client-id "${{ secrets.UIPATH_CLIENT_ID }}" \
            --client-secret "${{ secrets.UIPATH_CLIENT_SECRET }}" \
            --scope "Apps OR.Folders.Read OR.Administration OR.Execution"

      - name: Pack
        run: uip codedapp pack ./dist

      - name: Publish
        run: uip codedapp publish --name "${{ inputs.app-name }}"

      - name: Deploy
        run: |
          uip codedapp deploy \
            --name "${{ inputs.app-name }}" \
            --path-name "${{ inputs.path-name }}"
```

## Walkthrough

### Login

```yaml
uip login \
  --authority "https://alpha.uipath.com" \
  --organization "myorg" \
  --tenant "mytenant" \
  --client-id "${{ secrets.UIPATH_CLIENT_ID }}" \
  --client-secret "${{ secrets.UIPATH_CLIENT_SECRET }}" \
  --scope "Apps OR.Folders.Read OR.Administration OR.Execution"
```

Authenticates using the external app's client credentials. The `--scope` flag requests:

| Scope | Why |
|---|---|
| `Apps` | Access to Apps service APIs (publish, deploy, list) |
| `OR.Folders.Read` | Read folder metadata from Orchestrator during deploy |
| `OR.Administration` | Manage deployment resources |
| `OR.Execution` | Execute deployment operations |

### Pack

```yaml
uip codedapp pack ./dist
```

Creates a `.nupkg` package from your built app in `./dist`. Output goes to `.uipath/` directory.

### Publish

```yaml
uip codedapp publish --name "my-app"
```

Uploads the `.nupkg` to Orchestrator and registers the coded app version in Apps service.

### Deploy

```yaml
uip codedapp deploy --name "my-app" --path-name "my-app-url"
```

Deploys the published version to a folder. The app becomes available at `https://<org>.uipath.host/<path-name>`.

## Common variations

### Deploy on push to main

Replace `workflow_dispatch` with:

```yaml
on:
  push:
    branches: [main]
```

And hardcode the app name and path instead of using inputs.

### Pin CLI version

```yaml
- name: Install uip CLI
  run: npm install -g @uipath/uip@1.4.0
```
