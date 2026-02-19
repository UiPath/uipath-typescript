# UiPath TypeScript SDK

TypeScript SDK for UiPath platform APIs. Provides typed clients for Data Fabric, Maestro, Orchestrator, and Action Center services.

## Quick reference

```bash
npm install          # install deps (npm workspaces: root + packages/cli, packages/plugins)
npm run build        # rollup build → dist/ (ESM, CJS, UMD, .d.ts)
npm test             # vitest (run once)
npm run test:unit    # unit tests only (tests/unit/)
npm run test:watch   # watch mode
npm run test:coverage # with v8 coverage
npm run lint         # oxlint
npm run typecheck    # tsc --noEmit
npm run docs:api     # typedoc + post-process
```

## Repo layout

```
src/
  core/          # UiPath client, auth, config, errors, HTTP client, telemetry
  services/      # Service implementations grouped by platform area
    data-fabric/ # Entities, ChoiceSets
    maestro/     # Processes, ProcessInstances, ProcessIncidents, Cases, CaseInstances
    orchestrator/# Assets, Buckets, Processes, Queues
    action-center/ # Tasks
  models/        # TypeScript interfaces/types per service domain
  utils/         # Constants, pagination, encoding, HTTP helpers
tests/
  unit/          # Mirrors src/ structure
  utils/         # Shared mocks, constants, test setup helpers
packages/
  cli/           # Separate CLI package (has its own CLAUDE.md)
  plugins/       # Plugin system (WIP)
samples/         # Sample apps (process-app, process-app-v0, process-app-v1)
docs/            # MkDocs source; API docs generated via typedoc
```

## Architecture

- **BaseService** (`src/services/base.ts`) — all services extend this. Provides authenticated HTTP methods via ApiClient.
- **SDKInternalsRegistry** (`src/core/internals.ts`) — WeakMap storing private config/context/tokenManager per UiPath instance. Services access internals through this registry, not public API.
- **Modular imports** — each service is a separate subpath export (`@uipath/uipath-typescript/entities`, `/tasks`, `/processes`, etc.). Services take a `UiPath` instance via constructor DI.
- **Dual auth** — OAuth (requires `sdk.initialize()`, for frontend applications) and secret-based (auto-initializes for backend services). See `src/core/index.ts:1-44` for examples.
- **Pagination** — PaginationManager auto-detects OData vs cursor-based. See `src/utils/pagination/`.
- **Errors** — typed hierarchy under `UiPathError`. ErrorFactory maps HTTP status codes to specific types (AuthenticationError, NotFoundError, etc.). See `src/core/errors/`. Type guard functions in `src/core/errors/guards.ts` (`isAuthenticationError()`, `isValidationError()`, `isNotFoundError()`, `isRateLimitError()`, `isServerError()`, `isNetworkError()`). All `UiPathError` instances expose `getDebugInfo()` for diagnostics.

## Conventions to follow

- Services follow the pattern: extend `BaseService`, call `super(uiPath)`, use `this.get()` / `this.post()` etc. Folder-scoped Orchestrator services extend `FolderScopedService` instead (see "BaseService vs FolderScopedService" section below).
- Types live in `src/models/{domain}/{domain}.types.ts`. Internal-only types go in `*.internal-types.ts` (see "Internal types" section below).
- Constants (endpoints, params) live in `src/utils/constants/`.
- Subpath exports: when adding a new service module, add entries to `package.json` `exports` and `rollup.config.js`.
- Tests use `vitest` with `vi.mock()` and `vi.hoisted()`. Shared mocks live in `tests/utils/mocks/`. Use `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`.
- Every public service method must be decorated with `@track('ServiceName.MethodName')` for telemetry.
- Use named imports/exports (avoid default exports). Use barrel exports (`index.ts`) for public API. Never export internal types from barrel exports.

## Code style

- **camelCase**: variables, functions, methods (`getUserById`, `pageSize`)
- **PascalCase**: classes, interfaces, types, enums (`TaskService`, `TaskType`)
- **UPPER_SNAKE_CASE**: constants (`DEFAULT_PAGE_SIZE`, `TASK_ENDPOINTS`)
- **File names**: kebab-case (`api-client.ts`) or dot-separated (`tasks.types.ts`)
- Prefer `private` keyword over underscore prefix for private methods
- No `any` type — use `unknown` if truly unknown, then validate
- Mark optional fields as optional in type interfaces

