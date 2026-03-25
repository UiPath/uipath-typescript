# Service & Coding Conventions

## Code style

- **camelCase**: variables, functions, methods (`getUserById`, `pageSize`)
- **PascalCase**: classes, interfaces, types, enums (`TaskService`, `TaskType`)
- **UPPER_SNAKE_CASE**: constants (`DEFAULT_PAGE_SIZE`, `TASK_ENDPOINTS`)
- **File names**: kebab-case for general files (`api-client.ts`), dot-separated for type/model files (`tasks.types.ts`, `tasks.models.ts`)
- Prefer `private` keyword over underscore prefix for private methods
- No `any` type — use `unknown` if truly unknown, then validate
- Mark optional fields as optional in type interfaces

## General conventions

- Services follow the pattern: extend `BaseService`, call `super(uiPath)`, use `this.get()` / `this.post()` etc.
- Types live in `src/models/{domain}/{domain}.types.ts`. Internal-only types go in `*.internal-types.ts`.
- Constants live in `src/utils/constants/`. Endpoints are split per domain in `src/utils/constants/endpoints/` (e.g., `data-fabric.ts`, `maestro.ts`, `orchestrator.ts`).
- Subpath exports: when adding a new service module, add entries to `package.json` `exports` and `rollup.config.js`.
- Every public service method must be decorated with `@track('ServiceName.MethodName')` for telemetry.
- Use named imports/exports (avoid default exports). Use barrel exports (`index.ts`) for public API. Never export internal types from barrel exports.

## Type naming

- **Response types**: `{Entity}GetResponse` for reads, `{Entity}GetAllResponse` for list-specific responses. Mutation responses: `{Entity}InsertResponse`, `{Entity}UpdateResponse`, `{Entity}DeleteResponse`, or generic `{Entity}OperationResponse`.
- **Raw types**: `Raw{Entity}GetResponse` for the internal shape before method attachment — these live in `*.types.ts`.
- **Final response type**: `type {Entity}GetResponse = Raw{Entity}GetResponse & {Entity}Methods` — defined in `*.models.ts`, combining raw data with bound methods.
- **Options types**: `{Entity}GetAllOptions`, `{Entity}GetByIdOptions`, `{Entity}{Operation}Options` (e.g., `TaskAssignmentOptions`, `ProcessInstanceOperationOptions`). Compose with `RequestOptions & PaginationOptions & { ... }` for list methods.
- **Common base types**: `BaseOptions` (expand, select), `RequestOptions` (extends BaseOptions with filter, orderby), `OperationResponse<TData>` (success + data) — all from `src/models/common/types.ts`.
- **Use "Options" not "Request"** for parameter types — never `{Entity}{Operation}Request`.

Method names: **singular** for single-item ops (`insertRecordById`), **plural** for batch (`insertRecordsById`). Prefer plurals over `batch` prefix.

**Singular vs batch patterns:**

| Aspect | Singular (e.g., `updateRecordById`) | Batch (e.g., `updateRecordsById`) |
|--------|--------------------------------------|-----------------------------------|
| Body type | `Record<string, any>` — ID is in the URL, not the body | `EntityRecord[]` — each item needs its own `Id` |
| `failOnFirst` | Not applicable — single item, nothing to fail-first on | Available as an option |
| URL pattern | `.../update/${recordId}` (ID in path) | `.../update-batch` (IDs in body) |

## Service model + method attachment pattern

Each service has 3 files in `src/models/{domain}/`:

1. **`{domain}.types.ts`** — raw interfaces (`Raw{Entity}GetResponse`), options types, enums
2. **`{domain}.constants.ts`** — field mapping (`{Entity}Map`), status mapping (`{Entity}StatusMap`), expand defaults
3. **`{domain}.models.ts`** — the service model interface (`{Entity}ServiceModel`), methods interface (`{Entity}Methods`), the composed response type (`Raw{Entity}GetResponse & {Entity}Methods`), and `create{Entity}WithMethods()` factory

The method attachment pattern:
- `create{Entity}Methods(rawData, service)` — returns an object of bound async methods that delegate to the service
- `create{Entity}WithMethods(rawData, service)` — merges raw data + methods via `Object.assign({}, rawData, methods)`
- Methods validate required fields (`if (!data.id) throw new Error(...)`) before delegating

