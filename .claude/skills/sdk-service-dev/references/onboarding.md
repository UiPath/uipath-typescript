# Onboarding a New Service API

Before writing any code, you need to make four architecture decisions: **what the SDK response looks like**, **where the service lives**, **what it exports**, and **what gets bound to response objects**. Each decision affects the developer experience.

## What the user provides

The user provides **two things**:
1. **API spec** — a Swagger URL, OpenAPI JSON, or API documentation link for the endpoints being onboarded
2. **Which endpoints** — which specific endpoints from the spec to onboard into the SDK

Everything else — inspecting raw responses, making design decisions, writing code — is the agent's job.

## Step 0: Inspect the live API

Before making any design decisions, call the actual API endpoints to see what they return. Don't design from documentation alone — the real response often differs from the spec (extra fields, different casing, unexpected nesting).

### How to get a bearer token

1. Use the browser automation tools to navigate to `alpha.uipath.com`
2. The user has a **"Bearer Token Extractor"** Chrome extension installed — use it to copy the `USERACCESSTOKEN`
3. Store the token for use in curl calls

### How to call endpoints

Use curl via the Bash tool with the extracted bearer token:

```bash
curl -s -H "Authorization: Bearer <token>" \
  "https://alpha.uipath.com/<api-endpoint>" | jq .
```

For each endpoint the user wants to onboard:
1. Call the endpoint with sample/test data
2. Capture the full raw JSON response
3. Note: key casing (PascalCase vs camelCase?), field names, nesting structure, enum values (codes vs strings?), pagination shape (OData? token-based?)
4. Compare to what the Swagger/spec says — flag any discrepancies

Save the raw responses — they're the ground truth for all design decisions that follow.

## Step 1: Understand the API

With the raw responses and spec in hand, answer these questions:

1. **What domain does it belong to?** — Data Fabric, Orchestrator, Maestro, Action Center, or a new domain?
2. **What is it a resource of?** — Is it a standalone top-level resource, or a sub-resource/related concept of an existing entity?
3. **What operations does it support?** — CRUD only (read-only)? Lifecycle state changes? Bulk operations?
4. **Does it have its own identity?** — Does the API return entities with their own IDs, or does it always operate in the context of a parent entity?

## Step 2: Design the SDK Response

This is the most important design step. The raw API response is rarely what developers should see. Compare the raw response to what would make sense as a typed SDK interface, then decide what to keep, drop, rename, reshape, or enrich.

### Field filtering — what to drop

Not every API field belongs in the SDK. Drop fields that are:

| Category | Drop because | Real example (ChoiceSets) |
|----------|-------------|---------------------------|
| Internal system metadata | Implementation detail, not useful to SDK consumers | `entityTypeId`, `entityType`, `isModelReserved` |
| Storage/infrastructure metrics | Operational concern, not application logic | `storageSizeInMB`, `usedStorageSizeInMB`, `recordCount` |
| Internal config flags | SDK doesn't expose platform configuration | `isRbacEnabled` |
| Validation artifacts | Internal state not relevant after creation | `invalidIdentifiers` |

**How to implement:** Define `Raw{Entity}Response` in `internal-types.ts` with ALL API fields. Define the public type in `types.ts` with only the fields developers need. The transform step in the service maps from raw → public, and dropped fields simply aren't assigned.

**Decision rule:** For each raw API field, ask: "Would a developer building an application need this field?" If the answer is "only someone debugging the platform internals" — drop it.

### Field renaming — what to rename

Rename fields for SDK-wide consistency, not API-specific naming:

| Pattern | API returns | SDK exposes | Why |
|---------|-------------|-------------|-----|
| Time fields: past participle | `createTime`, `updateTime` | `createdTime`, `updatedTime` | SDK convention: all timestamps use past participle |
| Time fields: strip UTC suffix | `errorTimeUtc`, `startedTimeUtc` | `errorTime`, `startedTime` | All SDK times are UTC — suffix is redundant noise |
| Folder fields: clearer names | `organizationUnitId` | `folderId` | Platform jargon → domain term |

**How to implement:** Add entries to `{Entity}Map` in `{domain}.constants.ts`. Apply via `transformData(data, {Entity}Map)` in the service.

**Decision rule:** If the API name is unclear, uses platform jargon, or breaks the SDK's naming conventions for time/folder/ID fields — rename it. If the API name is already clear and consistent — leave it.

### Structural transformation — when to reshape

Sometimes the API response structure itself isn't right for the SDK. The response shape should match how developers think about the data, not how the platform stores it.

**Real example (Maestro Variables):**