## Service conventions (follow these when adding/modifying services)

### Type naming

- **Response types**: `{Entity}GetResponse` for reads, `{Entity}GetAllResponse` for list-specific responses. Mutation responses: `{Entity}InsertResponse`, `{Entity}UpdateResponse`, `{Entity}DeleteResponse`, or generic `{Entity}OperationResponse`.
- **Raw types**: `Raw{Entity}GetResponse` for the internal shape before method attachment — these live in `*.types.ts`.
- **Final response type**: `type {Entity}GetResponse = Raw{Entity}GetResponse & {Entity}Methods` — defined in `*.models.ts`, combining raw data with bound methods.
- **Options types**: `{Entity}GetAllOptions`, `{Entity}GetByIdOptions`, `{Entity}{Operation}Options` (e.g., `TaskAssignmentOptions`, `ProcessInstanceOperationOptions`). Compose with `RequestOptions & PaginationOptions & { ... }` for list methods.
- **Common base types**: `BaseOptions` (expand, select), `RequestOptions` (extends BaseOptions with filter, orderby), `OperationResponse<TData>` (success + data) — all from `src/models/common/types.ts`.
- **Use "Options" not "Request"** for parameter types. The SDK uses `{Entity}{Operation}Options` everywhere — never `{Entity}{Operation}Request`.

### Service model + method attachment pattern

Each service has 3 files in `src/models/{domain}/`:

1. **`{domain}.types.ts`** — raw interfaces (`Raw{Entity}GetResponse`), options types, enums
2. **`{domain}.constants.ts`** — field mapping (`{Entity}Map`), status mapping (`{Entity}StatusMap`), expand defaults
3. **`{domain}.models.ts`** — the service model interface (`{Entity}ServiceModel`), methods interface (`{Entity}Methods`), the composed response type (`Raw{Entity}GetResponse & {Entity}Methods`), and `create{Entity}WithMethods()` factory

The method attachment pattern:
- `create{Entity}Methods(rawData, service)` — returns an object of bound async methods that delegate to the service (e.g., `entity.insert()` calls `service.insertById()`)
- `create{Entity}WithMethods(rawData, service)` — merges raw data + methods via `Object.assign({}, rawData, methods)`
- Methods validate required fields (`if (!data.id) throw new Error(...)`) before delegating

### Method attachment (when to bind methods to response objects)
- **Not every service method gets bound.** Only bind methods that operate ON a specific entity after retrieval — state-changing operations (assign, cancel, complete, insert, update, delete) and contextual reads that need the entity's ID (getRecords, getIncidents, getExecutionHistory, getStages).
- **Never bind**: `getAll()`, `getById()`, `create()`, and cross-entity queries like `getUsers()`. These are entry points, not entity operations.
- **Read-only services don't bind at all** — Assets, Buckets, Queues, Processes, ChoiceSets, Cases, and ProcessIncidents have no `{Entity}Methods` interface because they only expose retrieval.
- When adding a new method, decide: does it require an entity's ID/context and mutate or query related data for that specific entity? If yes, add it to `{Entity}Methods` + `create{Entity}Methods()`. If it's a standalone service-level operation, don't bind it.

### Response transformation pipeline

Transform functions live in `src/utils/transform.ts`. Not every service uses every step — inspect the actual API response to decide which are needed.

