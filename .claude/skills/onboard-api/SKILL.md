---
name: onboard-api
description: Use when adding a new API method, endpoint, or service to the UiPath TypeScript SDK. Triggers on keywords like onboard, new endpoint, add method, new service, API integration.
---

# Onboard API Method

Orchestrates adding a new API method to the SDK through 5 phases: gather → derive → implement → verify → e2e. This skill owns the **workflow** (when to gather info, what to derive, implementation order). For all conventions, naming, transforms, and decision trees, invoke `sdk-service-dev`.

**Required companion:** `sdk-service-dev` must be invoked before Phase 2.

---

## Phase 1: Gather Requirements

Use `AskUserQuestion` in **3 rounds**:

### Round 1 — Endpoint & Request

| Question | Header | Options |
|----------|--------|---------|
| What is the full endpoint URL? | Endpoint | Free text |
| What is the HTTP method? | HTTP Method | GET, POST, PUT, PATCH, DELETE |
| What does the request body look like? Include sample curl/JSON. Note if fields are dynamic or fixed schema. | Request Body | Free text |
| Are there query parameters? (e.g., `expansionLevel`, `failOnFirst`, `$top`, `$skip`) | Query Params | Free text |

### Round 2 — Response & Placement

| Question | Header | Options |
|----------|--------|---------|
| Paste the raw JSON response from calling the endpoint. | Raw Response | Free text |
| Which existing service does this belong to? (If similar method exists, mention it.) | Service | Entities, Tasks, Processes, Cases, MaestroProcesses, Assets, Queues, Buckets, (New service) |
| Is this a single-item or batch operation? | Cardinality | Single, Batch |
| Does the API return paginated lists? | Pagination | No, Yes — OData ($top/$skip), Yes — continuation token, Not sure |

### Round 3 — Behavior & Auth

| Question | Header | Options |
|----------|--------|---------|
| Should this method be bound to entity response objects? | Method Binding | Yes, No, Not sure — help me decide |
| Does it require special headers? (e.g., folder ID, folder key) | Headers | None, X-UIPATH-OrganizationUnitId (numeric), X-UIPATH-FolderKey (string), (Other) |
| Is this a lifecycle/state-change operation (cancel, pause, resume, close, reopen)? | Op Type | Yes — lifecycle, No — data read/write |
| What OAuth scope is required? | OAuth Scope | Free text |

**Gate:** Do NOT proceed to Phase 2 without the **raw JSON response**. The transform pipeline cannot be derived without it.

---

## Phase 2: Derive Decisions

Auto-derive these from questionnaire answers + existing code + `sdk-service-dev` patterns. Do NOT ask the user — figure them out.

### Derivation Checklist

For each item, the authoritative source is `sdk-service-dev`:

| # | Decision | Key Question | Reference |
|---|----------|-------------|-----------|
| 2a | **Transform Pipeline** | Which of the 4 transform steps apply? Inspect the raw response. | `sdk-service-dev → Response Transforms` |
| 2b | **Type Reuse** | Can existing types be aliased, or are new interfaces needed? | Read `src/models/{domain}/{domain}.types.ts` |
| 2c | **Naming** | Method, options type, response type, endpoint constant names? | `sdk-service-dev → Type Naming` |
| 2d | **Service Placement** | (New services only) Sub-resource, domain-grouped, or independent? | `sdk-service-dev → Service Placement` |
| 2e | **Base vs FolderScoped** | Does the endpoint need folder headers? | `sdk-service-dev → BaseService vs FolderScopedService` |
| 2f | **Pagination** | OData offset, continuation token, or none? Reuse existing constants? | `sdk-service-dev → Pagination` |
| 2g | **OperationResponse** | Lifecycle op → yes. Bulk OData → `processODataArrayResponse()`. CRUD → no. | `sdk-service-dev → OperationResponse Pattern` |
| 2h | **Method Binding** | Operates ON a retrieved entity → bind. Entry point → don't bind. | `sdk-service-dev → Method Binding` |
| 2i | **NEVER-Do Check** | Scan all derived decisions against `sdk-service-dev → NEVER Do` list. | See common traps below |

#### Common Traps (2i)

- Using "Request" instead of "Options" in type names
- Adding case-only entries to field maps (case conversion is `pascalToCamelCaseKeys()`, not field map)
- Using `OperationResponse` for getAll/getById/create
- Binding getAll/getById/create to response objects
- Using `as unknown as` type casts
- Creating new interfaces when a type alias would suffice

#### Before Presenting Decisions, Ask Yourself:

