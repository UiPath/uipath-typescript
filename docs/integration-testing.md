# Integration Testing

Every new method must have an integration test. These run against a live API and catch issues unit tests miss — wrong endpoints, broken transforms, and auth/header problems.

## Environment configuration

Integration tests read their configuration from `tests/.env.integration`. Create that file (it is git-ignored — never commit it) and populate the variables below.

> **Create test artifacts in the `integrationtest` tenant**, inside the **"Integration Test"** folder (`INTEGRATION_TEST_FOLDER_KEY` = `5f6dadf1-3677-49dc-8aca-c2999dd4b3ba`). Keeping all test data in this dedicated tenant and folder avoids polluting shared environments and keeps cleanup predictable.

```bash
# ============================================
# Required Configuration
# ============================================

# UiPath Cloud URL (e.g., https://cloud.uipath.com)
UIPATH_BASE_URL=https://alpha.api.uipath.com

# Your UiPath organization name
UIPATH_ORG_NAME=procodeapps

# Your UiPath tenant name
UIPATH_TENANT_NAME=integrationtest

# Personal Access Token (PAT) for authentication.
# Generate from UiPath Cloud > Admin > External Applications.
# Never commit this value — keep it local only.
UIPATH_SECRET=

# ============================================
# Test Settings
# ============================================

# Test timeout in milliseconds (default: 30000)
INTEGRATION_TEST_TIMEOUT=30000

# Set to 'true' to preserve test data after runs (useful for debugging)
INTEGRATION_TEST_SKIP_CLEANUP=false

# Default folder for tests. Create new test artifacts inside this folder
# in the integrationtest tenant.
INTEGRATION_TEST_FOLDER_ID=2819046
INTEGRATION_TEST_FOLDER_KEY=5f6dadf1-3677-49dc-8aca-c2999dd4b3ba

# ============================================
# Optional: Pre-existing Test Data
# (for read-only tests that need existing resources)
# ============================================

# Maestro test process key
MAESTRO_TEST_PROCESS_KEY=

# Case test process key
CASE_TEST_PROCESS_KEY=55009bca-8c7d-4c3b-b146-c481b3ca1c4a

# Orchestrator test process key
ORCHESTRATOR_TEST_PROCESS_KEY=0B013150-CEFD-4608-B590-57029F7DFF3C

# Jobs test folder ID (folder containing jobs for resume/suspend tests)
# Falls back to INTEGRATION_TEST_FOLDER_ID if not set
JOBS_TEST_FOLDER_ID=2819046

# Data Fabric test entity / choice set IDs and attachment field
DATA_FABRIC_TEST_ENTITY_ID=ef91d745-fc36-f111-8ef3-6045bd00bc8b
DATA_FABRIC_TEST_CHOICESET_ID=825c493c-fc36-f111-8ef3-6045bd00bc8b
DATA_FABRIC_TEST_ATTACHMENT_FIELD=SomeFile

# Traces test trace ID (dev)
UIPATH_TRACES_TEST_TRACE_ID_DEV=2074c74b-9931-4072-9c00-8ceaa2a59724
```

## Where tests live

Add your test under `tests/integration/shared/{domain}/`, mirroring the service domain it covers.

## Setup helpers

- Use `getServices()` and `getTestConfig()` from `tests/integration/config/unified-setup.ts`
- Use `registerResource()` from `tests/integration/utils/cleanup.ts` for cleanup tracking
- Use `generateRandomString()` from `tests/integration/utils/helpers.ts` for unique test data

## Guidelines

- Tests run in both `v0` and `v1` init modes via `describe.each(modes)` — **only if the service is registered in both modes** in `unified-setup.ts`. New services that only support `v1` init should use `['v1']` only.
- **Always `throw new Error()` when test preconditions are not met** — whether it's missing config (e.g., no `folderId`) or missing test data (e.g., no running jobs). Never use `console.warn()` + `return` to silently skip — silent skips hide unrunnable tests and make CI green when tests aren't actually exercised.
- **`describe.skip` is permitted only when the service does not support PAT auth** (e.g., endpoints that require OAuth). Write the full test body as if it will eventually run, add a comment explaining the limitation, and use `describe.skip` rather than omitting the test. Do **not** use `describe.skip` for missing test data, missing config, or flakiness — those require a `beforeAll` guard or a `throw`.
- **Never** wrap integration test API calls in try/catch — let errors propagate naturally. Silent catches mask real failures.
- **Never** write redundant tests — each test must cover a distinct code path, error scenario, or response-shape aspect.
- **Extract shared data lookups to `beforeAll`** — fetch setup data once and store it in a `let variable!: Type` variable rather than repeating `getAll` calls in each `it` block.
- **Clean up after deletes** — after a successful delete, remove the resource from the cleanup array so later cleanup doesn't try to delete an already-deleted record.
- **Include a transform validation test** for methods with a transform pipeline. Verify both that (a) transformed camelCase fields exist and have values (`job.createdTime`, `job.processName`), and (b) original PascalCase API fields are absent (`(job as any).CreationTime` is `undefined`).

## Running the tests

```bash
npm run test:integration   # integration tests only
npm run test:all           # unit + integration tests
```