```
API returns:    { globals: { "var_123": "value", "var_456": 42 } }
                → Flat key-value map. Developer can't discover variable names, types, or sources.

SDK returns:    { globalVariables: [
                    { id: "var_123", name: "userInput", type: "string", source: "Start Process", value: "value" },
                    { id: "var_456", name: "retryCount", type: "integer", source: "Main Loop", value: 42 }
                  ] }
                → Typed array with metadata. Developer can iterate, filter by type, display in UI.
```

This isn't a field rename — it's a completely different structure. The SDK reshapes the flat `globals` object into an enriched `GlobalVariableMetaData[]` array by parsing BPMN XML.

**When to reshape:**
- API returns an untyped or weakly-typed structure (flat objects, generic maps) that hides semantic meaning
- API returns nested data that could be flattened for easier access
- API spreads related data across multiple fields that belong together as an array of objects
- API returns a list but the SDK consumer needs a lookup map, or vice versa

**How to implement:** Structural transforms happen in the service method body — they're custom logic, not covered by the standard `transformData`/`pascalToCamelCaseKeys` pipeline. Build the new shape manually in the service.

### Enrichment — adding fields the API doesn't return

Sometimes the raw API response lacks context that developers need. The SDK can make additional API calls to enrich the response with computed or derived fields.

**Real examples:**

| Service | Enriched fields | Source | What it adds |
|---------|----------------|--------|--------------|
| ProcessIncidents | `incidentElementActivityType`, `incidentElementActivityName` | BPMN XML parsing | Human-readable names for the process element that caused the incident (e.g., "Service Task" instead of "ServiceTask_abc123") |
| Variables | `name`, `type`, `elementId`, `source` on each variable | BPMN XML parsing | Variable metadata — name, data type, and which process element defines it |

**Enrichment rules:**

1. **Always degrade gracefully.** If the enrichment source fails (BPMN fetch fails, parsing fails), return the response without enrichment — never throw. The primary data is still valuable.

```typescript
// Good: graceful degradation
try {
  const bpmnXml = await this.getBpmn(instanceId, folderKey);
  variableMetadata = this.parseBpmnVariables(bpmnXml);
} catch {
  // Continue without metadata — globalVariables will lack enrichment
}
```

2. **Optimize repeated fetches.** If enriching a list of items that share a common context (same instanceId), fetch the context once and reuse it. ProcessIncidents groups incidents by instanceId to avoid redundant BPMN fetches.

3. **Put enriched fields in the public type, not the raw type.** Enriched fields don't exist in `Raw{Entity}Response` (they're not from the API). They only appear in the public `{Entity}GetResponse` type.

4. **Hide enrichment internals.** Put parsing types and intermediate structures in `internal-types.ts` (e.g., `BpmnVariableMetadata`). The developer sees the enriched result, not the machinery.

**When to enrich:** The API response is technically complete but missing context that would require the developer to make their own additional API calls. If you find yourself thinking "the developer would need to call another API to make sense of this field" — that's a signal to enrich.

### Per-endpoint transform pipelines

Different endpoints for the same service may need different transform pipelines. Don't assume one pipeline fits all methods.

**Real example (ChoiceSets):**

| Method | API response format | Pipeline |
|--------|-------------------|----------|
| `getAll()` | Already camelCase | `transformData(data, EntityMap)` only (rename `createTime` → `createdTime`) |
| `getById()` | PascalCase (`Id`, `Name`, `CreateTime`) | `pascalToCamelCaseKeys()` → then `transformData(data, EntityMap)` |

**Why they differ:** The `getAll()` endpoint returns camelCase natively. The `getById()` endpoint returns PascalCase in its `jsonValue` array. Each endpoint gets only the transforms it actually needs.

**Decision rule:** Inspect each endpoint's raw response independently. Apply only the transform steps justified by what that specific endpoint returns.

### Design checklist

Before writing any code, document these decisions for the new API:

```
For each endpoint:
  □ Raw API response shape (call it, capture the JSON)
  □ Which fields to DROP (with category: metadata / metrics / config / validation)
  □ Which fields to RENAME (with the standard rename table)
  □ Whether structural RESHAPING is needed (what shape and why)
  □ Whether ENRICHMENT is needed (what extra context, from where)
  □ Which transform steps apply (case conversion? field map? enum map? method binding?)
  □ Put raw shape in internal-types.ts, public shape in types.ts
```

## Step 3: Decide Service Placement

The SDK has three placement patterns. Pick the one that fits.

### Pattern A: Independent Root Service

**When:** The API is a standalone resource with its own identity, no parent entity, and enough surface area to justify its own import path.

