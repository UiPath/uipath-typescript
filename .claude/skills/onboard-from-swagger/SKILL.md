---
name: onboard-from-swagger
description: Use when user provides a Swagger/OpenAPI spec URL or JSON file, OR a Jira ticket containing onboarding details, to onboard new SDK methods. Triggers on keywords like swagger, openapi, spec, API docs URL, .json spec file, or Jira ticket key/URL alongside onboarding intent.
---

# Onboard from Swagger

Auto-derives all `onboard-api` Phase 1 questionnaire answers from a Swagger/OpenAPI spec, then hands off to `onboard-api` Phase 2+ for implementation.

## Workflow

### Step 1: Collect Input

The skill accepts input from two sources: **direct** (Swagger URL/file + endpoints) or **Jira ticket** (which contains the Swagger URL and endpoint details).

#### Path A: Jira Ticket Input

If the user provides a Jira ticket key (e.g., `SDK-123`) or URL (e.g., `https://site.atlassian.net/browse/SDK-123`):

1. **Extract the ticket key** from the input. For URLs, parse the key from the path.
2. **Fetch the ticket** using `getJiraIssue` with `responseContentFormat: "markdown"` to get a readable description.
3. **Parse the description** to extract:
   - **Swagger/OpenAPI spec URL** — look for URLs ending in `.json`, `.yaml`, `/swagger.json`, `/openapi.json`, or URLs containing `swagger`, `openapi`, `api-docs`
   - **Endpoint(s)** — look for HTTP method + path patterns (e.g., `GET /api/v1/...`, `POST /odata/...`), bullet lists of endpoints, or table rows describing operations
   - **OAuth scope** — look for scope strings (e.g., `OR.DataFabric`, `OR.Tasks`)
   - **Any additional context** — acceptance criteria, notes about headers, pagination, etc.
4. **If required info is missing** (no Swagger URL or no endpoints identified), **stop and report what's missing** — this is the only case where the skill blocks on user input, because it literally cannot proceed without a spec URL and endpoint name.

#### Path B: Direct Input

The user must provide upfront:
- **Swagger source** — URL or local file path
- **Endpoint(s)** — which path(s) + method(s) to onboard
- **OAuth scope** — optional; spec may contain it

If any required input is missing, stop and report what's needed.

#### Input Detection

Determine which path to take:
- User provides a Jira key pattern (`[A-Z]+-\d+`) or Atlassian URL → **Path A**
- User provides a Swagger/OpenAPI URL, file path, or spec content → **Path B**
- Cannot determine → stop and ask what was intended (this is a blocking ambiguity)

### Step 2: Parse Spec & Extract Endpoint Details

Fetch (WebFetch for URLs, Read for files) and parse the spec. For each target endpoint, extract: HTTP method, path, path/query params, request body schema, response schema, headers, and security schemes. Resolve all `$ref` chains.

**Build a sample response JSON from the schema.** This is critical — `onboard-api` Phase 2 needs a response shape to derive transforms. Construct it by walking the response schema's `$ref` chain and listing every field with its type. Include nested objects (resolve their schemas too). This schema-derived sample replaces the "raw JSON response" that `onboard-api` normally requires from a real API call.

**Flag it:** Always note `⚠️ Schema-derived` so downstream skills know casing/field assumptions may need validation.

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

#### Use Judgment, Don't Ask

The goal is to minimize user questions. Only ask when you genuinely cannot determine the answer from available information. Apply these rules:

| Situation | Action | DON'T |
|---|---|---|
| **Scope** — ticket says "onboard X" | Onboard exactly X, nothing more | Don't suggest onboarding related endpoints (GetById, lifecycle ops, etc.) |
| **OAuth scope** — spec has security schemes | Use what the spec says directly | Don't ask user to "confirm" what the spec clearly states |
| **OAuth scope** — spec is ambiguous | Use best judgment from endpoint path + service domain conventions | Don't ask unless truly unknowable |
| **Internal params** — permission arrays, admin flags | Exclude from SDK silently | Don't ask whether to exclude obviously internal params |
| **Headers** — spec shows header param | Use it directly | Don't ask for confirmation unless spec contradicts conventions |

**The principle:** If the answer is derivable from the spec, existing codebase patterns, or common sense — derive it. Reserve `⚠️ UNCERTAIN` for genuinely ambiguous cases where a wrong guess would cause implementation problems (e.g., service placement for an unrecognized path prefix).

### Step 4: Log Derivations & Proceed

Print the derived answers as an informational summary (not a question), then immediately proceed to Step 5. **Do not wait for user confirmation.**

Format:

```
### Derived Phase 1 Answers
**Endpoint:** <METHOD> <path>
**HTTP Method:** <method> | **Cardinality:** <Single/Collection/Batch> | **Pagination:** <Yes-OData/Yes-Token/No>
**Service:** <domain> → <ServiceName> (new/existing) | **Headers:** <header or None>
**Method Binding:** <Yes/No> | **Op Type:** <Data read/Lifecycle> | **OAuth Scope:** <scope>
**Decisions:** <any silent decisions made, e.g. excluded internal params>
```

Keep it compact — this is a log, not a conversation.

### Step 5: Hand Off to onboard-api

Immediately invoke `onboard-api` skill with this prefix:

```
The following questionnaire answers have been derived from the Swagger spec. Skip Phase 1 and proceed directly to Phase 2 (Derive Decisions):

[paste all derived answers]
```

Continue through Phase 2 → 3 → 4 (→ 5 if new service) as normal. Do not pause between phases unless implementation is actually blocked.

## Multi-Endpoint Support

Parse all requested endpoints together. Log derivations grouped by endpoint. Onboard **one at a time** through `onboard-api`, simplest first (GET before POST, single before batch). Proceed to the next endpoint automatically after each completes.

## NEVER Do

- **NEVER trust the schema-derived response as the real API response** — Swagger schemas are often incomplete, wrong, or out of date. Always flag to the user that they should validate with an actual API call before Phase 2 derives the transform pipeline. Getting the response shape wrong cascades into wrong transforms, wrong types, wrong everything.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse the single-record types. If you onboard batch first, you'll create types that should have been aliases.
- **NEVER assume OData from path alone** — `/odata/` prefix suggests OData but confirm by checking for `$top`/`$skip` params AND `value` array response. Some `/odata/` endpoints don't paginate.
- **NEVER silently default uncertain derivations** — if you can't confidently derive a field (service placement, method binding, pagination type), mark it `⚠️ UNCERTAIN` and explain. A wrong confident answer is far worse than flagging uncertainty.
- **NEVER assume the Jira description is complete or accurate** — Jira tickets may have outdated Swagger URLs, incomplete endpoint lists, or missing scopes. Always validate extracted info against the actual spec.
- **NEVER skip fetching the actual Swagger spec when using Jira input** — the Jira ticket is just a shortcut to collect input; the spec itself is still the source of truth for endpoint details. Extract the URL from Jira, then proceed through Steps 2-5 as normal.
- **NEVER expand scope beyond what the ticket/user asked for** — if the ticket says "onboard Jobs_Get", onboard Jobs_Get only. Do not suggest also onboarding GetById, lifecycle operations, or related endpoints. The user will create separate tickets for those.
- **NEVER ask the user to confirm information that the spec clearly provides** — OAuth scopes, parameter types, response shapes, header requirements — if the spec states it, use it. Only ask when the spec is genuinely ambiguous or contradicts conventions.
- **NEVER ask about implementation decisions that belong to downstream skills** — typing strategies, transform pipelines, and code patterns are handled by `onboard-api` and `sdk-service-dev`. This skill only derives Phase 1 questionnaire answers from the spec.
