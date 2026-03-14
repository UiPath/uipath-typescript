---
name: onboard-from-swagger
description: Use when user provides a Swagger/OpenAPI spec URL or JSON file to onboard new SDK methods. Triggers on keywords like swagger, openapi, spec, API docs URL, or when a .json spec file is referenced alongside onboarding intent.
---

# Onboard from Swagger

Auto-derives all `onboard-api` Phase 1 questionnaire answers from a Swagger/OpenAPI spec, then hands off to `onboard-api` Phase 2+ for implementation.

## Workflow

### Step 1: Collect Input

Ask user (single `AskUserQuestion` round) for anything not already provided:
- **Swagger source** — URL or local file path
- **Endpoint(s)** — which path(s) + method(s) to onboard
- **OAuth scope** — optional; spec may contain it

### Step 2: Parse Spec & Extract Endpoint Details

Fetch (WebFetch for URLs, Read for files) and parse the spec. For each target endpoint, extract: HTTP method, path, path/query params, request body schema, response schema, headers, and security schemes. Resolve all `$ref` chains. Build a sample response JSON from the schema.

**Critical:** The sample response is schema-derived, not from a real API call. Always flag this to the user — `onboard-api` Phase 2 works best with actual API responses.

### Step 3: Auto-Derive Questionnaire Answers

This is the expert knowledge — mapping Swagger data to UiPath SDK conventions:

#### Service Placement (the non-obvious one)

| URL Path Prefix | Service | Notes |
|---|---|---|
| `/api/v1/entities`, `/api/v1/choicesets` | `data-fabric` | Entities or ChoiceSets |
| `/odata/Tasks`, `/taskactions` | `action-center` | Tasks |
| `/api/v1/processes`, `/api/v1/instances`, `/api/v1/incidents`, `/api/v1/cases` | `maestro` | Multiple services share this domain |
| `/odata/Assets`, `/odata/QueueItems`, `/odata/Processes`, `/odata/Buckets`, `/odata/Jobs` | `orchestrator` | OData-based, FolderScopedService |
| Unrecognized | Flag as **new service** | Needs manual decision |

#### Derivation Rules

| Field | Rule |
|---|---|
| **Endpoint URL** | base URL + path, `{paramName}` placeholders |
| **HTTP method** | Directly from spec |
| **Request body** | Schema → sample JSON. `additionalProperties: true` or bare `object` → "dynamic fields" |
| **Query params** | List all `in: query`. Flag OData params (`$top`, `$skip`, `$count`, `$filter`, `$orderby`, `$select`, `$expand`) explicitly |
| **Cardinality** | `Single` if `/{id}` param targeting specific resource. `Batch` if `-batch`, `_bulk`, or array request body |
| **Pagination** | `Yes-OData` if `$top`/`$skip`/`$count` in query params. `Yes-Token` if response has continuation token field. `No` otherwise |
| **Method binding** | `Yes` if sub-resource op (`/{id}/verb`). `No` if entry-point CRUD. `Not sure` if ambiguous |
| **Headers** | `X-UIPATH-OrganizationUnitId` → FolderScopedService. `X-UIPATH-FolderKey` → BaseService + Maestro header. None → BaseService |
| **Op type** | `Lifecycle` if path ends with `/cancel`, `/pause`, `/resume`, `/close`, `/reopen`, `/complete`, `/assign`. `Data read/write` otherwise |
| **OAuth scope** | From spec security schemes, else user-provided, else flag as unknown |

#### Ambiguity Decision Framework

Before finalizing any derivation, ask yourself:

- **"Does the path pattern ACTUALLY match, or am I pattern-matching too loosely?"** — `/api/v1/entities/{entityName}/records` is data-fabric, but `/api/v1/entity-mappings` is NOT. The prefix must match an existing service's known routes.
- **"Is this really a sub-resource operation, or a top-level create with a parent context?"** — `POST /entities/{entityName}/records` creates a record (entry-point, no binding). `POST /entities/{entityName}/records/{recordId}/attachments` operates on a record (sub-resource, binding).
- **"Am I confusing OData query params with regular filtering?"** — Only flag as OData pagination if you see the `$` prefix convention AND `value` array response pattern. Custom `page`/`pageSize` params are token-based, not OData.
- **"Does the response schema actually show PascalCase keys?"** — Swagger field names may not reflect the actual API casing. Flag uncertainty; real API response is the authority.

When uncertain on ANY field, mark it with `⚠️ UNCERTAIN` and explain why. Never guess silently.

### Step 4: Present & Confirm

Show derived answers grouped by questionnaire round. Example format:

```
### Round 1 — Endpoint & Request
- **Endpoint URL:** PUT /api/v1/entities/{entityName}/records/{recordId}
- **HTTP Method:** PUT
- **Request Body:** dynamic fields (Record<string, any>)
- **Query Params:** expansionLevel (optional, integer)

### Round 2 — Response & Placement
- **Response Shape:** { "Id": "string", ... }
  ⚠️ Schema-derived — validate against actual API response
- **Service:** data-fabric → Entities (existing)
- **Cardinality:** Single
- **Pagination:** No

### Round 3 — Behavior & Auth
- **Method Binding:** No (entry-point CRUD)
- **Headers:** None (BaseService)
- **Operation Type:** Data read/write
- **OAuth Scope:** OR.DataFabric

### ⚠️ Items Needing Manual Input
- [anything that couldn't be derived or was uncertain]
```

Ask user to confirm or override.

### Step 5: Hand Off to onboard-api

Invoke `onboard-api` skill with this prefix:

```
The following questionnaire answers have been derived from the Swagger spec and confirmed by the user. Skip Phase 1 and proceed directly to Phase 2 (Derive Decisions):

[paste all confirmed answers]
```

Continue through Phase 2 → 3 → 4 (→ 5 if new service) as normal.

## Multi-Endpoint Support

Parse all requested endpoints together. Present answers grouped by endpoint. Onboard **one at a time** through `onboard-api`, simplest first (GET before POST, single before batch). Ask between endpoints if user wants to continue.

## NEVER Do

- **NEVER trust the schema-derived response as the real API response** — Swagger schemas are often incomplete, wrong, or out of date. Always flag to the user that they should validate with an actual API call before Phase 2 derives the transform pipeline. Getting the response shape wrong cascades into wrong transforms, wrong types, wrong everything.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse the single-record types. If you onboard batch first, you'll create types that should have been aliases.
- **NEVER assume OData from path alone** — `/odata/` prefix suggests OData but confirm by checking for `$top`/`$skip` params AND `value` array response. Some `/odata/` endpoints don't paginate.
- **NEVER silently default uncertain derivations** — if you can't confidently derive a field (service placement, method binding, pagination type), mark it `⚠️ UNCERTAIN` and explain. A wrong confident answer is far worse than flagging uncertainty.
- **NEVER derive headers from the spec alone for Orchestrator services** — Swagger specs often omit `X-UIPATH-OrganizationUnitId` even when required. If service placement is `orchestrator`, always ask the user to confirm whether folder headers are needed.
- **NEVER skip the confirmation step** — even if every derivation seems obvious, present the summary and wait. The user may know about API quirks the spec doesn't document.
- **NEVER feed unconfirmed answers to onboard-api** — Phase 2 builds on Phase 1 answers. Wrong inputs compound into wrong implementations.
