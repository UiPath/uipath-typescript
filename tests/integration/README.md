# UiPath TypeScript SDK - Integration Tests

This directory contains integration tests that make actual API calls to UiPath services to verify SDK functionality.

## Overview

Integration tests validate the SDK by:
- Making real API calls to UiPath services
- Testing actual authentication and authorization
- Creating, reading, updating, and deleting real resources
- Verifying end-to-end workflows
- Testing pagination and filtering
- Validating error handling with real API responses
- **Testing both SDK initialization modes** (v0 legacy and v1 modular)

## SDK Initialization Modes

All integration tests run against both SDK initialization modes:

| Mode | SDK Version | Description |
|------|-------------|-------------|
| `v0` | Legacy (1.0-preview) | Services accessed via SDK properties: `sdk.tasks`, `sdk.entities` |
| `v1` | Modular (1.0 GA) | Services instantiated directly: `new Tasks(sdk)`, `new Entities(sdk)` |

This ensures backward compatibility and validates both usage patterns.

## Test Organization

```
tests/integration/
├── config/                   # Configuration management
│   ├── test-config.ts        # Configuration loader with validation
│   └── unified-setup.ts      # Unified test setup for v0/v1 modes
├── utils/                    # Shared utilities
│   ├── cleanup.ts            # Resource cleanup functions
│   └── helpers.ts            # Common test helpers
├── shared/                   # Test suites (run for both v0 and v1)
│   ├── smoke.integration.test.ts           # Basic connectivity tests
│   ├── orchestrator/         # Orchestrator service tests
│   │   ├── processes.integration.test.ts
│   │   ├── queues.integration.test.ts
│   │   ├── assets.integration.test.ts
│   │   └── buckets.integration.test.ts
│   ├── maestro/              # Maestro service tests
│   │   ├── processes.integration.test.ts
│   │   ├── process-instances.integration.test.ts
│   │   ├── process-incidents.integration.test.ts
│   │   ├── cases.integration.test.ts
│   │   └── case-instances.integration.test.ts
│   ├── action-center/        # Action Center service tests
│   │   └── tasks.integration.test.ts
│   └── data-fabric/          # Data Fabric service tests (entities split by area so
│       │                     # the files run on parallel vitest workers)
│       ├── entities-records.integration.test.ts  # getAll/getById + record CRUD + import + folder-scoped
│       ├── entities-query.integration.test.ts    # queryRecordsById: aggregates, having, joins, expansion
│       ├── entities-schema.integration.test.ts   # create/updateById/deleteById, sqlType constraints, RELATIONSHIP/FILE (v1 only)
│       ├── choicesets.integration.test.ts
│       └── access.integration.test.ts
└── auth-errors.integration.test.ts  # Authentication & authorization error tests
```

## Setup Instructions

### 1. Prerequisites

- Node.js 16 or higher
- Access to a UiPath Cloud tenant
- Personal Access Token (PAT) with appropriate permissions

### 2. Generate Personal Access Token

