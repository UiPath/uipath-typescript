# Onboard New Service / Add Method

> **Prerequisites:** Read `CLAUDE.md` at the repo root first for full project conventions, architecture, best practices, and anti-patterns. Everything below assumes familiarity with those rules.

## Claude instructions

### Always ask for Swagger/OpenAPI spec first

When the user requests to implement a new service or add new methods, **ALWAYS ask for a Swagger/OpenAPI specification BEFORE starting implementation.**

Use the AskUserQuestion tool with these options:
1. "Yes, I have a Swagger/OpenAPI file" — ask for the file path or URL
2. "Yes, I have API documentation URL" — ask for the documentation link
3. "No, I'll describe the API manually" — proceed with manual description

**Why:** Swagger files contain accurate endpoint paths, HTTP methods, and request/response schemas. This reduces errors and ensures the SDK matches the actual API contract.

### Ask for integration test config after implementation

After completing implementation, **ALWAYS ask if the user wants integration tests** and request config:
- `baseUrl` — UiPath API base URL (e.g., `https://cloud.uipath.com`)
- `orgName` — Organization name
- `tenantName` — Tenant name
- `secret` — Personal Access Token (PAT) or service account secret

---

## Step-by-step: New service

### Step 1: Define API endpoints

Add to `src/utils/constants/endpoints.ts`:

```typescript
export const NEWDOMAIN_BASE = 'newdomain_';

export const RESOURCE_ENDPOINTS = {
  CREATE: `${NEWDOMAIN_BASE}/api/Resource`,
  GET_ALL: `${NEWDOMAIN_BASE}/api/Resource`,
  GET_BY_ID: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
  UPDATE: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
  DELETE: (id: string) => `${NEWDOMAIN_BASE}/api/Resource/${id}`,
} as const;
```

### Step 2: Create type definitions

Create `src/models/<domain>/<name>.types.ts`:

```typescript
export interface ResourceCreateOptions {
  name: string;
  // ... fields from Swagger schema
}

export interface RawResourceGetResponse {
  id: string;
  name: string;
  createdAt: string;
  // ... fields from Swagger schema
}

export interface ResourceGetAllOptions {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  [key: string]: string | number | boolean | undefined;
}
```

Use `*.internal-types.ts` for raw API response shapes not exposed publicly (see CLAUDE.md "Internal types" section).

### Step 3: Create service model interface

Create `src/models/<domain>/<name>.models.ts`:

```typescript
import type { ResourceCreateOptions, RawResourceGetResponse, ResourceGetAllOptions } from './<name>.types';

export interface ResourceServiceModel {
  create(options: ResourceCreateOptions): Promise<RawResourceGetResponse>;
  getAll(options?: ResourceGetAllOptions): Promise<RawResourceGetResponse[]>;
  getById(id: string): Promise<RawResourceGetResponse>;
}
```

If the service has entity operations (assign, cancel, etc.), add `{Entity}Methods` interface and `create{Entity}WithMethods()` factory per CLAUDE.md method attachment rules.

### Step 4: Implement the service

Create `src/services/<domain>/<name>.ts`:

```typescript
import { BaseService } from '../base';
import type { ResourceCreateOptions, RawResourceGetResponse } from '../../models/<domain>/<name>.types';
import type { ResourceServiceModel } from '../../models/<domain>/<name>.models';
import { RESOURCE_ENDPOINTS } from '../../utils/constants/endpoints';
import { track } from '../../core/telemetry';

export class ResourceService extends BaseService implements ResourceServiceModel {
  // Do NOT add a constructor if it only calls super() — it's redundant

  @track('Resource.Create')
  async create(options: ResourceCreateOptions): Promise<RawResourceGetResponse> {
    const response = await this.post<RawResourceGetResponse>(
      RESOURCE_ENDPOINTS.CREATE,
      options
    );
    return response.data;
    // Apply transformation pipeline per CLAUDE.md if needed:
    // pascalToCamelCaseKeys → transformData → applyDataTransforms → createWithMethods
  }
}
```

