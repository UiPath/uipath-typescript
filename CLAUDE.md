# UiPath TypeScript SDK - Claude Code Guide

This document helps Claude Code understand and work with this codebase efficiently.

**📌 Quick Navigation:**
- [Claude Instructions](#claude-instructions) - How Claude should work with this project
- [Onboarding Guide](#onboarding-a-new-service) - Step-by-step service creation
- [Quick Reference](#quick-reference-essential-commands) - Essential commands
- [Anti-Patterns](#anti-patterns-to-avoid) - Common mistakes to avoid

---

## Project Overview

This is the official UiPath TypeScript SDK providing programmatic access to UiPath services (Orchestrator, Maestro, Data Fabric, LLMOps, Action Center).

**Key Characteristics:**
- Modular architecture with tree-shakeable exports
- Each service can be imported independently: `import { Feedback } from '@uipath/uipath-typescript/feedback'`
- Services extend `BaseService` and use dependency injection via `IUiPath` instance
- Uses Rollup for building ESM, CJS, and UMD bundles
- TypeScript 5.3+ (strict mode) • Vitest • Zod • Axios • OpenTelemetry

## Project Structure

```
src/
├── core/              # Core SDK (auth, config, context, errors, http, telemetry)
│   ├── auth/         # Token management
│   ├── config/       # Configuration handling
│   ├── http/         # API client
│   └── telemetry/    # Tracking decorators
├── models/           # Data models and types
│   └── <domain>/
│       ├── <name>.types.ts         # Public API types
│       ├── <name>.models.ts        # Service model interfaces
│       ├── <name>.constants.ts     # Constants and mappings
│       └── <name>.internal-types.ts # Internal types (not exported)
├── services/         # Service implementations
│   ├── base.ts      # BaseService class (all services extend this)
│   └── <domain>/    # e.g., llmops/, maestro/, orchestrator/
│       ├── <name>.ts      # Service implementation
│       └── index.ts       # Module exports
└── utils/           # Utility functions
    └── constants/
        └── endpoints.ts   # API endpoint constants

tests/
├── unit/            # Unit tests with mocks
└── integration/     # Integration tests (real API calls)
```

---

## Claude Instructions

### IMPORTANT: Always Ask for Swagger/OpenAPI Spec First

**When the user requests to implement a new service or add new methods to an existing service, ALWAYS ask for a Swagger/OpenAPI specification file BEFORE starting implementation.**

Use the AskUserQuestion tool with these options:
1. "Yes, I have a Swagger/OpenAPI file" - Ask for the file path or URL
2. "Yes, I have API documentation URL" - Ask for the documentation link
3. "No, I'll describe the API manually" - Proceed with manual description

**Why this matters:**
- Swagger files contain accurate endpoint paths, HTTP methods, request/response schemas
- Automatically generates correct TypeScript types from schema definitions
- Reduces back-and-forth and implementation errors
- Ensures SDK matches the actual API contract

### IMPORTANT: Ask for Integration Test Config After Implementation

**After completing the service/method implementation, ALWAYS ask if the user wants to write integration tests and request the necessary configuration.**

Use the AskUserQuestion tool:
> "Would you like me to write integration tests for the new service? If yes, please provide the following config details:"

**Required config for integration tests:**
- `baseUrl` - UiPath API base URL (e.g., `https://cloud.uipath.com`, `https://staging.uipath.com`, `https://alpha.uipath.com`)
- `orgName` - Organization name
- `tenantName` - Tenant name
- `secret` - Personal Access Token (PAT) or service account secret

**Integration test template:**
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { UiPath } from '../../src/core/uipath';
import { ResourceService } from '../../src/services/<domain>/<name>';

describe('ResourceService Integration Tests', () => {
  const config = {
    baseUrl: '<baseUrl>',  // e.g., 'https://alpha.uipath.com'
    orgName: '<org-name>',
    tenantName: '<tenant-name>',
    secret: '<secret>',
  };

  let sdk: UiPath;
  let service: ResourceService;

  beforeAll(async () => {
    sdk = new UiPath(config);
    await sdk.initialize();
    service = new ResourceService(sdk);
  });

  it('should create resource via real API', async () => {
    const result = await service.create({ name: 'Test Resource' });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
```

**Integration test location:** `tests/integration/services/<domain>/<name>.integration.test.ts`

### CRITICAL: Code Quality Rules

**Before submitting any code, ALWAYS:**
1. **Remove redundant constructors** - If constructor only calls `super()`, delete it entirely
2. **Remove unused imports** - Clean up all unused imports and types
3. **Remove unused variables** - No declared-but-unused variables
4. **Run linter** - Fix all oxlint errors and warnings (`npx oxlint`)
5. **Build verification** - Ensure `npm run build` succeeds
6. **Test verification** - Ensure all tests pass

**Linter will catch:**
- Unused imports (e.g., `import type { IUiPath }` when not used)
- Unused variables
- Redundant constructors that only call super()
- Dead code

---

## Onboarding a New Service

Follow these steps to add a new service (using FeedbackService as reference):

### Step 1: Define API Endpoints

Add endpoints to `src/utils/constants/endpoints.ts`:

```typescript
// Add base path constant if new domain
export const NEWDOMAIN_BASE = 'newdomain_';

// Add endpoint constants
export const NEWSERVICE_ENDPOINTS = {
  CREATE: `${NEWDOMAIN_BASE}/api/Resource`,
  GET_ALL: `${NEWDOMAIN_BASE}/api/Resource`,
  GET_BY_ID: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
  UPDATE: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
  DELETE: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
} as const;
```

### Step 2: Create Type Definitions

Create `src/models/<domain>/<name>.types.ts`:

```typescript
/**
 * Options for creating a new resource
 */
export interface ResourceCreateOptions {
  name: string;
  // ... other required/optional fields
}

/**
 * Response from the API
 */
export interface ResourceResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  // ... other fields
}

/**
 * Options for listing resources (if paginated)
 */
export interface ResourceGetAllOptions {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  [key: string]: string | number | boolean | undefined;
}
```

### Step 3: Create Service Model Interface

Create `src/models/<domain>/<name>.models.ts`:

```typescript
import type { ResourceCreateOptions, ResourceResponse } from './<name>.types';

/**
 * Service Model Interface
 * Defines the contract that the service must implement
 */
export interface ResourceServiceModel {
  create(options: ResourceCreateOptions): Promise<ResourceResponse>;
  getAll(options?: ResourceGetAllOptions): Promise<ResourceResponse[]>;
  getById(id: string): Promise<ResourceResponse>;
  // ... other methods
}
```

### Step 4: Implement the Service

Create `src/services/<domain>/<name>.ts`:

```typescript
import { BaseService } from '../base';
import {
  ResourceCreateOptions,
  ResourceResponse,
} from '../../models/<domain>/<name>.types';
import { ResourceServiceModel } from '../../models/<domain>/<name>.models';
import { NEWSERVICE_ENDPOINTS } from '../../utils/constants/endpoints';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath <Domain> <Resource> API
 */
export class ResourceService extends BaseService implements ResourceServiceModel {
  // NOTE: Only add constructor if you need custom initialization
  // If constructor only calls super(), DELETE IT - it's redundant and will fail linting

  /**
   * Creates a new resource
   * @param options - The resource data to create
   * @returns Promise resolving to the created resource
   *
   * @example
   * ```typescript
   * import { Resource } from '@uipath/uipath-typescript/<export-name>';
   *
   * const resource = new Resource(sdk);
   * const result = await resource.create({ name: 'My Resource' });
   * ```
   */
  @track('Resource.Create')
  async create(options: ResourceCreateOptions): Promise<ResourceResponse> {
    const response = await this.post<ResourceResponse>(
      NEWSERVICE_ENDPOINTS.CREATE,
      options
    );
    return response.data;
  }

  // Implement other methods following the same pattern...
}
```

**HTTP Methods Available from BaseService:**
- `this.get<T>(path, options?)` - GET request
- `this.post<T>(path, body?, options?)` - POST request
- `this.put<T>(path, body?, options?)` - PUT request
- `this.patch<T>(path, body?, options?)` - PATCH request
- `this.delete<T>(path, options?)` - DELETE request (use `super.delete()` to avoid name conflicts)

### Step 5: Create Module Index (Export File)

Create `src/services/<domain>/index.ts`:

```typescript
/**
 * Resource Module
 *
 * Provides access to UiPath <Domain> for resource management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Resource } from '@uipath/uipath-typescript/<export-name>';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const resource = new Resource(sdk);
 * const items = await resource.getAll();
 * ```
 *
 * @module
 */

export { ResourceService as Resource, ResourceService } from './<name>';

export type * from '../../models/<domain>/<name>.types';
export type * from '../../models/<domain>/<name>.models';
```

### Step 6: Register in Services Index

Add to `src/services/index.ts`:

```typescript
export * from './<domain>';
```

### Step 7: Configure Build (Rollup)

Add to `rollup.config.js` in the `serviceEntries` array:

```javascript
{
  name: '<export-name>',
  input: 'src/services/<domain>/index.ts',
  output: '<export-name>/index'
}
```

### Step 8: Add Package Exports

Add to `package.json` in the `exports` field:

```json
"./<export-name>": {
  "import": {
    "types": "./dist/<export-name>/index.d.ts",
    "default": "./dist/<export-name>/index.mjs"
  },
  "require": {
    "types": "./dist/<export-name>/index.d.ts",
    "default": "./dist/<export-name>/index.cjs"
  }
}
```

### Step 9: Write Unit Tests

Create `tests/unit/services/<domain>/<name>.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceService } from '../../../../src/services/<domain>/<name>';
import { ResourceCreateOptions, ResourceResponse } from '../../../../src/models/<domain>/<name>.types';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { NEWSERVICE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

vi.mock('../../../../src/core/http/api-client');

describe('ResourceService Unit Tests', () => {
  let service: ResourceService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    service = new ResourceService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create resource successfully', async () => {
      const input: ResourceCreateOptions = { name: 'Test' };
      const mockResponse: ResourceResponse = {
        id: 'resource-1',
        name: 'Test',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.create(input);

      expect(result).toBeDefined();
      expect(result.id).toBe('resource-1');
      expect(mockApiClient.post).toHaveBeenCalledWith(
        NEWSERVICE_ENDPOINTS.CREATE,
        input,
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      await expect(service.create({ name: 'Test' })).rejects.toThrow('API Error');
    });
  });
});
```

---

## Adding a New Method to Existing Service

**First: Ask for Swagger/API spec** (see Claude Instructions above)

Then follow these steps:
1. Add endpoint to `src/utils/constants/endpoints.ts` (if needed)
2. Add types to `src/models/<domain>/<name>.types.ts`
3. Add method signature to `src/models/<domain>/<name>.models.ts`
4. Implement method in `src/services/<domain>/<name>.ts`
5. Add unit tests

---

## Common Patterns

### Telemetry Tracking
Use the `@track` decorator on all public methods:
```typescript
@track('ServiceName.MethodName')
async methodName(): Promise<Response> { ... }
```

### Pagination
For paginated endpoints, use `requestWithPagination`:
```typescript
return this.requestWithPagination<T>(method, path, paginationOptions, {
  pagination: {
    paginationType: PaginationType.OFFSET,  // or TOKEN
    itemsField: 'value',
    totalCountField: 'totalRecordCount',
  },
  params: queryParams,
});
```

**Two Pagination Types:**
- **OFFSET**: OData APIs (Tasks, Assets, Queues). Parameters: `$skip`, `$top`, `$count`
- **TOKEN**: Buckets, some endpoints. Parameters: `continuationToken`, `limit`

### Error Handling

**Available Error Types:** `AuthenticationError` (401) • `AuthorizationError` (403) • `NotFoundError` (404) • `ValidationError` (400) • `RateLimitError` (429) • `ServerError` (500+) • `NetworkError`

**Use Type Guards:**
```typescript
try {
  await sdk.tasks.create(taskData, folderId);
} catch (error) {
  if (isAuthenticationError(error)) { /* handle auth */ }
  else if (isValidationError(error)) { /* handle validation */ }
}
```

Errors are handled automatically by `BaseService`. Custom errors are in `src/core/errors/`.

### Transformation Pattern

The SDK applies **three transformations** in order:

1. **Case Conversion**: `pascalToCamelCaseKeys()` - API responses (PascalCase) → camelCase
2. **Field Mapping**: `transformData(data, fieldMap)` - Rename fields for consistency
3. **Value Mapping**: `applyDataTransforms(data, { field, valueMap })` - Convert values to SDK enums

---

## Anti-Patterns to Avoid

### 1. Don't Add Redundant Constructors (CRITICAL)
❌ **BAD**: Constructor that only calls super()
```typescript
export class ResourceService extends BaseService {
  constructor(instance: IUiPath) {
    super(instance);  // Redundant - will fail linting!
  }
}
```

✅ **GOOD**: No constructor (or constructor with actual logic)
```typescript
export class ResourceService extends BaseService {
  // No constructor needed - BaseService handles it

  async create() { /* ... */ }
}
```

### 2. Don't Leave Unused Imports/Variables (CRITICAL)
❌ **BAD**: Unused imports and variables
```typescript
import type { IUiPath } from '../../core/types';  // Not used - will fail linting!
import { FeedbackResponse } from './types';       // Not used - will fail linting!

const unusedVariable = 123;  // Not used - will fail linting!
```

✅ **GOOD**: Only import what you use
```typescript
import { FeedbackCreateOptions } from './types';  // Actually used
```

### 3. Don't Bypass Base Service Classes
❌ **BAD**: Directly use axios or instantiate ApiClient
✅ **GOOD**: Extend BaseService and use `this.get()`, `this.post()`, etc.

### 4. Don't Use Any Type
❌ **BAD**: `async getData(): Promise<any>`
✅ **GOOD**: `async getData(): Promise<TaskResponse>`

### 5. Don't Skip Transformations
❌ **BAD**: Return raw API response
✅ **GOOD**: Apply all three transformations: case → field → value

### 6. Don't Export Internal Types
❌ **BAD**: Export from `*.internal-types.ts` in public API
✅ **GOOD**: Only export from `*.types.ts` and `*.models.ts`

### 7. Don't Commit Sensitive Files (CRITICAL)
❌ **BAD**: Committing .env files, credentials, or hardcoded secrets
✅ **GOOD**: Use .gitignore and environment variables

**Files That Must NEVER Be Committed:**
- `.env`, `.env.local`, `.env.*.local`
- `credentials.json`, `secrets.json`
- `*.key`, `*.pem`, `*.p12`
- Any file containing API keys, tokens, passwords

---

## Testing Guidelines

### Test Structure

**Pattern:**
```typescript
// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ===== MOCKING =====
vi.mock('path/to/api-client');

// ===== TEST SUITE =====
describe('ServiceClass Unit Tests', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { vi.clearAllMocks(); });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange → Act → Assert
      expect(mockApiClient.method).toHaveBeenCalledWith(/*...*/);
    });
  });
});
```

**Rules:**
- MUST organize with clear sections (IMPORTS, MOCKING, TEST SUITE)
- MUST use descriptive names: `should [expected behavior] when [condition]`
- MUST test both success and error scenarios
- MUST use Arrange-Act-Assert pattern
- MUST mock external dependencies
- MUST reset mocks in `afterEach`

**Test Coverage:** 80% minimum for new code • 100% for critical paths (auth, API calls)

---

## Quick Reference: Essential Commands

### For Development

```bash
# Build & Test
npm run build          # Build the SDK (must succeed with 0 errors)
npm test              # Run all tests
npm run test:unit     # Run unit tests only
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report