**Available steps (apply in this order, skip any that don't apply):**

1. **`pascalToCamelCaseKeys(response.data)`** — recursively converts all PascalCase keys to camelCase. **Use only if the API returns PascalCase keys.** If the API already returns camelCase, skip this step entirely.
2. **`transformData(data, {Entity}Map)`** — renames specific fields using a mapping constant defined in `{domain}.constants.ts`. This is for **semantic renames only** — giving API fields clearer SDK names (e.g., `creationTime` → `createdTime`, `organizationUnitId` → `folderId`). **Never use this for case conversion** — that's step 1's job. If no fields need renaming, skip this step.
3. **`applyDataTransforms(data, { field, valueMap })`** — maps raw enum values to typed enums (e.g., numeric `1` → `TaskStatus.Pending`). **Use only if the API returns raw codes** (numbers or strings) that should be exposed as SDK enums. If the API already returns readable values, skip this step.
4. **`create{Entity}WithMethods(data, this)`** — attaches bound methods to the response object. **Use only if the service has an `{Entity}Methods` interface** (see method attachment rules above).

**How to decide which steps you need for a new service:**
- Check the raw API response: Are keys PascalCase? → add step 1.
- Are there fields whose API name differs from the SDK name you want? → create an `{Entity}Map` in `{domain}.constants.ts` and add step 2.
- Does the API return numeric codes or raw strings for a status/type field? → create an `{Entity}StatusMap` and add step 3.
- Does the service have operations users should call on a response object? → add step 4.

**Standard field renames** (reuse these in your `{Entity}Map` when the API has them):
- Time fields: `creationTime`/`createdAt` → `createdTime`, `lastModificationTime` → `lastModifiedTime`, `startedTimeUtc` → `startedTime`, `completedTimeUtc` → `completedTime`, `expiryTimeUtc` → `expiredTime`
- Folder fields: `organizationUnitId` → `folderId`, `organizationUnitFullyQualifiedName` → `folderName`

**For outbound requests** (SDK → API), use `transformRequest(data, {Entity}Map)` which auto-reverses the field map. For case conversion outbound, use `camelToPascalCaseKeys()`.

**Field maps vs case conversion:**
- **`{Entity}Map` is for semantic renames only** (e.g., `creationTime` → `createdTime`, `organizationUnitId` → `folderId`), not for PascalCase→camelCase. Case conversion is handled separately by `pascalToCamelCaseKeys()`. Do not add case-only entries to a field map.
- **Check the actual API response first** before deciding which transform steps to apply. If the API already returns camelCase, don't add `pascalToCamelCaseKeys()`. If it doesn't return raw enum codes, don't add `applyDataTransforms()`. Each step should be justified by what the API actually sends.

### Endpoint constants

Defined in `src/utils/constants/endpoints.ts`, grouped by service:

- Static endpoints: string constants — `GET_ALL: '${BASE}/api/v1/processes/summary'`
- Parameterized endpoints: arrow functions — `GET_BY_ID: (id: string) => '${BASE}/api/v1/instances/${id}'`
- Operation endpoints: `CANCEL: (id: string) => '${BASE}/api/v1/instances/${id}/cancel'`
- All objects use `as const`
- **Group nested endpoints logically** in the constants object (e.g., `ENTITY.ATTACHMENT.DOWNLOAD` not a flat list).
- **Use consistent param names** across endpoints (e.g., always `instanceId`, not sometimes `id` and sometimes `instanceId`). Avoid redundancy — under a `CASE` group, use `REOPEN` not `REOPEN_CASE`.

### Pagination

**When to add pagination**: Always check whether the API endpoint supports paginated responses (returns a list with count/total or continuation tokens). If it does, use `PaginationHelpers.getAll()` from `src/utils/pagination/helpers.ts` instead of raw HTTP calls. This gives users cursor navigation, page jumping (when supported), and consistent `PaginatedResponse<T>` / `NonPaginatedResponse<T>` return types.

**Two pagination types** (configured via the `pagination` config object passed to `PaginationHelpers.getAll()`):

- **`PaginationType.OFFSET`** — for OData-style APIs. Items in a `value` array, count in `@odata.count`. Params: `$top`, `$skip`, `$count`. Supports `jumpToPage`. Use the shared constants from `ODATA_PAGINATION` and `ODATA_OFFSET_PARAMS` (or service-specific equivalents like `ENTITY_OFFSET_PARAMS`).
- **`PaginationType.TOKEN`** — for continuation-token APIs. Items in a named array field, next page via a continuation token field. Does **not** support `jumpToPage`. Use service-specific constants (e.g., `PROCESS_INSTANCE_PAGINATION`, `BUCKET_PAGINATION`).

**Return type is conditional**: the method returns `NonPaginatedResponse<T>` when called without pagination options, `PaginatedResponse<T>` when any pagination option is passed. This uses the `HasPaginationOptions<T>` conditional type from `src/utils/pagination/types.ts`.

**Critical constraint**: `cursor` and `jumpToPage` are mutually exclusive — never both in the same call.

**Defining pagination constants** — add to `src/utils/constants/common.ts`. Each paginated service needs two constant objects:

1. **Response shape** — tells PaginationHelpers where to find items and count/token in the API response:
   - OFFSET: `{ ITEMS_FIELD: '<arrayField>', TOTAL_COUNT_FIELD: '<countField>' }` — e.g., OData uses `'value'` / `'@odata.count'`, Data Fabric uses `'value'` / `'totalRecordCount'`.
   - TOKEN: `{ ITEMS_FIELD: '<arrayField>', CONTINUATION_TOKEN_FIELD: '<tokenField>' }` — e.g., Maestro uses `'instances'` / `'nextPage'`, Buckets use `'items'` / `'continuationToken'`.
   - If the API uses the standard OData shape, reuse `ODATA_PAGINATION` directly instead of defining a new one.

2. **Request params** — tells PaginationHelpers what query parameter names to send:
   - OFFSET: `{ PAGE_SIZE_PARAM: '<top>', OFFSET_PARAM: '<skip>', COUNT_PARAM: '<count>' }` — OData uses `'$top'` / `'$skip'` / `'$count'`, Data Fabric uses `'limit'` / `'start'` / `undefined`.
   - TOKEN: `{ PAGE_SIZE_PARAM: '<size>', TOKEN_PARAM: '<token>' }` — e.g., `'pageSize'` / `'nextPage'`, or `'takeHint'` / `'continuationToken'`.
   - If the API uses standard OData params, reuse `ODATA_OFFSET_PARAMS` directly.

Naming convention: `{SERVICE}_PAGINATION` for the response shape, `{SERVICE}_OFFSET_PARAMS` or `{SERVICE}_TOKEN_PARAMS` for the request params.

**`excludeFromPrefix`** — by default, `PaginationHelpers.getAll()` prefixes all user-provided option keys with `ODATA_PREFIX` (`'$'`). Pass `excludeFromPrefix: string[]` to prevent specific keys from being prefixed. Use this when:
- The option is a service-specific query param, not an OData param (e.g., Entities excludes `'expansionLevel'`, Buckets excludes `'prefix'`).
- The option is a custom filter param (e.g., Tasks excludes `'event'`).
- **All** options are non-OData — TOKEN-based Maestro APIs exclude all keys: `excludeFromPrefix: Object.keys(options || {})`.

**How to add pagination to a new service method:**
1. Define pagination constants in `src/utils/constants/common.ts` (see above).
2. In the service method, call `PaginationHelpers.getAll()` with: `serviceAccess`, `getEndpoint`, `transformFn`, a `pagination` config (type, field names, param names), and `excludeFromPrefix` if any option keys are not OData params.
3. Type the method signature with the conditional return: `Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<R> : NonPaginatedResponse<R>>`.
4. Update `docs/pagination.md` quick reference table with the new method and whether it supports `jumpToPage`.

### Export naming

- Internal class: always `{Entity}Service` (e.g., `EntityService`, `TaskService`, `ChoiceSetService`)
- Public alias in `index.ts`: plural noun (e.g., `EntityService as Entities`, `TaskService as Tasks`, `ChoiceSetService as ChoiceSets`)
- Both names exported for backward compatibility

### Internal types (`*.internal-types.ts`)

Types in `{domain}.types.ts` are public — they're re-exported through `src/models/{domain}/index.ts` → `src/index.ts` and appear in generated docs. Types in `{domain}.internal-types.ts` are private — they're imported only by service implementations, never re-exported.

**Put in `internal-types.ts`:**
- Raw API response shapes before transformation (e.g., `RawChoiceSetGetAllResponse` with PascalCase fields, `RawCaseAppConfig`)
- Intermediate parsing types used during transformation pipelines (e.g., `EntityMetadataResponse`, `BpmnVariableMetadata`)
- Service-internal operation types not exposed in method signatures (e.g., `TaskAssignmentResponseCollection`, `TaskGetFormOptions`)
- Internal enums used only for filtering/config within the service (e.g., `ProcessType`)

**Put in `types.ts`:**
- All types that appear in public method signatures — response types, option types, public enums
- `Raw{Entity}GetResponse` types that users compose with `{Entity}Methods` (these are part of the public API since users see the fields)

### OData prefix pattern

OData APIs require query parameters to be prefixed with `$` (e.g., `$filter`, `$expand`, `$select`, `$orderby`). The SDK accepts clean camelCase keys from users and adds the prefix before making HTTP calls using `addPrefixToKeys()` from `src/utils/transform.ts`.

**Where it's applied automatically:**
- **`PaginationHelpers.getAll()`** — prefixes all processed options keys with `ODATA_PREFIX` (`'$'`). To exclude specific keys from prefixing, pass `excludeFromPrefix: ['keyName']` in the config (e.g., Tasks excludes `'event'`, Buckets excludes `'prefix'`).
- **`FolderScopedService._getByFolder()`** — prefixes all option keys when fetching folder-scoped resources.

**Where you apply it manually:**
- In `getById()` methods that accept `BaseOptions` (expand, select) — prefix all option keys before passing to the HTTP call: `const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options))`.

Import: `import { addPrefixToKeys } from '../../utils/transform'` and `import { ODATA_PREFIX } from '../../utils/constants/common'`.

### Headers utility

`createHeaders()` from `src/utils/http/headers.ts` builds a headers object from key-value pairs, stringifying values and filtering out undefined entries. Used whenever a service method needs to pass folder context or other headers to an HTTP call.

**Two folder header patterns:**
- **Orchestrator services** — use numeric folder IDs: `createHeaders({ [FOLDER_ID]: folderId })`. The `FOLDER_ID` constant maps to the `X-UIPATH-OrganizationUnitId` header.
- **Maestro services** — use string folder keys: `createHeaders({ [FOLDER_KEY]: folderKey })`. The `FOLDER_KEY` constant maps to a different header.

Import: `import { createHeaders } from '../../utils/http/headers'` and the folder constant from `../../utils/constants/common`.

When to use: any service method that takes a `folderId` or `folderKey` parameter needs to pass it as a header. The pagination helper also creates folder headers automatically when `folderId` is provided in the pagination config.

### BaseService vs FolderScopedService

Both live in `src/services/`. All services extend one of these.

**`BaseService`** (`src/services/base.ts`):
- Provides authenticated HTTP methods (`this.get()`, `this.post()`, `this.put()`, `this.delete()`).
- Provides `createPaginationServiceAccess()` for use with `PaginationHelpers.getAll()`.
- Use for: services where folder context is either not needed or handled per-method (Data Fabric, Maestro, Action Center, Orchestrator Processes).

**`FolderScopedService`** (`src/services/folder-scoped.ts`) extends `BaseService` and adds:
- `_getByFolder(endpoint, folderId, options?, transformFn?)` — helper that makes a GET request with a `FOLDER_ID` header, prefixes option keys with `ODATA_PREFIX`, and returns the `value` array from the response (optionally transforming each item).
- Use for: Orchestrator services where most operations require a folder ID header (Assets, Queues, Buckets).

**Decision rule**: If the API requires a folder ID header (`X-UIPATH-OrganizationUnitId`) for its main operations and follows the OData `value` array response pattern, extend `FolderScopedService`. Otherwise, extend `BaseService` and handle folder context explicitly per method using `createHeaders()`.

### OperationResponse pattern

Mutation methods that change state but don't return a modified entity use `OperationResponse<TData>` (from `src/models/common/types.ts`):

```typescript
interface OperationResponse<TData> {
  success: boolean;
  data: TData;
}
```

**When to use:**
- Lifecycle operations (cancel, pause, resume, close, reopen) — wrap the API response: `return { success: true, data: response.data }`. Failures throw exceptions rather than returning `success: false`.
- Bulk assignment/unassignment operations where the API returns HTTP 200 even on failure — use `processODataArrayResponse()` from `src/utils/object.ts` to check the error array: empty array → `{ success: true, data: requestData }`, populated array → `{ success: false, data: errorDetails }`.

**When NOT to use:** `getAll()`, `getById()`, `create()`, and any method that returns entity data directly.

## Common review pitfalls (enforce these)

### Naming
- **Use "Options" not "Request"** for parameter types. The SDK uses `{Entity}{Operation}Options` everywhere — never `{Entity}{Operation}Request`.
- **Method names**: use singular for single-item operations (`insertRecordById`), plural for batch (`insertRecordsById`). Prefer plurals over `batch` prefix.
- **Endpoint param names**: use consistent naming across endpoints (e.g., always `instanceId`, not sometimes `id` and sometimes `instanceId`). Avoid redundancy — under a `CASE` group, use `REOPEN` not `REOPEN_CASE`.

### JSDoc quality (these become the public docs)
- **Link response types** with `{@link TypeName}` in every method's JSDoc.
- **Show how to get prerequisite IDs** — if a method takes `entityId`, show the user how to obtain it (e.g., "First, get entities with `entities.getAll()`"). Reviewers consistently flag missing prerequisite steps.
- **Use `<paramName>` placeholder convention** for IDs in examples (e.g., `<entityId>`, `<taskId>`, `<folderId>`).
- **Use camelCase in examples** — write `id` not `Id`, matching the SDK's response format after transformation.
- **Keep JSDoc in sync with method names** — if a method is renamed, update every `@example` and description that references the old name.

### Types and safety
- **Mark optional fields as optional** in type interfaces. Don't make everything required if the API sometimes omits them.
- **Avoid `as unknown as`** type casts — refactor to make types flow naturally.
- **Use enums** for fixed sets of values; don't leave them as raw strings/numbers. Ensure enum exports include runtime values, not just types.
- **Extend existing option types** to avoid duplicating fields (e.g., extend `CaseInstanceOperationOptions` instead of re-declaring `comment`).
- **No misleading fallbacks** — if a parameter is required, don't write `param || {}`.

### Endpoints
- **Group nested endpoints logically** in the constants object (e.g., `ENTITY.ATTACHMENT.DOWNLOAD` not a flat list).
- **Use string constants for HTTP methods** (`'GET'`, `'POST'`) — don't hardcode raw strings in service methods. Use existing constants.

### Tests
- **Test descriptions must match what's being tested** — `'should call entity.insert'` is wrong if it tests `insertRecord()`.
- **Type request objects in tests** — don't leave them as untyped objects.
- **Use existing test constants** from `tests/utils/constants/` (e.g., `MAESTRO_TEST_CONSTANTS.TEST_COMMENT`) instead of hardcoding values.
- **Verify bound methods exist on response objects** — when `getById` returns an entity, test that the attached methods (e.g., `entity.cancel()`) work.
- **Remove unused mock methods** — if deprecated methods aren't tested, don't include them in mock objects.
- **Extract repeated logic** into shared helpers; don't duplicate code.
- **Test both success and error scenarios** for every public method.
- **Use Arrange-Act-Assert pattern** and reset mocks in `afterEach`.
- **Coverage**: 80% minimum for new code, 100% for critical paths (auth, API calls).

### Docs sync
- **`docs/oauth-scopes.md`** must be updated in the same PR as any method addition or rename. Group related services together (e.g., ChoiceSets under Entities, not separately).

## Documentation

JSDoc comments in `src/models/{domain}/*.models.ts` are the **source of truth for the public API docs site**. TypeDoc (`typedoc.json`) runs on `src/index.ts`, which re-exports all models. The generated markdown lands in `docs/api/` and is served by MkDocs Material.

What to know:
- **`{Entity}ServiceModel` interfaces** are the main API reference pages (e.g., `TaskServiceModel` → `docs/api/interfaces/TaskServiceModel.md`). Each method's JSDoc becomes a section with description, params, return type, and code examples.
- Use `@example` with fenced TypeScript code blocks — these render as copyable snippets on the docs site.
- Use `@param`, `@returns`, and `{@link TypeName}` for cross-referencing types.
- Tag internal-only code with `@internal` or `@ignore` to exclude it from generated docs (`excludeTags` in typedoc.json).
- Private (`#field`) and protected members are excluded from docs (`excludePrivate: true`, `excludeProtected: true`).
- `*.types.ts` exports (raw interfaces, enums, options types) also appear in generated docs since they're re-exported through `src/models/{domain}/index.ts` → `src/index.ts`. Keep their JSDoc clean.
- When adding a new method, update `docs/oauth-scopes.md` with the required OAuth scope for that method. Every service method must have its scope listed there.
- Run `npm run docs:api` to regenerate. A post-process step renames the entity interface doc for cleaner URLs.
- The MkDocs `llmstxt` plugin also generates `llms-full-content.txt` from the ServiceModel pages for LLM consumption.

## Build details

- **Rollup** builds ESM (`.mjs`), CJS (`.cjs`), UMD (`.umd.js`), and `.d.ts` per module.
- Config: `rollup.config.js`. Custom `rewriteDtsImports` plugin normalizes core imports in declaration files.
- TypeScript target: ES2020, strict mode, `experimentalDecorators: true`.
- Node.js requirement: 18.x or higher.

## Anti-patterns

- **Don't bypass base service classes** — never directly instantiate HTTP clients; use `this.get()`, `this.post()` from BaseService.
- **Don't use `any` type** — use `unknown` then validate if type is truly unknown.
- **Don't skip transformations** — never return raw API responses; apply applicable steps from the transformation pipeline.
- **Don't implement pagination manually** — always use `PaginationHelpers.getAll()`.
- **Don't export internal types** — `*.internal-types.ts` files must never be re-exported through barrel exports.
- **Don't forget OData prefixes** — `{ filter: "..." }` must become `{ "$filter": "..." }` via `addPrefixToKeys()`.
- **Don't leave unused code** — unused imports, variables, redundant constructors that only call `super()`. Linter (oxlint) catches these.
- **Don't commit sensitive files** — `.env`, `credentials.json`, `*.key`, `*.pem`, hardcoded API keys/tokens. See "Security" section below.

## Security

**Files that must NEVER be committed:**
- `.env`, `.env.local`, `.env.*.local`
- `credentials.json`, `secrets.json`
- `*.key`, `*.pem`, `*.p12`
- `.aws/credentials`
- Any file containing API keys, tokens, passwords, or connection strings

**Rules:**
- Never hardcode secrets — use `process.env.VARIABLE_NAME`
- Never log sensitive information
- Error messages must not expose internal details (no stack traces with internal paths)

**If secrets are accidentally committed:**
1. Do NOT merge the PR
2. Rotate all exposed secrets immediately
3. Remove from commit history (force push to branch only, never to main/master)
4. Contact team lead, document for security review

## Git workflow

- Branch from `develop`, PR into `develop`. `main` is release branch.
- CI runs on PRs: install → typecheck → test with coverage → build (`.github/workflows/pr-checks.yml`).
- Publishing: manual workflow_dispatch → builds → publishes to GitHub Packages + npm (`@uipath/uipath-typescript`).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint): `<type>(<scope>): <subject>`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### Jira ticket requirements