**HTTP methods from BaseService:** `this.get<T>()`, `this.post<T>()`, `this.put<T>()`, `this.patch<T>()`, `this.delete<T>()` (use `super.delete()` to avoid name conflicts).

For paginated endpoints, use `PaginationHelpers.getAll()` per CLAUDE.md pagination section.

### Step 5: Create module index

Create `src/services/<domain>/index.ts`:

```typescript
export { ResourceService as Resources, ResourceService } from './<name>';
export type * from '../../models/<domain>/<name>.types';
export type * from '../../models/<domain>/<name>.models';
```

### Step 6: Register in services index

Add to `src/services/index.ts`:

```typescript
export * from './<domain>';
```

### Step 7: Configure build (Rollup)

Add to `rollup.config.js` in the `serviceEntries` array:

```javascript
{
  name: '<export-name>',
  input: 'src/services/<domain>/index.ts',
  output: '<export-name>/index'
}
```

### Step 8: Add package exports

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

### Step 9: Write unit tests

Create `tests/unit/services/<domain>/<name>.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceService } from '../../../../src/services/<domain>/<name>';
import { RESOURCE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { ApiClient } from '../../../../src/core/http/api-client';

vi.mock('../../../../src/core/http/api-client');

describe('ResourceService', () => {
  let service: ResourceService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

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
      const input = { name: 'Test' };
      const mockResponse = { data: { id: 'r-1', name: 'Test' } };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.create(input);

      expect(result).toEqual(mockResponse.data);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        RESOURCE_ENDPOINTS.CREATE, input, {}
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      await expect(service.create({ name: 'Test' })).rejects.toThrow('API Error');
    });
  });
});
```

Follow CLAUDE.md testing guidelines: use existing constants, test success + error, Arrange-Act-Assert, type all objects.

---

## Adding a method to an existing service

1. Add endpoint to `src/utils/constants/endpoints.ts` (if new)
2. Add types to `src/models/<domain>/<name>.types.ts`
3. Add method signature to `src/models/<domain>/<name>.models.ts`
4. Implement in `src/services/<domain>/<name>.ts` with `@track` decorator
5. Add unit tests (success + error cases)
6. Update `docs/oauth-scopes.md` with required scope
7. If the method operates on a specific entity, add to `{Entity}Methods` and `create{Entity}Methods()`

---

## Integration test template

Location: `tests/integration/services/<domain>/<name>.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { UiPath } from '../../src/core/uipath';
import { ResourceService } from '../../src/services/<domain>/<name>';

describe('ResourceService Integration Tests', () => {
  let sdk: UiPath;
  let service: ResourceService;

  beforeAll(async () => {
    sdk = new UiPath({
      baseUrl: '<baseUrl>',
      orgName: '<org-name>',
      tenantName: '<tenant-name>',
      secret: '<secret>',
    });
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

---

## New service checklist

**Pre-implementation:**
- [ ] Swagger/OpenAPI spec obtained
- [ ] Integration test config confirmed (if applicable)

**Implementation:**
- [ ] Endpoints in `src/utils/constants/endpoints.ts`
- [ ] Types in `src/models/<domain>/<name>.types.ts`
- [ ] Model interface in `src/models/<domain>/<name>.models.ts`
- [ ] Service in `src/services/<domain>/<name>.ts`
- [ ] Module index in `src/services/<domain>/index.ts`
- [ ] Export in `src/services/index.ts`
- [ ] Entry in `rollup.config.js` serviceEntries
- [ ] Export in `package.json` exports
- [ ] Unit tests in `tests/unit/services/<domain>/<name>.test.ts`
- [ ] `docs/oauth-scopes.md` updated

**Quality:**
- [ ] No redundant constructors, unused imports, or unused variables
- [ ] No `.env` or credential files
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] All public methods have `@track` decorator
- [ ] JSDoc with `@param`, `@returns`, `@example`, `{@link}`
