---
name: sdk-service-dev
description: Use when adding, modifying, or reviewing SDK services, methods, types, or models in the UiPath TypeScript SDK. Covers file structure, type naming, response transforms, pagination setup, method binding, OData patterns, headers, error handling, endpoint conventions, testing, and documentation requirements.
---

# SDK Service Development Guide

Guide for adding, modifying, or reviewing services in `@uipath/uipath-typescript`. Every pattern here is enforced in code review.

**Detailed references:** [onboarding](references/onboarding.md) | [transforms](references/transforms.md) | [pagination](references/pagination.md) | [testing](references/testing.md) | [e2e-testing](references/e2e-testing.md) | [jsdoc](references/jsdoc.md)

## NEVER Do

Every item below has caused rejected PRs. Each has a reason — not arbitrary style.

### Naming
- **NEVER use "Request" for parameter types** — always "Options". The entire SDK uses `{Entity}{Operation}Options`. Using "Request" creates inconsistency and confuses the public API. (`TaskAssignmentOptions`, not `TaskAssignmentRequest`)
- **NEVER use `batch` prefix** for batch methods — use plural names instead. `insertRecordsById`, not `batchInsertRecords`. The SDK convention is singular/plural to distinguish cardinality.

### Types
- **NEVER use `as unknown as` type casts** — refactor to make types flow naturally. Casts hide real type errors and break when upstream types change.
- **NEVER make all fields required** if the API sometimes omits them — mark optional fields as optional. Over-requiring causes runtime `undefined` access on fields the API didn't return.
- **NEVER leave raw strings/numbers for fixed value sets** — use enums. Raw values lose type safety and autocomplete. If the API returns `1`, `2`, `3` for status, map them to a `Status` enum.
- **NEVER duplicate fields across option types** — extend existing ones. If `CaseInstanceOperationOptions` already has `comment`, extend it instead of re-declaring.
- **NEVER write `param || {}` for required parameters** — this hides bugs by silently accepting missing required data at call sites.

### Transforms
- **NEVER add case-only entries to `{Entity}Map`** — field maps are for semantic renames only (`creationTime` → `createdTime`). Case conversion (`CreationTime` → `creationTime`) is handled by `pascalToCamelCaseKeys()`. Mixing them causes double-conversion bugs and makes the map lie about its purpose.
- **NEVER add transform steps without checking the actual API response first** — if the API already returns camelCase, don't add `pascalToCamelCaseKeys()`. If it doesn't return raw enum codes, don't add `applyDataTransforms()`. Each step must be justified by what the API actually sends.

### Method binding
- **NEVER bind `getAll()`, `getById()`, `create()`** to response objects — these are service-level entry points, not entity operations. Binding them creates circular nonsense (an entity that retrieves itself).
- **NEVER add `{Entity}Methods` to read-only services** — Assets, Buckets, Queues, Processes, ChoiceSets, Cases, ProcessIncidents have no mutations, so no methods to bind.

### Internal types
- **NEVER re-export `internal-types.ts` through index.ts** — these are private implementation details (raw API shapes, intermediate parsing types). Re-exporting pollutes the public API and creates breaking-change risk when internal formats change.

### Endpoints
- **NEVER hardcode HTTP method strings in service methods** — use existing constants. Hardcoded strings drift and miss centralized changes.
- **NEVER use inconsistent param names** across endpoints in the same group — if one endpoint uses `instanceId`, all should. Mixing `id`/`instanceId` creates confusion when reading endpoint constants.
- **NEVER use redundant names** in nested groups — under a `CASE` group, use `REOPEN` not `REOPEN_CASE`. The group context already provides the prefix.

### OperationResponse
- **NEVER use `OperationResponse` for `getAll()`, `getById()`, `create()`** — these return entity data directly. `OperationResponse` is only for state-change operations (cancel, pause, resume) and bulk OData operations with ambiguous success.

