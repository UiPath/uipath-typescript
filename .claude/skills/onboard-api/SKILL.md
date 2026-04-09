---
name: onboard-api
description: Use when adding API endpoints or composite methods to the UiPath TypeScript SDK — new services, methods on existing ones, or composite methods that chain multiple APIs. Triggers on Swagger/OpenAPI spec URLs, Jira ticket keys (e.g., PLT-99452) with onboarding intent, direct endpoint descriptions (e.g., "onboard GET /odata/Jobs"), or composite method references (e.g., "onboard extract_output from Python SDK").
---

# Onboard API

Single skill that handles the full onboarding lifecycle for new SDK endpoints — both direct API methods (one endpoint → one SDK method) and composite methods (multiple chained API calls → one SDK method). This skill provides the procedural workflow; coding conventions are always in context via CLAUDE.md.

**Output:** A PR in `uipath-typescript` containing: service implementation, types, constants, models, endpoint constants, unit tests, integration tests, JSDoc, and doc updates. Optionally a second PR in `apps-dev-tools` for Cloudflare Workers endpoint whitelisting.

---

## Before Starting — Create Progress Tracker

**MANDATORY:** Before beginning Step 1, create a todo list using TodoWrite with ALL steps below. Mark each item complete ONLY after actually performing the step. Do NOT batch-complete items.

**For Direct API tickets:**
```
- [ ] Step 1: Input collected, ticket type detected (Direct), branch created
- [ ] Step 2: PAT read, endpoint curled, raw response logged
- [ ] Step 3: Design decisions documented (response shape, placement, binding, transforms)
- [ ] Step 4a: Types, constants, models created
- [ ] Step 4b: Service class implemented with @track decorators
- [ ] Step 4c: Exports wired (area index.ts, src/index.ts, package.json, rollup.config.js)
- [ ] Step 4d: Unit tests written — success + error paths, all passing
- [ ] Step 4e: Integration tests written — live API calls, all passing
- [ ] Step 4f: JSDoc complete on ServiceModel interface
- [ ] Step 4g: Docs updated (oauth-scopes.md, pagination.md, mkdocs.yml if new service)
- [ ] Step 5: npm run typecheck + lint + test:unit + build — ALL four pass
- [ ] Step 6: E2E app scaffolded, tested in browser, cleaned up
- [ ] Step 7: Cloudflare whitelist added (or explicitly noted as skipped)
- [ ] Step 8: Committed & PR raised
```

**For Composite tickets (with or without reference):**
```
- [ ] Step 1: Input collected, ticket type detected (Composite), branch created
- [ ] Step 2a: Reference method read OR Flow block parsed
- [ ] Step 2b: ALL underlying endpoints identified and curled, raw responses logged
- [ ] Step 3a: Flow proposed to user and confirmed
- [ ] Step 3b: Composition pattern chosen (Sequential/Conditional/Parallel/Fan-out)
- [ ] Step 3c: Error handling strategy decided per call (propagate vs degrade)
- [ ] Step 3d: Response composition designed (public type + intermediate types)
- [ ] Step 4a: Types created (composed response in types.ts, intermediates in internal-types.ts)
- [ ] Step 4b: Endpoint constants defined for ALL internal API calls
- [ ] Step 4c: Private helpers + public composite method implemented, @track on public only
- [ ] Step 4d: Exports wired (area index.ts, src/index.ts, package.json, rollup.config.js)
- [ ] Step 4e: Unit tests — happy path + degradation + propagation + branches, all passing
- [ ] Step 4f: Integration tests written — live API calls, all passing
- [ ] Step 4g: JSDoc complete on ServiceModel interface
- [ ] Step 4h: Docs updated (oauth-scopes.md, pagination.md, mkdocs.yml if new service)
- [ ] Step 5: npm run typecheck + lint + test:unit + build — ALL four pass
- [ ] Step 6: E2E app scaffolded, tested in browser, cleaned up
- [ ] Step 7: Cloudflare whitelist for ALL internal endpoints (or explicitly noted as skipped)
- [ ] Step 8: Committed & PR raised
```

Use the appropriate checklist based on the ticket type detected in Step 1. You may detect the type first, then create the checklist.

**If a step is skipped**, mark it with a note explaining why (e.g., "Step 7: skipped — Cloudflare Workers not accessible"). Do NOT leave items unmarked.

**If a step fails**, stop and resolve before proceeding. Do NOT mark as complete and move on.

---

## Step 1: Collect Input & Create Branch