```
Import:  import { NewService } from '@uipath/uipath-typescript/new-service'
Files:   src/services/{area}/new-service/index.ts
Rollup:  own entry in serviceEntries
```

**Existing examples:** Each Orchestrator service — Assets (`/assets`), Queues (`/queues`), Buckets (`/buckets`), Processes (`/processes`). They're all in the same domain (Orchestrator) but have no runtime relationship, so each gets its own import path and rollup bundle.

**When to choose this:** The service can be used completely independently. A developer who only needs this API shouldn't have to import unrelated services.

### Pattern B: Domain-Grouped Service

**When:** The API is conceptually related to an existing service (same domain, similar audience) but has no runtime dependency on it. They share an import path for discoverability, not because one needs the other.

```
Import:  import { ExistingService, NewService } from '@uipath/uipath-typescript/existing'
Files:   src/services/{area}/new-service.ts  (sibling file, NOT nested folder)
Rollup:  shares entry point with existing service
```

**Existing examples:**
- **ChoiceSets + Entities** — both Data Fabric services, imported from `/entities`. ChoiceSets has zero runtime dependency on Entities. They're grouped because a developer working with Data Fabric entities will likely also need choice sets. Sibling files in `src/services/data-fabric/`.
- **Cases + CaseInstances** — both Maestro case management, imported from `/cases`. CaseInstances operates on running instances of case definitions.

**When to choose this:** The new service is a peer concept in the same domain. A developer working with the existing service would naturally reach for the new one too. But neither depends on the other at runtime.

**Key distinction from Pattern C:** Domain-grouped services are **sibling files** in the same directory. They don't have a parent-child relationship — they're co-exported peers.

### Pattern C: Hierarchical Sub-Service

**When:** The API is a sub-resource that only makes sense in the context of a parent entity. It operates on things that belong to the parent (instances, incidents, history).

```
Import:  import { ParentService, SubService } from '@uipath/uipath-typescript/parent'
Files:   src/services/{area}/parent/sub-service.ts  (file INSIDE parent's folder)
Rollup:  shares entry point with parent
```

**Existing examples:**
- **ProcessInstances + ProcessIncidents under MaestroProcesses** — imported from `/maestro-processes`. ProcessInstances are running instances OF a process. ProcessIncidents are failures WITHIN an instance. Files live inside `src/services/maestro/processes/`.
- **CaseInstances under Cases** — imported from `/cases`. A case instance is a running instance OF a case definition.

**When to choose this:** The sub-resource has a clear parent-child relationship. You can't meaningfully use the sub-resource without the parent context. "Get all incidents" doesn't make sense without "for which process?"

### Decision Tree

```
Is this API a sub-resource of an existing entity?
(instances, incidents, history, attachments OF a parent)
  │
  YES → Pattern C: Hierarchical Sub-Service
  │     File inside parent's folder. Shares parent's import path.
  │     Ex: ProcessInstances inside maestro/processes/
  │
  NO → Is it conceptually related to an existing service?
       (same domain, same audience, natural co-discovery)
       │
       YES → Would a developer use one without the other?
       │     │
       │     OFTEN YES → Pattern A: Independent Root Service
       │     │            Own import path, own rollup entry.
       │     │            Ex: Assets, Queues (both Orchestrator but independent)
       │     │
       │     OFTEN NO  → Pattern B: Domain-Grouped Service
       │                  Sibling file, shared import path.
       │                  Ex: ChoiceSets with Entities (both Data Fabric)
       │
       NO → Pattern A: Independent Root Service
            Own import path, own rollup entry.
```

### Build System Checklist

After choosing a pattern, wire it up:

| Step | Pattern A | Pattern B | Pattern C |
|------|-----------|-----------|-----------|
| Service file | New folder: `src/services/{area}/new-service/index.ts` | Sibling file: `src/services/{area}/new-service.ts` | File in parent folder: `src/services/{area}/parent/new-service.ts` |
| Models | New folder: `src/models/{domain}/` (3 files) | New folder: `src/models/{domain}/` (3 files) | New files in existing `src/models/{domain}/` |
| Area index.ts | New: `src/services/{area}/index.ts` | Add exports to existing area `index.ts` | Add exports to existing area `index.ts` |
| `rollup.config.js` | New entry in `serviceEntries` | No change (shares existing entry) | No change (shares existing entry) |
| `package.json` exports | New `"./{name}"` export entry | No change (shares existing export) | No change (shares existing export) |
| `src/index.ts` | Add re-export | Add re-export | Add re-export |

