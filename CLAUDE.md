# UiPath TypeScript SDK - Claude Code Guide

This document helps Claude Code understand and work with this codebase efficiently.

## Project Overview

This is the official UiPath TypeScript SDK providing programmatic access to UiPath services (Orchestrator, Maestro, Data Fabric, LLMOps, Action Center).

**Key Characteristics:**
- Modular architecture with tree-shakeable exports
- Each service can be imported independently: `import { Feedback } from '@uipath/uipath-typescript/feedback'`
- Services extend `BaseService` and use dependency injection via `IUiPath` instance
- Uses Rollup for building ESM, CJS, and UMD bundles

## Project Structure

```
src/
├── core/                    # SDK core (auth, config, http client, telemetry)
│   ├── auth/               # Token management
│   ├── config/             # Configuration handling
│   ├── http/               # API client
│   └── telemetry/          # Tracking decorators
├── models/                  # TypeScript types and interfaces
│   ├── <domain>/           # e.g., llmops/, maestro/, orchestrator/
│   │   ├── <name>.types.ts     # Public types (exported to consumers)
│   │   └── <name>.models.ts    # Service model interfaces
├── services/               # Service implementations
│   ├── base.ts            # BaseService class (all services extend this)
│   └── <domain>/          # e.g., llmops/, maestro/, orchestrator/
│       ├── <name>.ts          # Service implementation
│       └── index.ts           # Module exports
└── utils/
    └── constants/
        └── endpoints.ts   # API endpoint constants

tests/
└── unit/
    └── services/<domain>/<name>.test.ts
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

**Example prompt to use:**
> "Do you have a Swagger/OpenAPI spec file for the new service? This will help me generate accurate types, endpoints, and method signatures automatically."

### IMPORTANT: Ask for Integration Test Config After Implementation

**After completing the service/method implementation, ALWAYS ask if the user wants to write integration tests and request the necessary configuration.**

Use the AskUserQuestion tool:
> "Would you like me to write integration tests for the new service? If yes, please provide the following config details:"

**Required config for integration tests:**
- `baseUrl` - UiPath API base URL (e.g., `https://cloud.uipath.com`, `https://staging.uipath.com`, `https://alpha.uipath.com`)

**Example integration test structure:**
```typescript
import { describe, it, expect } from 'vitest';
import { UiPath } from '../../src/core/uipath';
import { ResourceService } from '../../src/services/<domain>/<name>';

describe('ResourceService Integration Tests', () => {
  const config = {
    baseUrl: process.env.UIPATH_BASE_URL || 'https://alpha.uipath.com',
    orgName: process.env.UIPATH_ORG_NAME || '<org-name>',
    tenantName: process.env.UIPATH_TENANT_NAME || '<tenant-name>',
    secret: process.env.UIPATH_SECRET || '<secret>',
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

  it('should get all resources via real API', async () => {
    const results = await service.getAll();
    expect(Array.isArray(results)).toBe(true);
  });
});
```

**Integration test file location:** `tests/integration/services/<domain>/<name>.integration.test.ts`

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
import type { IUiPath } from '../../core/types';
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
  /**
   * Creates an instance of the Resource service.
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
  }

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
- `this.delete<T>(path, options?)` - DELETE request

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

### Error Handling
Errors are handled automatically by `BaseService`. Custom errors are in `src/core/errors/`.

---

## Commands

```bash
npm run build          # Build the SDK
npm run test           # Run all tests
npm run test:unit      # Run unit tests only
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

---

## Checklist for New Service

- [ ] Swagger/OpenAPI spec obtained from user
- [ ] Endpoints defined in `src/utils/constants/endpoints.ts`
- [ ] Types created in `src/models/<domain>/<name>.types.ts`
- [ ] Model interface in `src/models/<domain>/<name>.models.ts`
- [ ] Service implementation in `src/services/<domain>/<name>.ts`
- [ ] Module index in `src/services/<domain>/index.ts`
- [ ] Export added to `src/services/index.ts`
- [ ] Entry added to `rollup.config.js` serviceEntries
- [ ] Export added to `package.json` exports field
- [ ] Unit tests in `tests/unit/services/<domain>/<name>.test.ts`
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] (Optional) Integration tests in `tests/integration/services/<domain>/<name>.integration.test.ts`