**Input detection:**
- Jira key (`[A-Z]+-\d+`) or Atlassian URL → fetch ticket using `getJiraIssue` with `responseContentFormat: "markdown"`, extract Swagger URL + endpoints + OAuth scope
- Swagger/OpenAPI URL + endpoint paths → use directly
- Missing either → stop and ask

**If Jira ticket:** Parse description for URLs ending in `.json`/`.yaml`/`swagger.json`/`openapi.json`, HTTP method + path patterns, scope strings (e.g., `OR.Jobs`), and whether each endpoint requires a `folderId`. If Swagger URL missing, stop and report.

**Ticket type detection:**
- `API:` field present → **Direct API** (existing workflow)
- `Reference:` + `Method:` fields present → **Composite with reference** (method chains multiple APIs, reference implementation exists in another repo)
- `Flow:` block present → **Composite without reference** (method chains multiple APIs, flow described manually)
- Both `Reference:` and `Flow:` → reference is primary, flow is supplementary context
- None of the above → stop and ask for clarification

Log detected type in the summary.

**Scope check — MANDATORY before proceeding:**
1. **If Direct API:** Map the ticket's API name to the **exact Swagger operation ID(s)** it covers. For example, `Jobs_Get` = the list endpoint only, NOT `Jobs_GetById`. Do not infer additional endpoints.
2. **If Composite:** Search for the composite method name in existing service files and branches. The scope is the single composite method, not its underlying API calls individually.
3. Check if the requested work is **already implemented**. If the work is already done (even on a feature branch), **stop and tell the user** instead of adding unrequested work.
4. If the work is already implemented and the ticket is effectively complete, ask the user what they'd like done instead of inventing new work.

**Log summary** — present all collected input (Swagger URL, endpoints, OAuth scope, ticket type, folderId requirements) to the user. If any information is missing — including whether endpoints require a `folderId` — ask the user in this summary before creating the branch. Then create feature branch:
- Jira: `feat/sdk-<ticket-key-lowered>`
- Direct: `feat/<service>-<method-name>`
- Already on feature branch → skip, note it

---

## Step 2: Read PAT Token & Curl Live API (BLOCKING)

**This step is mandatory. Do NOT proceed to implementation without a real API response.**

### Token source

Read the PAT (Personal Access Token) from `.env` in the repo root. Expected format:

```
PAT_TOKEN=rt_...
BASE_URL=https://alpha.uipath.com
ORG_NAME=popoc
TENANT_NAME=adetenant
```

1. **Read `.env`** and parse `PAT_TOKEN`. If the file is missing or `PAT_TOKEN` is empty, stop and ask the user to populate it before continuing.
2. **Also read `BASE_URL`, `ORG_NAME`, `TENANT_NAME`** for constructing curl URLs. Fall back to defaults (`https://alpha.uipath.com`, `popoc`, `adetenant`) if not set.
3. **Use the PAT as a Bearer token** in curl requests: `Authorization: Bearer <PAT_TOKEN>`.

### Curl live endpoints

4. **Curl each endpoint** being onboarded using the token. Capture the full raw JSON response.
5. **If the curl fails with 401** (token expired or invalid), stop and tell the user to refresh the PAT in `.env`.
6. **If the curl fails** (403, 404, network error), stop and report the error. Do not guess the response shape from the Swagger spec alone.
7. **If the user explicitly opts out** of the entire step (e.g., "skip curl, use spec only"), warn them that type decisions may be wrong and note it as a risk — but allow it.

Without a real response, you cannot reliably decide: which fields are optional, what casing the API uses, whether enum values come as strings or numbers, or which fields are actually null in practice. The Swagger spec is often incomplete or wrong on these details.

**If composite:** Curl every endpoint referenced in the flow — from the `Reference:` analysis or `Flow:` block. For composite with reference, read the reference method first to identify which endpoints to curl. Each endpoint may need different path parameters; use the Swagger spec to determine valid test values. Log all raw responses; they are all needed for Step 3 design decisions.

### When response contradicts the spec

**Always trust the live response over the spec.** If the spec says a field is required but the response omits it → mark it optional. If the spec says PascalCase but the response is camelCase → skip `pascalToCamelCaseKeys()`. If the spec says string enum but the response returns numeric codes → use numeric enum mapping.

---

## Step 3: Design SDK Response & Architecture

**Only after you have real API response(s)**, make design decisions.