### Tests
- **NEVER write test descriptions that don't match the code** — `'should call entity.insert'` is wrong if testing `insertRecord()`. Mismatched descriptions make failures misleading.
- **NEVER hardcode test values** — use existing constants from `tests/utils/constants/`. Hardcoded values drift and hide which test is using which fixture.
- **NEVER leave unused mock methods in mock objects** — dead mocks obscure what the test actually exercises and accumulate as the API evolves.

### Docs
- **NEVER skip `docs/oauth-scopes.md` when adding a method** — every public method needs its scope listed in the same PR. Missing scopes break the OAuth integration guide.
- **NEVER skip `@track()` decorator** on public service methods — telemetry gaps are invisible until production debugging, when they're expensive.
- **NEVER use PascalCase in JSDoc examples** — write `id` not `Id`. Examples must match the SDK's post-transform response format or users will write broken code.

## Onboarding a New API — Decision Trees

See [references/onboarding.md](references/onboarding.md) for full placement patterns, response design guide, build system checklist, binding examples, and the DX philosophy.

**What the user provides:** (1) Swagger/OpenAPI spec or API docs URL, (2) which endpoints to onboard. The agent handles everything else — token extraction, calling live endpoints, inspecting responses, making design decisions, writing code.

**Step 0:** Use browser to get a bearer token from `alpha.uipath.com` via the "Bearer Token Extractor" Chrome extension, then curl each endpoint to capture raw JSON responses. Don't design from docs alone — real responses are the ground truth.

### SDK Response Design

Before anything else, inspect the raw API response and decide what the SDK type should look like.

```
For each field in the raw API response:
  │
  Is it internal metadata, storage metrics, config flags, or validation artifacts?
  YES → DROP it. Don't include in SDK type. (Raw shape goes in internal-types.ts)
  │
  NO → Does the field name break SDK conventions?
       (wrong case, UTC suffix, platform jargon like organizationUnitId)
       YES → RENAME it via {Entity}Map in constants.ts
       NO  → KEEP as-is
```

```
For the response structure as a whole:
  │
  Is the shape untyped/flat where it should be structured?
  (e.g., flat key-value map instead of typed array with metadata)
  YES → RESHAPE in the service method. Build the new structure manually.
  │
  Is context missing that would require the developer to make extra API calls?
  (e.g., only element IDs but no human-readable names)
  YES → ENRICH by fetching additional context (e.g., BPMN XML).
        Always degrade gracefully if enrichment source fails.
```

Different endpoints for the same service may need different transform pipelines — inspect each independently.

### Service Placement

```
Is this API a sub-resource of an existing entity?
(instances, incidents, history, attachments OF a parent)
  │
  YES → Hierarchical Sub-Service
  │     File inside parent's folder. Shares parent's import path.
  │     Ex: ProcessInstances inside maestro/processes/
  │
  NO → Is it related to an existing service? (same domain, same audience)
       │
       YES → Would a developer commonly use one without the other?
       │     │
       │     OFTEN YES → Independent Root Service
       │     │            Own import path + rollup entry.
       │     │            Ex: Assets, Queues (both Orchestrator, separate imports)
       │     │
       │     OFTEN NO  → Domain-Grouped Service
       │                  Sibling file, shared import path. No runtime dependency.
       │                  Ex: ChoiceSets with Entities (both Data Fabric, one import)
       │
       NO → Independent Root Service
```

**Existing service map:**

| Import path | Services | Pattern |
|-------------|----------|---------|
| `/entities` | Entities, ChoiceSets | Domain-grouped (Data Fabric peers) |
| `/tasks` | Tasks | Independent root |
| `/assets`, `/queues`, `/buckets`, `/processes` | Assets, Queues, Buckets, Processes | Independent root (Orchestrator) |
| `/cases` | Cases, CaseInstances | Hierarchical (Cases → CaseInstances) |
| `/maestro-processes` | MaestroProcesses, ProcessInstances, ProcessIncidents | Hierarchical (Process → Instance → Incident) |

### Method Binding

The core DX rule: **a developer should never extract an ID from a response just to pass it back to another method.** Bound methods capture all identifying context (id, folderId, folderKey) from the response object and remove those params from the method signature.