## Step 4: Design Method Binding

Method binding is the core DX feature. When a user calls `getById()`, the returned object should let them do things with that entity directly — without re-passing the ID.

### The DX principle

```typescript
// WITHOUT binding — developer passes IDs repeatedly
const entity = await entities.getById('<entityId>');
const records = await entities.getRecordsByEntityId('<entityId>', options);
await entities.insertRecordById('<entityId>', data);
await entities.deleteRecordById('<entityId>', '<recordId>');

// WITH binding — ID captured, methods on the object
const entity = await entities.getById('<entityId>');
const records = await entity.getRecords(options);      // entityId captured
await entity.insertRecord(data);                       // entityId captured
await entity.deleteRecord('<recordId>');                // entityId captured
```

The bound version is better because:
- The developer can't accidentally pass the wrong ID
- Method calls read like natural language: "this entity, insert a record"
- Autocomplete shows exactly what you can do with this entity
- No need to juggle IDs across multiple calls

### What to bind — decision per method

For each method in the API, ask:

```
Does this method operate ON a specific entity that was already retrieved?
  │
  YES → Does it need the entity's ID (or other context like folderId/folderKey)?
  │     │
  │     YES → BIND IT. Capture all required context from the response object.
  │     │     Remove captured params from the bound method's signature.
  │     │     Keep non-context params (data payloads, options) in the signature.
  │     │
  │     NO  → Unusual case. Probably still bind for discoverability.
  │
  NO → DON'T BIND. Keep as service-level method.
       Entry points (getAll, getById, create) and cross-entity queries (getUsers).
```

### What context to capture

Bound methods should capture **all identifying context** from the response object, not just the primary ID:

```typescript
// Tasks: captures BOTH id and folderId
async complete(options: TaskCompleteOptions) {
  if (!taskData.id) throw new Error('Task ID is undefined');
  if (!taskData.folderId) throw new Error('Folder ID is required');
  return service.complete(
    { type: options.type, taskId: taskData.id, data: options.data, action: options.action },
    taskData.folderId    // folderId also captured — developer doesn't need to know it
  );
}

// MaestroProcesses: captures processKey AND folderKey
async getIncidents() {
  if (!processData.processKey) throw new Error('Process key is undefined');
  if (!processData.folderKey) throw new Error('Folder key is undefined');
  return service.getIncidents(processData.processKey, processData.folderKey);
}
```

The goal: **the developer should never have to extract an ID from a response object just to pass it right back to another method.** If the response has the data, the bound method should use it.

### Service-level vs bound method naming

Both versions of a method exist — the service-level one (with ID) and the bound one (without). Convention:

| Service-level (on ServiceModel) | Bound (on entity object) |
|---------------------------------|--------------------------|
| `insertRecordById(id, data)` | `insertRecord(data)` |
| `getRecordsByEntityId(id, options)` | `getRecords(options)` |
| `cancel(instanceId)` | `cancel()` |
| `getIncidents(processKey, folderKey)` | `getIncidents()` |
| `complete(options, folderId)` | `complete(options)` |

Pattern: the bound name drops the "ById"/"ByEntityId" suffix and removes all ID parameters.

### Read-only services: no binding needed

If the API only supports read operations (getAll, getById, with expand/select/filter), there's nothing to bind. The entity response is just data — no operations to perform on it.

Current read-only services: Assets, Buckets, Queues, Processes, ChoiceSets, Cases, ProcessIncidents.

## Step 5: Onboarding Checklist

Once you've made the four decisions (response shape, placement, exports, binding), execute in this order:

1. **Understand the API response** — call it, inspect raw JSON. Note: PascalCase keys? Raw enum codes? Pagination style?
2. **Create model files** — `types.ts`, `constants.ts`, `models.ts` (and `internal-types.ts` if needed)
3. **Define endpoint constants** in `src/utils/constants/endpoints.ts`
4. **Define pagination constants** in `src/utils/constants/common.ts` (if paginated)
5. **Implement service class** — extend BaseService or FolderScopedService
6. **Wire up exports** — area `index.ts`, `src/index.ts`, `package.json`, `rollup.config.js`
7. **Write unit tests** — mirror src structure in `tests/unit/`
8. **Write JSDoc** — on `{Entity}ServiceModel` in `models.ts`
9. **Update docs** — `docs/oauth-scopes.md`, `docs/pagination.md` (if paginated)
10. **E2E validate in sample app** — build, pack, install in `samples/process-app-v1`, add temp test component, run dev server, validate with Playwright, clean up. See [e2e-testing.md](e2e-testing.md) for full workflow.