**If Direct API:** Make the four design decisions: response shape (DROP/RENAME/RESHAPE/ENRICH), service placement (Pattern A/B/C), method binding, and transform pipeline. **MANDATORY — Read** [`references/onboarding.md`](references/onboarding.md) before proceeding.

**If Composite:** Make the five design decisions: flow decomposition, response composition, intermediate type design, error handling strategy, and implementation pattern. **MANDATORY — Read** [`references/composite-methods.md`](references/composite-methods.md) before proceeding. Also read [`references/onboarding.md`](references/onboarding.md) for any sub-endpoints within the composite flow that need standard transform pipelines.

**Do NOT load** `e2e-testing.md` or `cloudflare-whitelist.md` yet — those are for Steps 6-7.

---

## Step 4: Implement

Implementation order (follow `conventions.md` for patterns, `rules.md` for quality rules and testing):
1. Create model files (`types.ts`, `constants.ts`, `models.ts`, optionally `internal-types.ts`) — see conventions.md § Type naming, § Service model + method attachment pattern, § Internal types. **Before creating any enum or interface, search `src/models/` for existing types to reuse.**
2. Define endpoint constants — see conventions.md § Endpoint constants
3. Define pagination constants (if paginated) — see conventions.md § Pagination
4. Implement service class — see conventions.md § Response transformation pipeline, § Constructor JSDoc, § Error types. **If Composite:** see `references/composite-methods.md` § Implementation Patterns. Only the public composite method gets `@track`.
5. Wire up exports (area `index.ts`, `src/index.ts`, `package.json`, `rollup.config.js`) — see conventions.md § Export naming
6. Write unit tests — see rules.md § Testing guidelines. If the service has a `{Entity}Methods` interface, also create `tests/unit/models/{domain}/{entity}.test.ts` (see `tests/unit/models/maestro/case-instances.test.ts` for the pattern).
7. Write integration tests — see rules.md § Integration tests
8. Write JSDoc on `{Entity}ServiceModel` interface — see rules.md § Documentation. Show bare minimum call first, then a second example with filtering. Use PascalCase for field names in `$filter` examples (e.g., `filter: "State eq 'Running'"`).
9. Update docs (`oauth-scopes.md`, `pagination.md`, `mkdocs.yml`) — see rules.md § NEVER Do → Docs

---

## Step 5-6: Verify & E2E Validate

Invoke the `sdk-verify` skill. It runs typecheck, lint, unit tests, build, and E2E browser validation, then returns a structured error summary.

### Fix loop

If `sdk-verify` reports failures:
1. Read the error summary
2. Fix the implementation — go back to the relevant Step 4 sub-step (service class, types, exports, etc.)
3. Re-invoke `sdk-verify`
4. Repeat until all checks pass

Do not proceed to Step 7-8 until verification passes.

---

## Step 7-8: Ship (Cloudflare + Commit + PR)

Invoke the `sdk-ship` skill. It handles Cloudflare whitelisting, committing, and PR creation.

---

## Multi-Endpoint Support

If multiple endpoints are requested, onboard **one at a time**, simplest first (GET before POST, single before batch). Proceed to the next endpoint automatically after each completes. Single commit + PR at the end covering all endpoints.

Composite methods count as a single method for multi-endpoint purposes — they produce one SDK method even though they call multiple APIs internally.

---

## NEVER Do

- **NEVER expand scope beyond what the ticket/user asked** — if the ticket says "onboard Jobs_Get", onboard `Jobs_Get` (the list endpoint) ONLY. Do not also onboard `Jobs_GetById`, lifecycle operations, or related endpoints. Match the **exact Swagger operation ID** — `Jobs_Get` ≠ `Jobs_GetById`. If the requested endpoint is already implemented, stop and report — do not invent additional work to fill the gap.
- **NEVER assume the Jira description is complete** — Jira tickets may have outdated Swagger URLs or missing details. Always validate extracted info against the actual spec.
- **NEVER skip fetching the Swagger spec when using Jira input** — the ticket is a shortcut to collect input; the spec is the source of truth.
- **NEVER skip Step 2 (PAT + curl)** unless the user explicitly opts out — real API responses are required for design decisions.
- **NEVER push to main/master directly** — always create a feature branch. All work goes through a PR.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse single-record types.
- **NEVER ask the user to confirm information the spec clearly provides** — OAuth scopes, parameter types, headers. Only ask when genuinely ambiguous.
- **NEVER expose intermediate API responses from composite methods** — the SDK consumer sees one composed result. Internal call results, routing data, and intermediate state are implementation details. Intermediate response types go in `internal-types.ts`.
