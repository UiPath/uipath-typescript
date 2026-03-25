# Onboarding Reference — Design Decisions

Decision trees, examples, and patterns for onboarding SDK endpoints. Coding conventions and rules are always loaded via `agent_docs/` — this file covers only onboarding-specific decision guidance.

## SDK Response Design

For each field in the raw API response, decide: DROP, RENAME, KEEP, RESHAPE, or ENRICH.

```
For each field:
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
  YES → RESHAPE in the service method. Build the new structure manually.
  │
  Is context missing that would require the developer to make extra API calls?
  YES → ENRICH by fetching additional context (e.g., BPMN XML).
        Always degrade gracefully if enrichment source fails.
```

Different endpoints for the same service may need different transform pipelines — inspect each independently.

> **Convention reference:** The 4-step transform pipeline (pascalToCamelCaseKeys, transformData, applyDataTransforms, createWithMethods), how to decide which steps apply, and field map mechanics are in `agent_docs/conventions.md` § Response transformation pipeline. Type reuse rules and NEVER rules for transforms are in `agent_docs/rules.md` § Types and § Transforms.

### Field filtering — what to drop

Not every API field belongs in the SDK. Drop fields that are:

| Category | Drop because | Real example (ChoiceSets) |
|----------|-------------|---------------------------|
| Internal system metadata | Implementation detail, not useful to SDK consumers | `entityTypeId`, `entityType`, `isModelReserved` |
| Storage/infrastructure metrics | Operational concern, not application logic | `storageSizeInMB`, `usedStorageSizeInMB`, `recordCount` |
| Internal config flags | SDK doesn't expose platform configuration | `isRbacEnabled` |
| Validation artifacts | Internal state not relevant after creation | `invalidIdentifiers` |

**How to implement:** Define `Raw{Entity}Response` in `internal-types.ts` with ALL API fields. Define the public type in `types.ts` with only the fields developers need. The transform step in the service maps from raw → public, and dropped fields simply aren't assigned.

**Decision rule:** For each raw API field, ask: "Would a developer building an application need this field?" If the answer is "only someone debugging the platform internals" — drop it. Be prepared to justify each field kept to reviewers.

### Field renaming — what to rename

**Decision rule:** If the API name is unclear, uses platform jargon, or breaks SDK naming conventions — rename it. If already clear and consistent — leave it.

**Domain term renames:** Rename platform jargon to SDK consumer terms. Check existing `*.constants.ts` files for established renames (e.g., in Orchestrator, "release" = "process" from the SDK consumer's perspective, so `releaseName` → `processName`). Consistency with existing renames takes priority.

> **Convention reference:** Field map mechanics (`{Entity}Map`, `transformData`, standard field renames) and OData filter caveats for renamed fields are in `agent_docs/conventions.md` § Response transformation pipeline and § OData prefix pattern.

### Type design — enums and JSDoc

- **Add JSDoc descriptions to enum values** when the meaning isn't obvious from the name (e.g., `/** Includes Maestro orchestration */ ProcessOrchestration`).
- **Mark JSON string fields** with "JSON string" in JSDoc so users know to `JSON.parse()` (e.g., `/** JSON string — parse with \`JSON.parse()\` */ inputArguments?: string`).
- **String fields with known values** should be enums. If uncertain whether a field is a real enum or a server-side string conversion, check the backend source or ask the reviewer. Document when keeping as string intentionally.

> **Convention reference:** Type naming patterns and reuse rules are in `agent_docs/conventions.md` § Type naming. NEVER rules for types are in `agent_docs/rules.md` § Types.

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

### Per-endpoint transform pipelines — real example

**ChoiceSets:** `getAll()` returns camelCase natively → only needs `transformData(data, EntityMap)`. But `getById()` returns PascalCase → needs `pascalToCamelCaseKeys()` first. Each endpoint gets only the transforms its actual response justifies.

## Service Placement

```
Is this API a sub-resource of an existing entity?
(instances, incidents, history, attachments OF a parent)
  │
  YES → Hierarchical Sub-Service (Pattern C)
  │     File inside parent's folder. Shares parent's import path.
  │
  NO → Is it related to an existing service? (same domain, same audience)
       │
       YES → Would a developer commonly use one without the other?
       │     │
       │     OFTEN YES → Independent Root Service (Pattern A)
       │     │            Own import path + rollup entry.
       │     │
       │     OFTEN NO  → Domain-Grouped Service (Pattern B)
       │                  Sibling file, shared import path. No runtime dependency.
       │
       NO → Independent Root Service (Pattern A)
```

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

> **Convention reference:** Build wiring steps per pattern (package.json exports, rollup.config.js entries, barrel exports, area index.ts) are in `agent_docs/conventions.md` § General conventions. The post-implementation checklist in `agent_docs/rules.md` covers all required wiring verification.

## Method Binding

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

Method binding is the core DX feature — a developer should never extract an ID from a response just to pass it back to another method.

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

> **Convention reference:** Method naming conventions (service-level vs bound), the read-only services list, and NEVER rules for binding are in `agent_docs/conventions.md` § Method attachment and `agent_docs/rules.md` § Method binding.