# Quality Checks
npx oxlint            # Run linter (must be 0 errors, 0 warnings)
npx tsc --noEmit      # Type check without emitting files

# Clean slate
npm run clean         # Remove dist, node_modules, package-lock.json
```

### Before Submitting PR

```bash
# Pre-submission checklist commands
npm run build         # ✅ Must succeed
npm test             # ✅ All tests must pass
npx oxlint           # ✅ Must be 0 errors, 0 warnings
git status           # ✅ Verify no .env or credential files staged
```

---

## Checklist for New Service

**Pre-Implementation:**
- [ ] Swagger/OpenAPI spec obtained from user
- [ ] User confirmed config for integration tests (if applicable)

**Implementation:**
- [ ] Endpoints defined in `src/utils/constants/endpoints.ts`
- [ ] Types created in `src/models/<domain>/<name>.types.ts`
- [ ] Model interface in `src/models/<domain>/<name>.models.ts`
- [ ] Service implementation in `src/services/<domain>/<name>.ts`
- [ ] Module index in `src/services/<domain>/index.ts`
- [ ] Export added to `src/services/index.ts`
- [ ] Entry added to `rollup.config.js` serviceEntries
- [ ] Export added to `package.json` exports field
- [ ] Unit tests in `tests/unit/services/<domain>/<name>.test.ts`
- [ ] (Optional) Integration tests in `tests/integration/services/<domain>/<name>.integration.test.ts`

**Quality Checks:**
- [ ] **No redundant constructors** (remove if only calls super())
- [ ] **No unused imports or variables** (oxlint will catch these)
- [ ] **No .env or credential files committed**
- [ ] Build passes: `npm run build` (0 errors)
- [ ] Tests pass: `npm test` (report exact count)
- [ ] Linting passes: `npx oxlint` (0 errors, 0 warnings)
- [ ] JSDoc documentation with examples
- [ ] All public methods have `@track` decorator

---

## Advanced Topics

For detailed information on architecture, pagination, transformations, and PR review guidelines, see `CLAUDE-PR-REVIEW.md`.

---

**Remember**: This SDK is used by developers worldwide and by LLMs for AI-assisted development. Every API should be **intuitive**, **well-documented**, **type-safe**, and **maintainable**. Consistency is more valuable than cleverness.

**When in doubt:** Look at existing implementations (Feedback, Tasks, Entities) and follow their patterns exactly.
