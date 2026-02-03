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

## Test Organization

```
tests/integration/
├── config/               # Configuration management
│   └── test-config.ts    # Zod-validated configuration loader
├── utils/                # Shared utilities
│   ├── setup.ts          # SDK initialization and lifecycle
│   ├── cleanup.ts        # Resource cleanup functions
│   └── helpers.ts        # Common test helpers
├── smoke/                # Basic connectivity tests
│   └── sdk-initialization.integration.test.ts
├── auth-errors.integration.test.ts  # Authentication & authorization error tests
├── orchestrator/         # Orchestrator service tests
│   ├── processes.integration.test.ts
│   ├── queues.integration.test.ts
│   ├── assets.integration.test.ts
│   └── buckets.integration.test.ts
├── maestro/              # Maestro service tests
│   ├── processes.integration.test.ts
│   ├── process-instances.integration.test.ts
│   ├── process-incidents.integration.test.ts
│   ├── cases.integration.test.ts
│   └── case-instances.integration.test.ts
├── action-center/        # Action Center service tests
│   └── tasks.integration.test.ts
└── data-fabric/          # Data Fabric service tests
    ├── entities.integration.test.ts
    └── choicesets.integration.test.ts
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

### Run Specific Test Suites

```bash
# Smoke tests only (quick validation)
npm run test:integration:smoke

# Specific service tests (use -- to pass additional arguments)
npm run test:integration -- tests/integration/orchestrator
npm run test:integration -- tests/integration/maestro
npm run test:integration -- tests/integration/data-fabric
npm run test:integration -- tests/integration/action-center

# Single test file
npm run test:integration -- tests/integration/orchestrator/queues.integration.test.ts
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
Located in `smoke/sdk-initialization.integration.test.ts`
- Basic SDK initialization
- Configuration validation
- Authentication verification
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
| `INTEGRATION_TEST_TIMEOUT` | Test timeout in milliseconds | `30000` |
| `INTEGRATION_TEST_SKIP_CLEANUP` | Skip cleanup after tests (useful for debugging) | `false` |
| `INTEGRATION_TEST_FOLDER_ID` | Default folder ID for tests | (uses default folder) |
| `MAESTRO_TEST_PROCESS_KEY` | Pre-existing Maestro process for read-only tests | (optional) |
| `ORCHESTRATOR_TEST_PROCESS_KEY` | Pre-existing Orchestrator process for start tests | (optional) |
| `DATA_FABRIC_TEST_ENTITY_ID` | Pre-existing Data Fabric entity for record tests | (optional) |

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

1. **Always use helpers**: Import and use helper functions from `utils/`
   ```typescript
   import { getTestSDK, getTestConfig, setupIntegrationTests } from '../utils/setup';
   import { generateTestResourceName } from '../utils/helpers';
   ```

2. **Setup integration tests**: Call `setupIntegrationTests()` in your describe block
   ```typescript
   describe('My Integration Tests', () => {
     setupIntegrationTests();
     // ... tests
   });
   ```

3. **Track created resources**: Register resources for cleanup
   ```typescript
   import { registerResource } from '../utils/cleanup';

   const result = await sdk.queues.create(data, folderId);
   createdQueueId = result.Id;
   registerResource('queues', { id: createdQueueId, folderId });
   ```

4. **Clean up in afterAll**: Always implement cleanup
   ```typescript
   afterAll(async () => {
     const config = getTestConfig();
     if (!config.skipCleanup && createdResourceId) {
       await cleanupTestResource(createdResourceId, config.folderId);
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
npx vitest tests/integration/orchestrator/queues.integration.test.ts --watch
```

### View Detailed Test Output

```bash
npx vitest tests/integration --reporter=verbose --reporter=json --outputFile=test-results.json
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
   npm run test:integration     # ✅ Correct
   npx vitest tests/integration # ❌ Wrong - uses vitest.config.ts
   ```
2. If you must use vitest directly, specify the config:
   ```bash
   npx vitest --config vitest.integration.config.ts
   ```
3. Verify configuration is working:
   ```bash
   # Should find ~341 unit tests
   npx vitest list | grep -c "tests/unit"

   # Should find ~102 integration tests
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
2. Use helper functions from `utils/`
3. Implement proper cleanup
4. Add meaningful test descriptions
5. Handle optional configurations gracefully
6. Document any prerequisites in test comments
7. Update this README if adding new test categories

## Support

For issues or questions:
- Check existing tests for examples
- Review SDK documentation
- Check UiPath API documentation
- Open an issue in the repository
