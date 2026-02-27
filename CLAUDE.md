# UiPath TypeScript SDK

TypeScript SDK for UiPath platform APIs. Provides typed clients for Action Center, Conversational Agent, Data Fabric, Maestro, and Orchestrator services.

## Quick reference

```bash
npm install              # install deps (npm workspaces: root + packages/cli)
npm run build            # rollup build → dist/ (ESM, CJS, UMD, .d.ts)
npm test                 # vitest
npm run test:unit        # unit tests only (tests/unit/)
npm run test:integration # integration tests (vitest.integration.config.ts)
npm run test:all         # unit + integration tests
npm run test:coverage    # with v8 coverage
npm run lint             # oxlint
npm run typecheck        # tsc --noEmit
npm run docs:api         # typedoc + post-process
```

## Repo layout

```
src/
  core/                  # UiPath client, auth, config, errors, HTTP client, telemetry
  services/              # Service implementations grouped by platform area
    action-center/       # Tasks
    conversational-agent/# Conversations
    data-fabric/         # Entities, ChoiceSets
    maestro/             # Processes, ProcessInstances, ProcessIncidents, Cases, CaseInstances
    orchestrator/        # Assets, Buckets, Processes, Queues
  models/                # TypeScript interfaces/types per service domain
  utils/                 # Constants, pagination, encoding, HTTP helpers
    constants/
      endpoints/         # Endpoint constants per domain (data-fabric.ts, maestro.ts, etc.)
tests/
  unit/                  # Mirrors src/ structure
  integration/           # Integration tests (real API calls)
  utils/                 # Shared mocks, constants, test setup helpers
packages/
  cli/                   # Separate CLI package (has its own CLAUDE.md)
samples/                 # Sample apps (process-app, conversational-agent-app, etc.)
docs/                    # MkDocs source; API docs generated via typedoc
```

## Architecture

- **BaseService** (`src/services/base.ts`) — all services extend this. Provides authenticated HTTP methods via ApiClient.
- **SDKInternalsRegistry** (`src/core/internals.ts`) — WeakMap storing private config/context/tokenManager per UiPath instance. Services access internals through this registry, not public API.
- **Modular imports** — each service is a separate subpath export (`@uipath/uipath-typescript/entities`, `/tasks`, `/processes`, etc.). Services take a `UiPath` instance via constructor DI.
- **Dual auth** — OAuth (requires `sdk.initialize()`, for frontend applications) and secret-based (auto-initializes for backend services). See `src/core/index.ts:1-44` for examples.
- **Pagination** — PaginationManager auto-detects OData vs cursor-based. See `src/utils/pagination/`.
- **Errors** — typed hierarchy under `UiPathError`. ErrorFactory maps HTTP status codes to specific types (AuthenticationError, NotFoundError, etc.). See `src/core/errors/`. Type guard functions in `src/core/errors/guards.ts` (`isAuthenticationError()`, `isValidationError()`, `isNotFoundError()`, `isRateLimitError()`, `isServerError()`, `isNetworkError()`). All `UiPathError` instances expose `getDebugInfo()` for diagnostics.

## Code style

- **camelCase**: variables, functions, methods (`getUserById`, `pageSize`)
- **PascalCase**: classes, interfaces, types, enums (`TaskService`, `TaskType`)
- **UPPER_SNAKE_CASE**: constants (`DEFAULT_PAGE_SIZE`, `TASK_ENDPOINTS`)
- **File names**: kebab-case for general files (`api-client.ts`), dot-separated for type/model files (`tasks.types.ts`, `tasks.models.ts`)
- Prefer `private` keyword over underscore prefix for private methods
- No `any` type — use `unknown` if truly unknown, then validate
- Mark optional fields as optional in type interfaces

## Conventions

- Services follow the pattern: extend `BaseService`, call `super(uiPath)`, use `this.get()` / `this.post()` etc. Folder-scoped Orchestrator services extend `FolderScopedService` instead.
- Types live in `src/models/{domain}/{domain}.types.ts`. Internal-only types go in `*.internal-types.ts`.
- Constants live in `src/utils/constants/`. Endpoints are split per domain in `src/utils/constants/endpoints/` (e.g., `data-fabric.ts`, `maestro.ts`, `orchestrator.ts`).
- Subpath exports: when adding a new service module, add entries to `package.json` `exports` and `rollup.config.js`.
- Every public service method must be decorated with `@track('ServiceName.MethodName')` for telemetry.
- Use named imports/exports (avoid default exports). Use barrel exports (`index.ts`) for public API. Never export internal types from barrel exports.