1. Log in to UiPath Cloud (https://cloud.uipath.com)
2. Navigate to **Admin** → **External Applications**
3. Click **Add Application**
4. Choose **Personal Application**
5. Give it a name (e.g., "SDK Integration Tests")
6. Select required scopes:
   - Orchestrator: Read and Write
   - Maestro: Read and Write
   - Action Center: Read and Write
   - Data Fabric: Read and Write
7. Click **Add** and copy the generated token

### 3. Configure Environment

1. Copy the example configuration file:
   ```bash
   cp tests/.env.integration.example tests/.env.integration
   ```

2. Edit `tests/.env.integration` and fill in your values:
   ```env
   # Required Configuration
   UIPATH_BASE_URL=https://cloud.uipath.com
   UIPATH_ORG_NAME=your-organization-name
   UIPATH_TENANT_NAME=your-tenant-name
   UIPATH_SECRET=your-pat-token-here

   # Optional: Test Settings
   INTEGRATION_TEST_TIMEOUT=30000
   INTEGRATION_TEST_SKIP_CLEANUP=false
   INTEGRATION_TEST_FOLDER_ID=

   # Optional: Pre-existing Test Data
   MAESTRO_TEST_PROCESS_KEY=
   ORCHESTRATOR_TEST_PROCESS_KEY=
   DATA_FABRIC_TEST_ENTITY_ID=
   ```

### 4. Install Dependencies

```bash
npm install
```

## Running Tests

> **⚠️ IMPORTANT**: Always use `npm run test:integration` (or related npm scripts) to run integration tests.
>
> **DO NOT** run `npx vitest tests/integration` directly - it will use the wrong configuration (`vitest.config.ts` instead of `vitest.integration.config.ts`) and only find unit tests!

### Run All Integration Tests

```bash
npm run test:integration
```

### Run by SDK Mode

```bash
# Run only v0 (legacy) mode tests
npm run test:integration:v0

# Run only v1 (modular) mode tests
npm run test:integration:v1
```

### Run by credential

Suites that accept either credential run once per configured credential. To narrow a run
to one half — reproducing a failure, or skipping the slower half while iterating:

```bash
INTEGRATION_AUTH_MODE=pat npm run test:integration
```

See [Authentication modes](#authentication-modes) for what each credential covers.

### Run Specific Test Suites

```bash
# Smoke tests only (quick validation)
npm run test:integration:smoke

# Specific service tests (use -- to pass additional arguments)
npm run test:integration -- tests/integration/shared/orchestrator
npm run test:integration -- tests/integration/shared/maestro
npm run test:integration -- tests/integration/shared/data-fabric
npm run test:integration -- tests/integration/shared/action-center

# Single test file
npm run test:integration -- tests/integration/shared/orchestrator/queues.integration.test.ts

# Combine mode and path filtering
npm run test:integration:v1 -- tests/integration/shared/orchestrator
```

### Watch Mode

```bash
npm run test:integration:watch
```

### Run with Verbose Output

```bash
npm run test:integration -- --reporter=verbose
```

## Test Categories

### Smoke Tests
Located in `shared/smoke.integration.test.ts`
- Basic SDK initialization (both v0 and v1 modes)
- Configuration validation
- Authentication verification
- Service instantiation verification
- Basic API connectivity to all services

### Authentication & Authorization Error Tests
Located in `auth-errors.integration.test.ts`
- **Invalid Organization**: Verifies 403 Forbidden when using non-existent organization
- **Invalid Tenant**: Verifies 403 Forbidden when using non-existent tenant
- **Invalid Base URL**: Verifies proper error handling for invalid URLs
- **Invalid Secret/Token**: Verifies 401/403 when using invalid PAT token
- **Invalid Folder ID**: Verifies error handling for non-existent folders
- **Permission Denied**: Verifies 403 errors for resources without proper permissions
- **Error Message Validation**: Ensures error messages contain useful information

These tests intentionally create SDK instances with invalid credentials to verify proper error handling.

### Service Tests

#### Orchestrator Services (Read-Only)
These services do not support create/update/delete via SDK:
- **Queues**: List, get by ID, pagination, filtering
- **Assets**: List, get by ID, asset type detection
- **Buckets**: List, get by ID, file upload/download operations
- **Processes**: List, get by ID, start execution

#### Data Fabric Services (Full CRUD)
- **Entities**: Complete CRUD operations for entity records
- **ChoiceSets**: Read operations for choice sets
- **Access**: Skipped tests for Data Fabric role listing, directory principals, and assignment validation until the CI app has the required DataFabric scopes

#### Platform Services
- **Platform**: Read and bulk create/update of a user's platform settings, snapshotting and restoring the values it touches

#### Action Center Services
- **Tasks**: Create, list, get by ID, assign, unassign, complete

#### Maestro Services
- **Processes**: List processes, get incidents
- **Process Instances**: List, control (pause/resume/cancel), get variables/history
- **Cases**: Read case definitions
- **Case Instances**: List, get stages, close cases

### Graceful Skipping
Tests skip gracefully when:
- Required configuration is missing (e.g., `INTEGRATION_TEST_FOLDER_ID`)
- PAT token lacks necessary permissions (e.g., Maestro scope)
- Pre-existing resources don't exist in tenant
- Prerequisites aren't met
- A suite needs a user token and `UIPATH_USER_TOKEN` is not set (see below)

## Authentication modes

Two credentials reach the platform, and **we run both on purpose** — they find
different things:

- **PAT** (`UIPATH_SECRET`) authenticates as an *external application*, so it exercises
  the OAuth scope model: a method calling an endpoint the app was never granted fails
  here and nowhere else. It is also the credential most SDK consumers use.
- **User token** (`UIPATH_USER_TOKEN`) carries a signed-in user's own permissions, so it
  reaches strictly more of the API and exercises the general surface — including
  services that reject external-application tokens outright.

Neither subsumes the other, so a suite that works with either runs **twice**.

A suite declares what it *needs* from a credential:

| Requirement | Runs under | Declared by |
|-------------|-----------|-------------|
| `both` | **Every configured credential** — both, when both are set | Every suite unless noted below |
| `user` | The user token only | Agents, Agent Memory, Agent Traces, Governance, Notifications, Subscriptions, CAS Connections |
| `pat` | The PAT only | None currently — `auth-errors` builds its own SDK instances directly |

`resolveAuthModes(requirement)` returns the list, and `describeIntegration` expands the
suite over it. Cells are named `[initMode][authMode]`, so a failure says which
credential failed:

```
✓ Orchestrator Assets - Integration Tests [v1][pat] › getAll › should retrieve all assets
✗ Orchestrator Assets - Integration Tests [v1][user] › getAll › should retrieve all assets
```

When nothing configured satisfies the requirement the suite is still collected and
reported as **skipped** — it does not silently vanish — and the cell is labelled with
the credential it wanted.

**Locally, Minter is not required.** With only `UIPATH_SECRET` set, `both` suites run
PAT-only and `user` suites skip, which is what a developer machine looks like by
default. CI mints a user token, so CI gets both.

`INTEGRATION_AUTH_MODE=pat|user` narrows a whole run to one credential without editing
any suite — useful for reproducing a single failing half. It *restricts* rather than
forces: a suite that requires the excluded credential skips rather than running under
the wrong one.

Both credentials are sent as plain bearer tokens; the SDK's `secret` config field takes
either.

### Choosing the credential for a suite

Declare it once, as the second argument to `describeIntegration`:

```ts
// Either works — runs under both when both are configured. This is the default.
describeIntegration('Orchestrator Assets - Integration Tests', 'both', modes, () => { ... });

// Needs a user token — skips when none is configured.
describeIntegration('Notifications - Integration Tests', 'user', modes, () => { ... });

// Needs the external application specifically.
describeIntegration('Some suite', 'pat', modes, () => { ... });
```

`describeIntegration` derives everything from that one word: the credentials the suite
runs under, whether it is collected, and the host each run talks to. **Do not call
`setupUnifiedTests` directly** — it takes an already-resolved credential and exists only
for `describeIntegration` to call. Resolving the credential in two places lets the guard
and the setup disagree, and nothing catches that.

A fifth argument carries the rare extras:

```ts
describeIntegration('Entity Attachment - Integration Tests', 'both', modes, () => {
  ...
}, { skip: !hasAttachmentConfig, timeout: 120000 });
```

`skip` is for a suite gated on fixture configuration as well as a credential, or one
disabled on purpose. `timeout` is the per-suite timeout vitest would otherwise take as a
trailing positional argument.

### Host per credential

User-token suites use `MINTER_BASE_URL` when it is set; everything else uses
`UIPATH_BASE_URL`. The default host sits behind a CORS proxy whose path whitelist
must name every service a suite touches — a service missing from it is rejected
before the request reaches the platform. Suites on the user token reach services
that are not on that list, so they talk to the platform host directly. The proxy
exists for browser callers; tests run in Node, where it buys nothing.

`MINTER_BASE_URL` is optional and falls back to `UIPATH_BASE_URL`, so leaving it
unset keeps the previous single-host behaviour.

### Getting a user token

The token comes from [Minter](https://uipath.atlassian.net/wiki/spaces/CLD/pages/87134404744),
a Portal-team tool that performs a headless browser login and exports the resulting
tokens:

```bash
az acr login -n pltnonprodacr
docker run --rm -v "$PWD/out:/out" pltnonprodacr.azurecr.io/uipath-minter:latest \
  npm run generate -- -u <email> -p <password> -n <org> -t <tenant> -e <env> -v basic -o /out/tokens.json
```

Copy the `accessToken` field from `out/tokens.json` into `UIPATH_USER_TOKEN`.

In CI this is automated: `coverage.yml` logs in to the registry with a scoped pull
token, pulls the Minter image, and appends the minted token to
`tests/.env.integration` before the integration run. The step is gated on `MINTER_ENABLED` and marked
`continue-on-error`, so a Minter outage, a fork PR, or absent secrets all degrade to
"user-token suites skip" rather than a failed build. It requires these repository
secrets:

| Secret | Purpose |
|--------|---------|
| `ACR_USERNAME`, `ACR_PASSWORD` | ACR scoped token with pull-only access to the `uipath-minter` repository on `pltnonprodacr` |
| `MINTER_USERNAME`, `MINTER_PASSWORD` | The test account Minter signs in as — must use email/password auth, not SSO |

The registry credential is a scoped token rather than a federated Azure identity
because granting `AcrPull` requires role-assignment rights on `pltnonprodacr`, which
lives in a subscription where the SDK team only has Contributor. Federation is the
better long-term shape — no stored password to rotate — and the swap is a small one
once that role assignment can be made.

Two caveats. The account must sign in with an email and password — federated (SSO)
and Google accounts cannot be driven by Minter. And the token is short-lived: the
SDK treats a token supplied as `secret` as non-expiring and never refreshes it, so
a run that outlives the token will start failing with 401s partway through.

### Writing a suite that needs a user token

Declare the requirement with `describeIntegration`:

```typescript
import { describeIntegration, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1'];

describeIntegration('My Suite', 'user', modes, () => {
  // ...
});
```

That one word is the whole declaration — the suite runs only under the user token and
skips, visibly, wherever none is configured. A suite that works with either credential
passes `'both'` and runs under both.

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `UIPATH_BASE_URL` | UiPath Cloud URL | `https://cloud.uipath.com` |
| `UIPATH_ORG_NAME` | Organization name | `MyOrganization` |
| `UIPATH_TENANT_NAME` | Tenant name | `MyTenant` |
| `UIPATH_SECRET` | Personal Access Token | `your-pat-token` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UIPATH_USER_TOKEN` | User access token for services that reject PATs — see [Authentication modes](#authentication-modes) | (those suites skip) |
| `MINTER_BASE_URL` | Base URL for user-token suites — see [Host per credential](#host-per-credential) | (falls back to `UIPATH_BASE_URL`) |
| `INTEGRATION_TEST_TIMEOUT` | Test timeout in milliseconds | `30000` |
| `INTEGRATION_TEST_SKIP_CLEANUP` | Skip cleanup after tests (useful for debugging) | `false` |
| `INTEGRATION_TEST_FOLDER_ID` | Default folder ID for tests | (uses default folder) |
| `MAESTRO_TEST_PROCESS_KEY` | Pre-existing Maestro process for read-only tests | (optional) |
| `ORCHESTRATOR_TEST_PROCESS_KEY` | Pre-existing Orchestrator process for start tests | (optional) |
| `DATA_FABRIC_TEST_ENTITY_ID` | Pre-existing Data Fabric entity for record tests | (optional) |
| `DATA_FABRIC_TEST_JOIN_ENTITY_NAME` | Base entity name for the `queryRecordsById` join test | (optional — defaults to the queried entity) |
| `DATA_FABRIC_TEST_JOIN_FIELD_NAME` | Join key field on the base entity | (required for the join test) |
| `DATA_FABRIC_TEST_JOIN_RELATED_ENTITY_NAME` | Related entity name to join in | (required for the join test) |
| `DATA_FABRIC_TEST_JOIN_RELATED_FIELD_NAME` | Join key field on the related entity | (required for the join test) |
| `IDENTITY_TEST_USER_ID` | GUID of the user whose platform settings are read and round-tripped; must be in the test PAT's organization | (required for the Platform tests) |
| `UIPATH_ORGANIZATION_ID` | Organization (account) GUID; platform settings reads fall back to the host partition without it | (required for the Platform tests) |

## Test Data Management

### Resource Naming Convention

All test resources are created with unique names following this pattern:
```
IntegrationTest_{ServiceName}_{Timestamp}_{RandomId}
```

Example: `IntegrationTest_Queue_1234567890_a7f2k3`

### Automatic Cleanup

Tests automatically clean up created resources in `afterAll` hooks. Cleanup can be disabled by setting:
```env
INTEGRATION_TEST_SKIP_CLEANUP=true
```

### Manual Cleanup

If tests fail before cleanup, manually delete resources with names starting with `IntegrationTest_`.

## Best Practices

### Writing Integration Tests

1. **Use unified setup**: Import from `config/unified-setup` for v0/v1 mode support
   ```typescript
   import {
     getServices,
     getTestConfig,
     describeIntegration,
     InitMode
   } from '../../config/unified-setup';
   import { generateTestResourceName } from '../../utils/helpers';
   ```

2. **Declare the suite with `describeIntegration`**: it expands over both SDK init
   modes and every credential the requirement allows
   ```typescript
   const modes: InitMode[] = ['v0', 'v1'];

   describeIntegration('My Integration Tests', 'both', modes, () => {
     it('should do something', () => {
       const { tasks, entities } = getServices();
       // ... test code using services
     });
   });
   ```
   With both credentials configured this yields four runs: `[v0][pat]`, `[v0][user]`,
   `[v1][pat]`, `[v1][user]`. Take the `mode` / `authMode` callback arguments only if
   the body actually branches on them.

3. **Track created resources**: Register resources for cleanup
   ```typescript
   import { registerResource } from '../../utils/cleanup';

   const result = await tasks.create(data, folderId);
   createdTaskId = result.id;
   registerResource('tasks', { id: createdTaskId, folderId });
   ```

4. **Clean up in afterAll**: Always implement cleanup
   ```typescript
   import { cleanupTestTask } from '../../config/unified-setup';

   afterAll(async () => {
     const config = getTestConfig();
     if (!config.skipCleanup && createdTaskId) {
       await cleanupTestTask(createdTaskId);
     }
   });
   ```

5. **Handle optional features gracefully**: Some tests depend on pre-configured resources
   ```typescript
   if (!processKey) {
     console.log('Skipping test: ORCHESTRATOR_TEST_PROCESS_KEY not configured');
     return;
   }
   ```

### Test Isolation

- Each test should be independent
- Don't rely on test execution order
- Create unique test data per test suite
- Use unique names with timestamps and random IDs

### Error Handling

- Wrap API calls in try-catch when testing edge cases
- Log meaningful messages when tests are skipped
- Use descriptive expect messages for failures

## Debugging

### Enable Debug Logging

```bash
DEBUG=* npm run test:integration
```

### Skip Cleanup to Inspect Resources

```env
INTEGRATION_TEST_SKIP_CLEANUP=true
```

Then inspect created resources in UiPath Cloud to debug issues.

### Run Single Test in Watch Mode

```bash
npm run test:integration:watch -- tests/integration/shared/orchestrator/queues.integration.test.ts
```

### View Detailed Test Output

```bash
npm run test:integration -- --reporter=verbose --reporter=json --outputFile=test-results.json
```

## Troubleshooting

### Authentication Failures

**Error**: `SDK initialization failed: Authentication unsuccessful`

**Solutions**:
1. Verify your PAT token is valid and not expired
2. Check token has required scopes (Orchestrator, Maestro, etc.)
3. Ensure org and tenant names are correct
4. Test token manually using curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://cloud.uipath.com/YOUR_ORG/YOUR_TENANT/orchestrator_/odata/Queues
   ```

### Wrong Configuration Being Used

**Error**: Tests show "No test files found" or only unit tests are running

**Cause**: Running `npx vitest` or `vitest` directly without specifying the integration config.

**Solutions**:
1. **Always use the npm scripts**:
   ```bash
   npm run test:integration        # ✅ Correct - runs all tests (v0 and v1)
   npm run test:integration:v0     # ✅ Correct - runs only v0 mode
   npm run test:integration:v1     # ✅ Correct - runs only v1 mode
   npx vitest tests/integration    # ❌ Wrong - uses vitest.config.ts
   ```
2. If you must use vitest directly, specify the config:
   ```bash
   npx vitest --config vitest.integration.config.ts
   ```
3. Verify configuration is working:
   ```bash
   # Should find unit tests
   npx vitest list | grep -c "tests/unit"

   # Should find integration tests
   npm run test:integration -- list | grep -c "tests/integration"
   ```

### Configuration Validation Errors

**Error**: `Integration test configuration is invalid`

**Solutions**:
1. Ensure `.env.integration` file exists in `tests/` directory
2. Verify all required fields are filled in
3. Check for typos in variable names
4. Validate URLs are properly formatted (include `https://`)

### Permission Errors

**Error**: `403 Forbidden` or `401 Unauthorized`

**Solutions**:
1. Regenerate PAT with appropriate scopes
2. Check folder permissions if using custom folder
3. Verify user has required roles in UiPath

### Test Timeouts

**Error**: `Test timeout of 30000ms exceeded`

**Solutions**:
1. Increase timeout in `.env.integration`:
   ```env
   INTEGRATION_TEST_TIMEOUT=60000
   ```
2. Check network connectivity
3. Verify UiPath services are responsive

### Resource Creation Failures

**Error**: Various errors when creating test resources

**Solutions**:
1. Check if resource limits are reached (queues, assets, etc.)
2. Verify folder exists and is accessible
3. Ensure unique names are being used
4. Check for schema validation errors

## CI/CD Integration

These integration tests are designed for local execution. To run in CI/CD:

1. Store secrets securely (GitHub Secrets, etc.)
2. Configure environment variables in CI pipeline
3. Use dedicated test tenant/organization
4. Implement proper cleanup even on failure
5. Consider test parallelization carefully (resource conflicts)

Example GitHub Actions workflow:
```yaml
- name: Run Integration Tests
  env:
    UIPATH_BASE_URL: ${{ secrets.UIPATH_BASE_URL }}
    UIPATH_ORG_NAME: ${{ secrets.UIPATH_ORG_NAME }}
    UIPATH_TENANT_NAME: ${{ secrets.UIPATH_TENANT_NAME }}
    UIPATH_SECRET: ${{ secrets.UIPATH_SECRET }}
  run: npm run test:integration
```

## Contributing

When adding new integration tests:

1. Follow existing patterns and structure
2. **Declare the suite with `describeIntegration(name, requirement, modes, body)`** — it
   covers both v0/v1 init modes and every credential the requirement allows
3. Use `getServices()` and `getTestConfig()` from `config/unified-setup`
4. Use helper functions from `utils/helpers`
5. Implement proper cleanup using functions from `config/unified-setup`
6. Let `describeIntegration` add the `[initMode][authMode]` suffix — do not hand-write it
7. Handle optional configurations gracefully
8. Document any prerequisites in test comments
9. Update this README if adding new test categories

## Support

For issues or questions:
- Check existing tests for examples
- Review SDK documentation
- Check UiPath API documentation
- Open an issue in the repository
