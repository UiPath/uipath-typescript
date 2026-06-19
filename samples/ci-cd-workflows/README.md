# CI/CD Workflow Samples

Sample GitHub Actions workflows for deploying UiPath apps via the `uip` CLI.

## deploy-coded-app.yml

Deploys a coded app (React, Vue, etc.) to UiPath using external app authentication.

**Setup:**

1. Register an external app in UiPath Cloud Portal with scopes: `Apps`, `OR.Administration`, `OR.Execution`
2. Assign the external app to the target Orchestrator folder
3. Add `UIPATH_CLIENT_ID` and `UIPATH_CLIENT_SECRET` as GitHub repo secrets
4. Copy `deploy-coded-app.yml` into your project's `.github/workflows/` directory

**Pipeline steps:** `login → pack → publish → deploy`

**Trigger:** Manual (`workflow_dispatch`) — select app name, URL path, and target environment.