## Service conventions

### Type naming

- **Response types**: `{Entity}GetResponse` for reads, `{Entity}GetAllResponse` for list-specific responses. Mutation responses: `{Entity}InsertResponse`, `{Entity}UpdateResponse`, `{Entity}DeleteResponse`, or generic `{Entity}OperationResponse`.
- **Raw types**: `Raw{Entity}GetResponse` for the internal shape before method attachment — these live in `*.types.ts`.
- **Final response type**: `type {Entity}GetResponse = Raw{Entity}GetResponse & {Entity}Methods` — defined in `*.models.ts`, combining raw data with bound methods.
- **Options types**: `{Entity}GetAllOptions`, `{Entity}GetByIdOptions`, `{Entity}{Operation}Options` (e.g., `TaskAssignmentOptions`, `ProcessInstanceOperationOptions`). Compose with `RequestOptions & PaginationOptions & { ... }` for list methods.
- **Common base types**: `BaseOptions` (expand, select), `RequestOptions` (extends BaseOptions with filter, orderby), `OperationResponse<TData>` (success + data) — all from `src/models/common/types.ts`.
- **Use "Options" not "Request"** for parameter types — never `{Entity}{Operation}Request`.

### Service model + method attachment pattern

Each service has 3 files in `src/models/{domain}/`:

1. **`{domain}.types.ts`** — raw interfaces (`Raw{Entity}GetResponse`), options types, enums
2. **`{domain}.constants.ts`** — field mapping (`{Entity}Map`), status mapping (`{Entity}StatusMap`), expand defaults
3. **`{domain}.models.ts`** — the service model interface (`{Entity}ServiceModel`), methods interface (`{Entity}Methods`), the composed response type (`Raw{Entity}GetResponse & {Entity}Methods`), and `create{Entity}WithMethods()` factory

The method attachment pattern:
- `create{Entity}Methods(rawData, service)` — returns an object of bound async methods that delegate to the service
- `create{Entity}WithMethods(rawData, service)` — merges raw data + methods via `Object.assign({}, rawData, methods)`
- Methods validate required fields (`if (!data.id) throw new Error(...)`) before delegating

### Method attachment (when to bind methods to response objects)

- **Not every service method gets bound.** Only bind methods that operate ON a specific entity after retrieval — state-changing operations (assign, cancel, complete, insert, update, delete) and contextual reads that need the entity's ID.
- **Never bind**: `getAll()`, `getById()`, `create()`, and cross-entity queries like `getUsers()`.
- **Read-only services don't bind at all** — Assets, Buckets, Queues, Processes, ChoiceSets, Cases, and ProcessIncidents have no `{Entity}Methods` interface.

### Response transformation pipeline

Transform functions live in `src/utils/transform.ts`. Not every service uses every step — inspect the actual API response to decide which are needed.