- **"Am I deriving the transform pipeline from the ACTUAL raw response, or from assumptions?"** — Each endpoint can have a different pipeline, even within the same service.
- **"Did I check the existing types file for reusable shapes?"** — Creating a duplicate interface when an alias exists is the #1 review comment.
- **"Does my OperationResponse decision match the operation type?"** — This is where lifecycle vs CRUD confusion causes the most rework.

**Present a summary of all derived decisions to the user. Wait for confirmation before implementing.**

---

## Phase 3: Implement

Execute in this order. Each step depends on previous ones. For conventions on each, follow `sdk-service-dev`.

| # | Step | File(s) | Notes |
|---|------|---------|-------|
| 1 | **Endpoint constant** | `src/utils/constants/endpoints/{domain}.ts` | Parameterized arrow fn if path params |
| 2 | **Types** | `src/models/{domain}/{domain}.types.ts` | Aliases where possible (2b). Internal types in `*.internal-types.ts` |
| 3 | **Constants** | `src/models/{domain}/{domain}.constants.ts` | Field map (semantic renames only), status map, expand defaults |
| 4 | **Models** | `src/models/{domain}/{domain}.models.ts` | Bound methods if 2h applies. Skip for read-only services |
| 5 | **Service method** | `src/services/{area}/{service}.ts` | `@track` decorator, transform pipeline from 2a, OData prefix, folder headers, JSDoc |
| 6 | **Pagination** | `src/utils/constants/common.ts` + service | Only if paginated. `PaginationHelpers.getAll()`, `excludeFromPrefix`, conditional return type |
| 7 | **Barrel exports** | `src/models/{domain}/index.ts`, `src/services/{area}/index.ts` | Never export internal types. New services: update `package.json` exports + `rollup.config.js` |
| 8 | **Unit tests** | `tests/unit/services/{area}/{service}.test.ts` | Success + error paths, transform verification, options passing, bound methods. See `sdk-service-dev → testing reference` |
| 9 | **Integration test** | `tests/integration/shared/{area}/{service}.integration.test.ts` | Guard with `if (!entityId)`, try/catch, `registerResource()` cleanup. See `sdk-service-dev → testing reference` |
| 10 | **Docs** | JSDoc on `{Entity}ServiceModel`, `docs/oauth-scopes.md`, `docs/pagination.md` | See `sdk-service-dev → jsdoc reference` |

---

## Phase 4: Verify

```bash
npm run typecheck     # TypeScript compilation
npm run test:unit     # All unit tests
npm run lint          # oxlint
npm run test:integration -- --grep "{test name pattern}"
```

All must pass. Then check:

- [ ] No `any` types, unused imports, or redundant constructors
- [ ] Transform pipeline matches actual raw API response
- [ ] Types reuse existing shapes where possible (aliases, not duplicates)
- [ ] JSDoc complete on service model interface
- [ ] Unit tests cover success + error paths
- [ ] Integration test written (or explicitly skipped with user approval)
- [ ] All `@track` decorators present
- [ ] No `sdk-service-dev` NEVER-do violations
- [ ] `docs/oauth-scopes.md` and `docs/pagination.md` updated if applicable

---

## Phase 5: E2E Validation (new services only)

Only when onboarding an entirely new service. Follow `sdk-service-dev → e2e-testing reference`:

1. Build SDK + pack tarball with unique version
2. Install in `samples/process-app-v1`
3. Add temporary test component exercising every new method
4. Run dev server + validate with Playwright
5. Verify: imports resolve, fields camelCase, dropped fields absent, bound methods exist, pagination correct
6. Clean up — remove test component, revert versions, delete tarball, don't commit

---

## NEVER Do

- **NEVER proceed to Phase 2 without the raw JSON response** — you cannot derive transforms from docs or schemas alone. The raw response is the single source of truth for casing, field names, and enum values. Guessing leads to wrong transforms that cascade through types, tests, and models.
- **NEVER implement before confirming derived decisions with the user** — Phase 2 decisions compound into Phase 3 code. A wrong decision in 2a (transforms) or 2h (binding) means rewriting Steps 2-5. The confirmation step costs 30 seconds; the rework costs 30 minutes.
- **NEVER derive the transform pipeline once for the whole service** — each endpoint can return different shapes. A service's `getAll` may return PascalCase with `value` array while `getById` returns camelCase with flat object. Inspect each raw response independently.
- **NEVER create new type interfaces without checking existing types first** — the #1 review feedback is "this should be a type alias." Always read `{domain}.types.ts` before creating anything new.
- **NEVER skip Steps 8-10 (tests + docs)** — untested code and undocumented methods are incomplete implementations. Phase 4 verification will catch missing tests, but catching it earlier saves a rework cycle.
- **NEVER implement Phase 3 steps out of order** — endpoint constants must exist before the service method references them, types must exist before models use them. Out-of-order implementation causes TypeScript errors that waste time.