## Method attachment (when to bind methods to response objects)

- **Not every service method gets bound.** Only bind methods that operate ON a specific entity after retrieval — state-changing operations (assign, cancel, complete, insert, update, delete) and contextual reads that need the entity's ID.
- **Never bind**: `getAll()`, `getById()`, `create()`, and cross-entity queries like `getUsers()`.
- **Read-only services don't bind at all** — Assets, Buckets, Queues, Processes, ChoiceSets, Cases, and ProcessIncidents have no `{Entity}Methods` interface.

## Response transformation pipeline

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

## Endpoint constants

Defined in `src/utils/constants/endpoints/` with separate files per domain (e.g., `data-fabric.ts`, `maestro.ts`, `orchestrator.ts`):

- Static endpoints: string constants — `GET_ALL: '${BASE}/api/v1/processes/summary'`
- Parameterized endpoints: arrow functions — `GET_BY_ID: (id: string) => '${BASE}/api/v1/instances/${id}'`
- Operation endpoints: `CANCEL: (id: string) => '${BASE}/api/v1/instances/${id}/cancel'`
- All objects use `as const`
- **Group nested endpoints logically** (e.g., `ENTITY.ATTACHMENT.DOWNLOAD` not flat).
- **Use consistent param names** across endpoints. Avoid redundancy.

## Pagination

**When to add:** Always check whether the API supports paginated responses. If so, use `PaginationHelpers.getAll()` from `src/utils/pagination/helpers.ts`.

**Two pagination types:**

- **`PaginationType.OFFSET`** — Offset-based. Commonly OData-style (items in `value`, count in `@odata.count`, params: `$top`, `$skip`, `$count`) but can also use non-OData params like `limit` and `start`. Supports `jumpToPage`. Use `ODATA_PAGINATION` and `ODATA_OFFSET_PARAMS` for OData APIs, or define service-specific constants for non-OData offset APIs.
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

## Export naming

- Internal class: `{Entity}Service` (e.g., `EntityService`, `TaskService`)
- Public alias in `index.ts`: plural noun (e.g., `EntityService as Entities`, `TaskService as Tasks`)
- Both names exported for backward compatibility

## Internal types (`*.internal-types.ts`)

Types in `{domain}.types.ts` are public (re-exported through barrel). Types in `{domain}.internal-types.ts` are private (imported only by service implementations).

**Put in `internal-types.ts`:** Raw API response shapes before transformation, intermediate parsing types, service-internal operation types, internal enums.

**Put in `types.ts`:** All types in public method signatures, `Raw{Entity}GetResponse` types that users compose with `{Entity}Methods`.

## OData prefix pattern

OData APIs require `$` prefix on query params. The SDK accepts clean camelCase keys and adds the prefix via `addPrefixToKeys()` from `src/utils/transform.ts`.

**Applied automatically by:** `PaginationHelpers.getAll()`.

**Apply manually in:** `getById()` methods accepting `BaseOptions` — `const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options))`.

## Headers utility

`createHeaders()` from `src/utils/http/headers.ts` builds headers from key-value pairs, filtering undefined.

- **Orchestrator**: `createHeaders({ [FOLDER_ID]: folderId })` — numeric folder IDs
- **Maestro**: `createHeaders({ [FOLDER_KEY]: folderKey })` — string folder keys

## BaseService

**`BaseService`** (`src/services/base.ts`): Authenticated HTTP methods, `createPaginationServiceAccess()`. All services extend this.

## Folder-scoped services

Some Orchestrator services (Assets, Queues, Buckets) require a `folderId` for operations. These services handle it inline:

- **`getById(id, folderId, ...)`** — sets the `X-UIPATH-OrganizationUnitId` header via `createHeaders({ [FOLDER_ID]: folderId })`
- **`getAll(options?)`** — passes `getByFolderEndpoint` to `PaginationHelpers.getAll()`, which switches endpoints based on whether `folderId` is in options

## OperationResponse pattern

```typescript
interface OperationResponse<TData> { success: boolean; data: TData; }
```

**Use for:** Lifecycle operations (cancel, pause, resume), bulk operations with error checking via `processODataArrayResponse()`.

**DO NOT use for:** `getAll()`, `getById()`, `create()`, methods returning entity data directly.