**Available steps (apply in this order, skip any that don't apply):**

1. **`pascalToCamelCaseKeys(response.data)`** — recursively converts PascalCase keys to camelCase. **Use only if the API returns PascalCase keys.**
2. **`transformData(data, {Entity}Map)`** — renames specific fields using a mapping constant. For **semantic renames only** (e.g., `creationTime` → `createdTime`, `organizationUnitId` → `folderId`). **Never use for case conversion.**
3. **`applyDataTransforms(data, { field, valueMap })`** — maps raw enum values to typed enums (e.g., numeric `1` → `TaskStatus.Pending`). **Use only if the API returns raw codes.**
4. **`create{Entity}WithMethods(data, this)`** — attaches bound methods. **Use only if the service has an `{Entity}Methods` interface.**

**How to decide which steps you need:**
- Check the raw API response: PascalCase keys? → step 1
- API field names differ from desired SDK names? → create `{Entity}Map`, step 2
- Numeric codes or raw strings for status/type? → create `{Entity}StatusMap`, step 3
- Entity operations users should call on a response? → step 4

**Standard field renames** (reuse in `{Entity}Map`):
- Time: `creationTime`/`createdAt` → `createdTime`, `lastModificationTime` → `lastModifiedTime`, `startedTimeUtc` → `startedTime`, `completedTimeUtc` → `completedTime`, `expiryTimeUtc` → `expiredTime`
- Folder: `organizationUnitId` → `folderId`, `organizationUnitFullyQualifiedName` → `folderName`

**Outbound requests** (SDK → API): use `transformRequest(data, {Entity}Map)` (auto-reverses field map) and `camelToPascalCaseKeys()`.

**Field maps vs case conversion:** `{Entity}Map` is for semantic renames only. Case conversion is handled by `pascalToCamelCaseKeys()`. Do not add case-only entries to a field map.

### Endpoint constants

Defined in `src/utils/constants/endpoints/` with separate files per domain (e.g., `data-fabric.ts`, `maestro.ts`, `orchestrator.ts`):

- Static endpoints: string constants — `GET_ALL: '${BASE}/api/v1/processes/summary'`
- Parameterized endpoints: arrow functions — `GET_BY_ID: (id: string) => '${BASE}/api/v1/instances/${id}'`
- Operation endpoints: `CANCEL: (id: string) => '${BASE}/api/v1/instances/${id}/cancel'`
- All objects use `as const`
- **Group nested endpoints logically** (e.g., `ENTITY.ATTACHMENT.DOWNLOAD` not flat).
- **Use consistent param names** across endpoints. Avoid redundancy.

### Pagination

**When to add:** Always check whether the API supports paginated responses. If so, use `PaginationHelpers.getAll()` from `src/utils/pagination/helpers.ts`.

**Two pagination types:**

- **`PaginationType.OFFSET`** — OData-style. Items in `value`, count in `@odata.count`. Params: `$top`, `$skip`, `$count`. Supports `jumpToPage`. Use `ODATA_PAGINATION` and `ODATA_OFFSET_PARAMS`.
- **`PaginationType.TOKEN`** — Continuation-token. Items in named array, next page via token. Does **not** support `jumpToPage`. Use service-specific constants.

**Return type is conditional**: `NonPaginatedResponse<T>` without pagination options, `PaginatedResponse<T>` with. Uses `HasPaginationOptions<T>` from `src/utils/pagination/types.ts`.

**Critical constraint**: `cursor` and `jumpToPage` are mutually exclusive.

**Defining pagination constants** — add to `src/utils/constants/common.ts`:

1. **Response shape**: `{ ITEMS_FIELD, TOTAL_COUNT_FIELD }` (OFFSET) or `{ ITEMS_FIELD, CONTINUATION_TOKEN_FIELD }` (TOKEN)
2. **Request params**: `{ PAGE_SIZE_PARAM, OFFSET_PARAM, COUNT_PARAM }` (OFFSET) or `{ PAGE_SIZE_PARAM, TOKEN_PARAM }` (TOKEN)

Naming: `{SERVICE}_PAGINATION` for response shape, `{SERVICE}_OFFSET_PARAMS` or `{SERVICE}_TOKEN_PARAMS` for request params.

**`excludeFromPrefix`** — pass to prevent specific keys from getting `$` prefix. Use when keys are service-specific (not OData) query params.

**How to add pagination to a new service method:**
1. Define pagination constants in `src/utils/constants/common.ts`
2. Call `PaginationHelpers.getAll()` with `serviceAccess`, `getEndpoint`, `transformFn`, `pagination` config, and `excludeFromPrefix`
3. Type with conditional return: `Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<R> : NonPaginatedResponse<R>>`
4. Update `docs/pagination.md` quick reference table

### Export naming

- Internal class: `{Entity}Service` (e.g., `EntityService`, `TaskService`)
- Public alias in `index.ts`: plural noun (e.g., `EntityService as Entities`, `TaskService as Tasks`)
- Both names exported for backward compatibility

### Internal types (`*.internal-types.ts`)

Types in `{domain}.types.ts` are public (re-exported through barrel). Types in `{domain}.internal-types.ts` are private (imported only by service implementations).

**Put in `internal-types.ts`:** Raw API response shapes before transformation, intermediate parsing types, service-internal operation types, internal enums.

**Put in `types.ts`:** All types in public method signatures, `Raw{Entity}GetResponse` types that users compose with `{Entity}Methods`.

### OData prefix pattern

OData APIs require `$` prefix on query params. The SDK accepts clean camelCase keys and adds the prefix via `addPrefixToKeys()` from `src/utils/transform.ts`.

**Applied automatically by:** `PaginationHelpers.getAll()`, `FolderScopedService._getByFolder()`.

**Apply manually in:** `getById()` methods accepting `BaseOptions` — `const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options))`.

### Headers utility

`createHeaders()` from `src/utils/http/headers.ts` builds headers from key-value pairs, filtering undefined.

- **Orchestrator**: `createHeaders({ [FOLDER_ID]: folderId })` — numeric folder IDs
- **Maestro**: `createHeaders({ [FOLDER_KEY]: folderKey })` — string folder keys

### BaseService vs FolderScopedService

**`BaseService`** (`src/services/base.ts`): Authenticated HTTP methods, `createPaginationServiceAccess()`. Use for services where folder context is not needed or handled per-method.

**`FolderScopedService`** (`src/services/folder-scoped.ts`): Extends BaseService, adds `_getByFolder()` with folder ID header + OData prefix. Use for Orchestrator services requiring folder ID header for most operations.

**Decision rule**: API requires `X-UIPATH-OrganizationUnitId` header + OData `value` array pattern → `FolderScopedService`. Otherwise → `BaseService`.

### OperationResponse pattern

```typescript
interface OperationResponse<TData> { success: boolean; data: TData; }
```

**Use for:** Lifecycle operations (cancel, pause, resume), bulk operations with error checking via `processODataArrayResponse()`.

**DO NOT use for:** `getAll()`, `getById()`, `create()`, methods returning entity data directly.

## Anti-patterns

- **DO NOT bypass base service classes** — never directly instantiate HTTP clients; use `this.get()`, `this.post()` from BaseService.
- **DO NOT use `any` type** — use `unknown` then validate.
- **DO NOT skip transformations** — never return raw API responses; apply applicable pipeline steps.
- **DO NOT implement pagination manually** — always use `PaginationHelpers.getAll()`.
- **DO NOT export internal types** — `*.internal-types.ts` must never be re-exported through barrel exports.
- **DO NOT forget OData prefixes** — `{ filter: "..." }` must become `{ "$filter": "..." }`.
- **DO NOT leave unused code** — unused imports, variables, redundant constructors that only call `super()`. Linter (oxlint) catches these.
- **DO NOT add redundant constructors** — if the constructor only calls `super()`, delete it entirely.
- **DO NOT commit sensitive files** — `.env`, `credentials.json`, `*.key`, `*.pem`, hardcoded API keys/tokens.
- **DO NOT use misleading fallbacks** — if a parameter is required, DO NOT write `param || {}`.
- **DO NOT use `as unknown as`** type casts — refactor to make types flow naturally.

## Testing guidelines

- Tests use `vitest` with `vi.mock()` and `vi.hoisted()`. Shared mocks in `tests/utils/mocks/`. Use `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`.
- **Arrange-Act-Assert** pattern. Reset mocks in `afterEach`.
- Test both **success and error scenarios** for every public method.
- Test descriptions must match what's being tested.
- Type request objects in tests — don't leave as untyped objects.
- Use existing test constants from `tests/utils/constants/` instead of hardcoding values.
- Verify bound methods exist on response objects when `getById` returns entities with attached methods.
- **Coverage**: 80% minimum for new code, 100% for critical paths (auth, API calls).
- Remove unused mock methods. Extract repeated logic into shared helpers.

## Documentation

JSDoc comments in `src/models/{domain}/*.models.ts` are the **source of truth for the public API docs site**. TypeDoc (`typedoc.json`) runs on `src/index.ts`.

- `{Entity}ServiceModel` interfaces become the main API reference pages.
- Use `@example` with fenced TypeScript blocks, `@param`, `@returns`, `{@link TypeName}`.
- Tag internal code with `@internal` or `@ignore`.
- When adding methods, update `docs/oauth-scopes.md` with required OAuth scopes.
- Run `npm run docs:api` to regenerate.

**JSDoc quality rules:**
- Link response types with `{@link TypeName}` in every method's JSDoc.
- Show how to get prerequisite IDs (e.g., "First, get entities with `entities.getAll()`").
- Use `<paramName>` placeholder convention for IDs in examples.
- Use camelCase in examples, matching SDK response format.
- Keep JSDoc in sync with method names.

## Build details

- **Rollup** builds ESM (`.mjs`), CJS (`.cjs`), UMD (`.umd.js`), and `.d.ts` per module.
- Config: `rollup.config.js`. Custom `rewriteDtsImports` plugin normalizes core imports.
- TypeScript target: ES2020, strict mode, `experimentalDecorators: true`.
- Node.js requirement: 18.x or higher.