```
For each method in the new API:
  │
  Does it operate ON a specific entity already retrieved?
  │
  YES → BIND IT
  │     Capture all context (id, folderId, folderKey) from response object.
  │     Remove captured params from signature. Keep data/options params.
  │     Service-level: insertRecordById(id, data) → Bound: insertRecord(data)
  │
  NO → DON'T BIND — keep as service-level method
       Entry points (getAll, getById, create), cross-entity queries
```

## File Structure

Each domain needs 3 files in `src/models/{domain}/`:

| File | Contents |
|------|----------|
| `{domain}.types.ts` | Public interfaces, options types, enums (re-exported via index.ts) |
| `{domain}.constants.ts` | Field maps, status maps, expand defaults, pagination constants |
| `{domain}.models.ts` | `{Entity}ServiceModel`, `{Entity}Methods`, composed response type, `create{Entity}WithMethods()` factory |

Optional: `{domain}.internal-types.ts` for private types (raw API shapes, intermediate parsing types, internal enums). Never re-exported.

Service implementation goes in `src/services/{area}/{domain}/`, endpoints in `src/utils/constants/endpoints.ts`, pagination constants in `src/utils/constants/common.ts`.

**Reference example:** Action Center Tasks — types in `src/models/action-center/tasks.types.ts`, constants in `tasks.constants.ts`, models in `tasks.models.ts`, implementation in `src/services/action-center/tasks.ts`.

## Type Naming Quick Reference

| Pattern | Use |
|---------|-----|
| `{Entity}GetResponse` / `GetAllResponse` | Read responses |
| `{Entity}InsertResponse` / `UpdateResponse` / `DeleteResponse` | Mutation responses |
| `Raw{Entity}GetResponse` | Internal shape before method attachment (in `types.ts`) |
| `{Entity}GetResponse = Raw... & {Entity}Methods` | Final type with bound methods (in `models.ts`) |
| `{Entity}GetAllOptions` / `GetByIdOptions` / `{Operation}Options` | Always "Options" — never "Request" |

Compose list options with `RequestOptions & PaginationOptions & { ... }`. Base types from `src/models/common/types.ts`: `BaseOptions`, `RequestOptions`, `OperationResponse<TData>`.

Method names: **singular** for single-item ops (`insertRecordById`), **plural** for batch (`insertRecordsById`). Prefer plurals over `batch` prefix.

## BaseService vs FolderScopedService — Decision Tree

```
Does the API require X-UIPATH-OrganizationUnitId header
AND return OData value arrays?
  YES → extend FolderScopedService (src/services/folder-scoped.ts)
        Uses: _getByFolder(endpoint, folderId, options?, transformFn?)
        Examples: Assets, Queues, Buckets
  NO  → extend BaseService (src/services/base.ts)
        Handle folder context per-method with createHeaders()
        Examples: Data Fabric, Maestro, Action Center, Orchestrator Processes
```

**Headers:** `createHeaders()` from `src/utils/http/headers.ts`. Orchestrator uses `createHeaders({ [FOLDER_ID]: folderId })` (numeric). Maestro uses `createHeaders({ [FOLDER_KEY]: folderKey })` (string). Import constants from `src/utils/constants/common`.

## Response Transforms — Decision Tree

See [references/transforms.md](references/transforms.md) for full pipeline details, standard field renames, and outbound transform patterns.

```
Check the raw API response, then apply steps in order (skip any that don't apply):

1. PascalCase keys?        → pascalToCamelCaseKeys(response.data)
2. Fields need renaming?   → transformData(data, {Entity}Map)       [semantic renames ONLY]
3. Raw enum codes?         → applyDataTransforms(data, { field, valueMap })
4. Entity has operations?  → create{Entity}WithMethods(data, this)
```

All transform functions in `src/utils/transform.ts`. Field maps are for semantic renames only — never case conversion.

## Method Attachment — Implementation

