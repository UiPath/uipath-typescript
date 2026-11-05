# CI/CD: GitHub Actions

Build, pack, publish, and deploy a Coded App from a CI/CD pipeline with the `uip` CLI. The lifecycle has three stages:

1. **Create** the solution and the app, once, on your machine.
2. **Develop** the app locally and commit your changes.
3. **Build and deploy** in the pipeline. Every run packs a new version, publishes it, and deploys it: the first run installs the app, and later runs upgrade it. No run needs manual input.

The examples use GitHub Actions. The `uip` commands are the same in any CI/CD system; only the way secrets reach them differs (see [Other CI/CD systems](#other-cicd-systems)).

This page covers:

- [A Coded App inside a solution](#githubworkflowsdeployyml): created with `uip codedapp init`, deployed with `uip solution`.
- [Referencing an existing Coded Action App](#reference-an-existing-coded-action-app): adding it to the solution and linking it to the deployed app.
- [A standalone Coded App](#standalone-coded-app-no-solution): no solution, deployed with `uip codedapp`.

!!! note "Requirements"
    - `@uipath/cli` **1.205.0** or later, with the `solution` and `codedapp` tools.
    - Node.js **22** or later, on your machine and in the workflow.

## Authentication

### OAuth login (local setup and development)

Sign in from your own machine for the one-time setup and while developing:

```bash
uip login --organization <org> --tenant <tenant>
```

This opens a browser, so a pipeline cannot use it. Workflows authenticate with a Personal Access Token.

### Personal Access Token (workflows)

A Personal Access Token (PAT) is created once, stored in your CI/CD system's secret store, and passed to every `uip` command through environment variables. No login step runs in the pipeline.

1. **Create the token** while signed in:

    ```bash
    uip admin pat create \
      --description "GitHub Actions deploy" \
      --expiration 2027-03-31 \
      --scope "Apps,OR.Folders,OR.Execution,OR.AutomationSolutions.Access,Solutions.Packages,Solutions.Deployments,RCS.FolderAuthorization"
    ```

    The token is printed once, in `Data.Token`. Manage it later with `uip admin pat list`, `uip admin pat regenerate`, and `uip admin pat revoke`.

    | Scope | Needed for |
    |-------|------------|
    | `Apps` | Publishing, deploying, and exporting apps |
    | `OR.Folders`, `OR.Execution` | Folder lookups, package upload and download |
    | `OR.AutomationSolutions.Access` | Adding a deployed Coded App to a solution (`uip solution resources add`) |
    | `Solutions.Packages`, `Solutions.Deployments` | Publishing and deploying the solution |
    | `RCS.FolderAuthorization` | Finding deployed apps by name (`uip solution resources add`) |

2. **Find your organization and tenant IDs**: run `uip login status --output json` and read `OrganizationId` and `TenantId`.

3. **Store the values** with your CI/CD system's secret mechanism: the token as a secret, the organization and tenant as plain variables. In GitHub, use the repository settings (Settings → Secrets and variables → Actions):
    - Secret `UIPATH_PAT`: the token.
    - Variables `UIPATH_ORG`, `UIPATH_ORG_ID`, `UIPATH_TENANT`, `UIPATH_TENANT_ID`.

4. **Expose them as environment variables** to the deploy step. `UIPATH_URL` is required because a PAT carries no server information. In GitHub Actions:

    ```yaml
    env:
      UIPATH_CLI_ENABLE_ENV_AUTH: "true"
      UIPATH_CLI_AUTH_TOKEN: ${{ secrets.UIPATH_PAT }}
      UIPATH_URL: "https://cloud.uipath.com"
      UIPATH_CLI_ORGANIZATION_NAME: ${{ vars.UIPATH_ORG }}
      UIPATH_CLI_ORGANIZATION_ID: ${{ vars.UIPATH_ORG_ID }}
      UIPATH_CLI_TENANT_NAME: ${{ vars.UIPATH_TENANT }}
      UIPATH_CLI_TENANT_ID: ${{ vars.UIPATH_TENANT_ID }}
    ```

!!! warning "A PAT acts as you"
    Commands run with your user's folder permissions. A PAT is never refreshed: create a new one before it expires, because an expired or revoked token fails with `401` without any earlier warning. If a command reports missing credentials, `uip login which` names the variables that are not set.

## One-time setup

Run these on your machine, signed in with OAuth, and commit the result.

1. **Create the solution and the app inside it.** `uip codedapp init` registers the app in the surrounding solution:

    ```bash
    uip solution init my-solution
    cd my-solution
    uip codedapp init my-app                 # add --type Action for a Coded Action App
    ```

    ```text
    my-solution/
    ├── my-solution.uipx
    ├── resources/
    └── my-app/
        ├── project.uiproj
        ├── webAppManifest.json
        └── source/
            ├── package.json
            ├── uipath.json
            └── dist/          # packed into the solution
    ```

2. **Develop the app** in `my-app/source` with the framework of your choice. Configure `uipath.json` and local development as described in [Getting Started](getting-started.md), and make the build write to `my-app/source/dist`.

3. **Ignore generated files** in the solution's `.gitignore`:

    ```text
    out/
    userProfile/
    deploy-config*.json
    node_modules/
    */source/dist/
    ```

4. **Commit** the solution folder.

## .github/workflows/deploy.yml

The `build` job has no access to UiPath credentials. The `deploy` job holds the PAT; give it a [GitHub environment](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) with required reviewers to approve each deployment before it runs.

```yaml
name: Deploy solution

permissions:
  contents: read

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Solution package version (default: 1.0.<run number>)"
        required: false

env:
  NODE_VERSION: "22"
  # Or pin an exact version for reproducible builds
  UIP_CLI_VERSION: ">=1.205.0"
  SOLUTION: "my-solution"
  APP: "my-app"
  # The app is served at https://<org>.uipath.host/<routing-name>
  ROUTING_NAME: "my-app"
  PARENT_FOLDER: "Shared"
  VERSION: ${{ inputs.version || format('1.0.{0}', github.run_number) }}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Build the app
        working-directory: ${{ env.SOLUTION }}/${{ env.APP }}/source
        run: |
          npm ci
          npm run build

      - name: Upload the build
        uses: actions/upload-artifact@v4
        with:
          name: app-dist
          path: ${{ env.SOLUTION }}/${{ env.APP }}/source/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    env:
      UIPATH_CLI_ENABLE_ENV_AUTH: "true"
      UIPATH_CLI_AUTH_TOKEN: ${{ secrets.UIPATH_PAT }}
      UIPATH_URL: "https://cloud.uipath.com"
      UIPATH_CLI_ORGANIZATION_NAME: ${{ vars.UIPATH_ORG }}
      UIPATH_CLI_ORGANIZATION_ID: ${{ vars.UIPATH_ORG_ID }}
      UIPATH_CLI_TENANT_NAME: ${{ vars.UIPATH_TENANT }}
      UIPATH_CLI_TENANT_ID: ${{ vars.UIPATH_TENANT_ID }}
      # Non-confidential external app the deployed app signs users in with
      APP_CLIENT_ID: ${{ vars.UIPATH_APP_CLIENT_ID }}
    defaults:
      run:
        working-directory: ${{ env.SOLUTION }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download the build
        uses: actions/download-artifact@v4
        with:
          name: app-dist
          path: ${{ env.SOLUTION }}/${{ env.APP }}/source/dist

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install uip CLI
        run: |
          npm install -g "@uipath/cli@${UIP_CLI_VERSION}"
          uip tools install solution
          uip tools install codedapp

      - name: Pack
        run: uip solution pack . ./out --version "$VERSION"

      - name: Publish
        run: uip solution publish "./out/${SOLUTION}_${VERSION}.zip" --wait

      # The default config has no client ID and the routing name "default-app": set both on every run (a Coded Action App needs neither)
      - name: Prepare the deploy config
        run: |
          uip solution deploy config get "$SOLUTION" --package-version "$VERSION" -d deploy-config.json
          uip solution deploy config set deploy-config.json "$APP" routingName "$ROUTING_NAME"
          uip solution deploy config set deploy-config.json "$APP" externalClientId "$APP_CLIENT_ID"

      # Installs on the first run and upgrades in place afterwards; the deployment is matched by --name
      - name: Deploy
        run: |
          uip solution deploy run \
            --name "$SOLUTION" \
            --package-name "$SOLUTION" \
            --package-version "$VERSION" \
            --folder-name "$SOLUTION" \
            --parent-folder-path "$PARENT_FOLDER" \
            --config-file deploy-config.json \
            --yes
```

`deploy run` also activates the solution. After the job succeeds, the app is live at `https://<org>.uipath.host/<routing-name>`.

!!! tip "Approval gates"
    Gate the `deploy` job, as above, rather than activation. `deploy run --skip-activate` followed by `uip solution deploy activate <name>` holds back only the first install; on an upgrade the new version goes live during `deploy run`.

## Reference an existing Coded Action App

A solution can use a Coded Action App that is already deployed outside it.

1. **Add the app to the solution.** Run this once, signed in, and commit the files it writes under `resources/`:

    ```bash
    uip solution resources add --source remote --kind App --name my-action-app --folder-path Shared
    ```

    It is safe to run again: an app that is already in the solution is reported as `Unchanged`. To run it in the workflow instead, retry it. A freshly deployed app can take a few minutes to become findable, and until then the command fails with `No remote resource found`:

    ```yaml
    - name: Add the Coded Action App
      run: |
        for attempt in 1 2 3 4 5 6 7 8 9 10; do
          uip solution resources add --source remote --kind App --name my-action-app --folder-path Shared && exit 0
          sleep 30
        done
        exit 1
    ```

2. **Choose how it is deployed:**
    - **Link it** to the deployed app. The solution uses the existing deployment and installs no copy. Add this to the **Prepare the deploy config** step:

        ```bash
        uip solution deploy config link deploy-config.json my-action-app --name my-action-app --folder-path Shared
        ```

    - **Install the solution's own copy.** Skip the link. The copy lives in the solution's folder and follows the solution's version; the original deployment is not changed.

## Common variations

### Deploy a new version

Run the workflow again. Each run packs a new version (`1.0.<run number>` unless you pass `version`), and `deploy run` upgrades the existing deployment in place.

### Deploy on push to main

Replace the trigger:

```yaml
on:
  push:
    branches: [main]
```

## Other CI/CD systems

The build and deploy steps above are plain shell commands, so they run unchanged in Azure DevOps, Jenkins, or any other CI/CD system. Store the PAT in that system's secret store and map it to the same environment variables for the deploy steps. Use its approval mechanism for the gate: environment approvals in Azure DevOps, an `input` step in Jenkins.

=== "Azure DevOps"

    Secret variables are not exposed to scripts automatically, so map them in `env:`:

    ```yaml
    - script: |
        uip solution pack . ./out --version "$VERSION"
        uip solution publish "./out/${SOLUTION}_${VERSION}.zip" --wait
        # ... deploy config and deploy run, as in the GitHub Actions workflow
      workingDirectory: my-solution
      env:
        UIPATH_CLI_ENABLE_ENV_AUTH: "true"
        UIPATH_CLI_AUTH_TOKEN: $(UIPATH_PAT)
        UIPATH_URL: "https://cloud.uipath.com"
        UIPATH_CLI_ORGANIZATION_NAME: $(UIPATH_ORG)
        UIPATH_CLI_ORGANIZATION_ID: $(UIPATH_ORG_ID)
        UIPATH_CLI_TENANT_NAME: $(UIPATH_TENANT)
        UIPATH_CLI_TENANT_ID: $(UIPATH_TENANT_ID)
    ```

=== "Jenkins"

    Store the PAT as a *Secret text* credential and bind it with `credentials()`:

    ```groovy
    stage('Deploy') {
      environment {
        UIPATH_CLI_ENABLE_ENV_AUTH = 'true'
        UIPATH_CLI_AUTH_TOKEN = credentials('uipath-pat')
        UIPATH_URL = 'https://cloud.uipath.com'
        UIPATH_CLI_ORGANIZATION_NAME = 'my-org'
        UIPATH_CLI_ORGANIZATION_ID = '<organization-id>'
        UIPATH_CLI_TENANT_NAME = 'my-tenant'
        UIPATH_CLI_TENANT_ID = '<tenant-id>'
      }
      steps {
        dir('my-solution') {
          sh 'uip solution pack . ./out --version "$VERSION"'
          sh 'uip solution publish "./out/${SOLUTION}_${VERSION}.zip" --wait'
          // ... deploy config and deploy run, as in the GitHub Actions workflow
        }
      }
    }
    ```

## Standalone Coded App (no solution)

To deploy a Coded App on its own, without a solution, use `uip codedapp` with a Confidential External Application.

1. **Create a Confidential External Application** in the UiPath Admin portal with the application scopes `Apps`, `OR.Folders.Read`, and `OR.Execution`.
2. **Assign the external app** to the Orchestrator folder you deploy to (Settings → Manage Access → Assign external app).
3. **Store** `UIPATH_CLIENT_ID` and `UIPATH_CLIENT_SECRET` as repository secrets.

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
  NODE_VERSION: "22"
  # Or pin an exact version for reproducible builds
  UIP_CLI_VERSION: ">=1.205.0"

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
        run: |
          npm install -g "@uipath/cli@${UIP_CLI_VERSION}"
          uip tools install codedapp

      - name: Login to UiPath
        env:
          UIPATH_CLIENT_ID: ${{ secrets.UIPATH_CLIENT_ID }}
          UIPATH_CLIENT_SECRET: ${{ secrets.UIPATH_CLIENT_SECRET }}
        run: |
          uip login \
            --organization "${{ inputs.org }}" \
            --tenant "${{ inputs.tenant }}" \
            --client-id env.UIPATH_CLIENT_ID \
            --client-secret env.UIPATH_CLIENT_SECRET \
            --scope "Apps OR.Folders.Read OR.Execution"

      - name: Pack
        run: uip codedapp pack ./dist --name "${{ inputs.app-name }}"

      - name: Publish
        run: uip codedapp publish --name "${{ inputs.app-name }}"

      # A Coded Action App needs no --path-name
      - name: Deploy
        run: |
          uip codedapp deploy \
            --name "${{ inputs.app-name }}" \
            --path-name "${{ inputs.path-name }}" \
            --folder-key "${{ inputs.folder-key }}"
```

`--client-id env.NAME` and `--client-secret env.NAME` read the values from the step's environment, which keeps the secret out of the command line.

## Troubleshooting

| Error | Cause and fix |
|-------|---------------|
| `Property 'externalClientId' is required` | The deploy config has no client ID for the app. Set it with `uip solution deploy config set deploy-config.json <app> externalClientId <id>`. |
| The routing name is already in use | Another app owns the URL path. Choose a different `ROUTING_NAME`. |
| `No remote resource found` from `uip solution resources add` | The app is not findable yet, or the token's user cannot see its folder. Retry after a few minutes, and check the folder path. |
| `deploy run` stops because the package is already deployed | Pass `--yes`. With the same `--name`, the existing deployment is upgraded in place. |
| `401` on every command | The PAT expired or was revoked. Create a new one and update the `UIPATH_PAT` secret. |