Every PR must have a Jira ticket:
- Include in PR title: `feat: add feature name [PLT-12345]`
- Link in PR body: `Jira Ticket: [PLT-12345](https://uipath.atlassian.net/browse/PLT-12345)`
- If no ticket exists, request one before submitting. For urgent fixes, get approval from team lead.

### PR description template

````markdown
## Summary
[Brief description of what and why]

## Changes
- Bullet point list of changes

## Tests
- All XXX unit tests pass
- Added X new test cases covering [scenarios]

## Usage (if applicable)
```typescript
// Code example showing how to use the new feature
```

## Is this a breaking change?
[Yes/No — if yes, explain impact and migration path]

## Related
- Jira Ticket: [PLT-XXXXX](https://uipath.atlassian.net/browse/PLT-XXXXX)
````

### Pre-submit checklist

- [ ] No `.env` or credential files in commits
- [ ] Jira ticket linked in PR title and description
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] No unused variables or imports
- [ ] New code has tests (80%+ coverage)
- [ ] JSDoc updated for new/changed public methods
- [ ] `docs/oauth-scopes.md` updated if methods added/renamed
- [ ] Breaking changes documented with migration path

## PR review checklist

### Critical (check first)
- [ ] No sensitive files committed (`.env`, credentials, keys)
- [ ] No hardcoded secrets in code
- [ ] Jira ticket linked
- [ ] All tests pass
- [ ] Breaking changes stated and migration path documented if applicable

### Architecture & types
- [ ] Services extend `BaseService` or `FolderScopedService`
- [ ] Models separated: `types.ts`, `models.ts`, `constants.ts`, `internal-types.ts`
- [ ] No `any` types; enums export runtime values
- [ ] No circular dependencies

### Transformations
- [ ] Correct pipeline order: case → field → value
- [ ] Each step justified by actual API response shape
- [ ] Field maps contain only semantic renames, not case-only entries

### Pagination
- [ ] Uses `PaginationHelpers.getAll()` (not manual implementation)
- [ ] `cursor` and `jumpToPage` never used together
- [ ] OData parameters prefixed with `$` (except documented exclusions)
- [ ] Correct pagination type (OFFSET/TOKEN) for the API

### Testing
- [ ] Both success and error scenarios covered
- [ ] Test descriptions match what's actually tested
- [ ] Existing test constants and shared mocks reused
- [ ] Bound methods on response objects verified

### Documentation
- [ ] JSDoc with `@param`, `@returns`, `@example`, `{@link}`
- [ ] Prerequisite IDs shown in examples
- [ ] `docs/oauth-scopes.md` updated
- [ ] CHANGELOG.md updated for user-facing changes