For the binding decision tree and DX rationale, see [Onboarding: Method Binding](#method-binding) above and [references/onboarding.md](references/onboarding.md).

**Implementation pattern:** `create{Entity}Methods(rawData, service)` returns bound async methods that capture all identifying context (id, folderId, folderKey) from the response. `create{Entity}WithMethods(rawData, service)` merges via `Object.assign({}, rawData, methods)`. Methods validate required fields (`if (!data.id) throw new Error(...)`) before delegating.

Read-only services have no `{Entity}Methods`: Assets, Buckets, Queues, Processes, ChoiceSets, Cases, ProcessIncidents.

## Pagination — Decision Tree

See [references/pagination.md](references/pagination.md) for constants definitions, `excludeFromPrefix` rules, and step-by-step setup.

```
Does the API return paginated lists?
  NO  → use raw HTTP call
  YES → use PaginationHelpers.getAll() from src/utils/pagination/helpers.ts
        │
        What pagination style?
        ├─ OData ($top/$skip/$count, value array, @odata.count)
        │  → PaginationType.OFFSET — supports jumpToPage
        │    Reuse ODATA_PAGINATION + ODATA_OFFSET_PARAMS if standard shape
        │
        └─ Continuation token (named array, token field)
           → PaginationType.TOKEN — NO jumpToPage
             Define service-specific constants
```

Return type: conditional via `HasPaginationOptions<T>` → `PaginatedResponse<T>` or `NonPaginatedResponse<T>`.

## OperationResponse Pattern

`OperationResponse<TData>` from `src/models/common/types.ts`: `{ success: boolean, data: TData }`.

| Scenario | Pattern |
|----------|---------|
| Lifecycle ops (cancel, pause, resume, close, reopen) | `{ success: true, data: response.data }` — failures throw |
| Bulk OData ops (assign, unassign) with 200-on-failure | `processODataArrayResponse()` from `src/utils/object.ts` |
| `getAll()`, `getById()`, `create()` | Don't use — return entity data directly |

## Endpoint Constants

In `src/utils/constants/endpoints.ts`, grouped by service. All objects use `as const`.

- Static: `GET_ALL: '${BASE}/api/v1/entities'`
- Parameterized: `GET_BY_ID: (id: string) => '${BASE}/api/v1/entities/${id}'`
- Nested: `ATTACHMENT: { DOWNLOAD: (id, attachmentId) => ... }`

Rules: consistent param names across endpoints, no redundancy (under `CASE` group use `REOPEN` not `REOPEN_CASE`).

## Export Naming

Internal class: `{Entity}Service`. Public alias in `index.ts`: plural noun (`EntityService as Entities`). Both exported. When adding a service, update `package.json` `exports` + `rollup.config.js`.

## Testing & Documentation

See [references/testing.md](references/testing.md) for vitest setup, mock patterns, and test rules.

See [references/jsdoc.md](references/jsdoc.md) for JSDoc conventions, telemetry decorators, and required doc file updates.

## E2E Validation

See [references/e2e-testing.md](references/e2e-testing.md) for the full workflow.

After implementing a new service, validate it end-to-end in `samples/process-app-v1`:

```
1. npm run build && npm version 1.0.0-test.1 --no-git-tag-version && npm pack
2. Update sample app package.json → install new tarball
3. Add temporary test component — import new service, call every method, console.log responses
4. npm run dev → use Playwright to navigate, trigger tests, read console output
5. Verify: imports resolve, fields are camelCase, dropped fields absent,
   bound methods exist, pagination shape correct
6. Clean up — remove test component, revert versions, delete tarball, don't commit
```

## Key Source Files

| Pattern | File |
|---------|------|
| BaseService / FolderScopedService | `src/services/base.ts`, `src/services/folder-scoped.ts` |
| Transform functions | `src/utils/transform.ts` |
| Pagination helpers & types | `src/utils/pagination/helpers.ts`, `types.ts`, `internal-types.ts` |
| Pagination & OData constants | `src/utils/constants/common.ts` |
| Endpoint constants | `src/utils/constants/endpoints.ts` |
| Headers utility | `src/utils/http/headers.ts` |
| Common types | `src/models/common/types.ts` |
| OData response utility | `src/utils/object.ts` |
| Error types | `src/core/errors/` |
| SDK internals | `src/core/internals/` |
