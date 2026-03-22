---
name: onboard-api
description: Use when adding API endpoints to the UiPath TypeScript SDK — new services or methods on existing ones. Triggers on Swagger/OpenAPI spec URLs, Jira ticket keys (e.g., PLT-99452) with onboarding intent, or direct endpoint descriptions (e.g., "onboard GET /odata/Jobs"). Also use when user says "add method", "new endpoint", "new service", or "API integration".
---

# Onboard API

Single skill that handles the full onboarding lifecycle for new SDK endpoints. This skill provides the procedural workflow; coding conventions are always in context via CLAUDE.md.

**Output:** A PR in `uipath-typescript` containing: service implementation, types, constants, models, endpoint constants, unit tests, integration tests, JSDoc, and doc updates. Optionally a second PR in `apps-dev-tools` for Cloudflare Workers endpoint whitelisting.

---

## Step 1: Collect Input & Create Branch

**Input detection:**
- Jira key (`[A-Z]+-\d+`) or Atlassian URL → fetch ticket using `getJiraIssue` with `responseContentFormat: "markdown"`, extract Swagger URL + endpoints + OAuth scope
- Swagger/OpenAPI URL + endpoint paths → use directly
- Missing either → stop and ask

**If Jira ticket:** Parse description for URLs ending in `.json`/`.yaml`/`swagger.json`/`openapi.json`, HTTP method + path patterns, scope strings (e.g., `OR.Jobs`). If Swagger URL or endpoints missing, stop and report.

**Scope check — MANDATORY before proceeding:**
1. Map the ticket's API name to the **exact Swagger operation ID(s)** it covers. For example, `Jobs_Get` = the list endpoint only, NOT `Jobs_GetById`. Do not infer additional endpoints.
2. Check if the requested endpoint(s) are **already implemented** — search for existing service files, methods, and branches. If the work is already done (even on a feature branch), **stop and tell the user** instead of adding unrequested endpoints.
3. If the endpoint is already implemented and the ticket is effectively complete, ask the user what they'd like done instead of inventing new work.

**Log summary**, then create feature branch:
- Jira: `feat/sdk-<ticket-key-lowered>`
- Direct: `feat/<service>-<method-name>`
- Already on feature branch → skip, note it

---

## Step 2: Read PAT Token & Curl Live API (BLOCKING)

**This step is mandatory. Do NOT proceed to implementation without a real API response.**

### Token source

Read the PAT (Personal Access Token) from `.env.skills` in the repo root. Expected format:

```
PAT_TOKEN=rt_...
BASE_URL=https://alpha.uipath.com
ORG_NAME=popoc
TENANT_NAME=adetenant
```

1. **Read `.env.skills`** and parse `PAT_TOKEN`. If the file is missing or `PAT_TOKEN` is empty, stop and ask the user to populate it before continuing.
2. **Also read `BASE_URL`, `ORG_NAME`, `TENANT_NAME`** for constructing curl URLs. Fall back to defaults (`https://alpha.uipath.com`, `popoc`, `adetenant`) if not set.
3. **Use the PAT as a Bearer token** in curl requests: `Authorization: Bearer <PAT_TOKEN>`.

### Curl live endpoints

4. **Curl each endpoint** being onboarded using the token. Capture the full raw JSON response.
5. **If the curl fails with 401** (token expired or invalid), stop and tell the user to refresh the PAT in `.env.skills`.
6. **If the curl fails** (403, 404, network error), stop and report the error. Do not guess the response shape from the Swagger spec alone.
7. **If the user explicitly opts out** of the entire step (e.g., "skip curl, use spec only"), warn them that type decisions may be wrong and note it as a risk — but allow it.

Without a real response, you cannot reliably decide: which fields are optional, what casing the API uses, whether enum values come as strings or numbers, or which fields are actually null in practice. The Swagger spec is often incomplete or wrong on these details.

### When response contradicts the spec

**Always trust the live response over the spec.** If the spec says a field is required but the response omits it → mark it optional. If the spec says PascalCase but the response is camelCase → skip `pascalToCamelCaseKeys()`. If the spec says string enum but the response returns numeric codes → use numeric enum mapping.

---

## Step 3: Design SDK Response & Architecture

**Only after you have a real API response**, make the four design decisions: response shape (DROP/RENAME/RESHAPE/ENRICH), service placement (Pattern A/B/C), method binding, and transform pipeline.

**MANDATORY — Read** [`references/onboarding.md`](references/onboarding.md) before proceeding. It has all decision trees, field filtering examples, enrichment rules, service placement patterns with build system wiring, and method binding DX examples. **Do NOT load** `e2e-testing.md` or `cloudflare-whitelist.md` yet — those are for Steps 6-7.

---

## Step 4: Implement

Implementation order:
1. Create model files (`types.ts`, `constants.ts`, `models.ts`, optionally `internal-types.ts`) — follow type naming conventions, use "Options" never "Request"
2. Define endpoint constants — `as const`, consistent param names, no redundancy
3. Define pagination constants (if paginated) — check BaseService vs FolderScopedService decision rule
4. Implement service class — apply only justified transform pipeline steps, use `@track()` on all public methods
5. Wire up exports (area `index.ts`, `src/index.ts`, `package.json`, `rollup.config.js`)
6. Write unit tests — use shared mocks, test constants, success + error paths
7. Write integration tests — `throw` in guards (never `console.log` + `return`), no try/catch around API calls
8. Write JSDoc on `{Entity}ServiceModel` interface — `@example`, `{@link}`, camelCase in examples
9. Update docs (`oauth-scopes.md`, `pagination.md`, `mkdocs.yml`) — check NEVER Do § Docs

---

## Step 5: Verify

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Do not proceed until all four pass. Then run through the manual checks and documentation checklist from the post-implementation verification checklist.

---

## Step 6: E2E Validate

After implementation passes verification, validate end-to-end by scaffolding a temporary React app. This catches issues unit tests miss — import path problems, build output errors, type declaration bugs, runtime transform failures.

**MANDATORY — Read** [`references/e2e-testing.md`](references/e2e-testing.md) for the full scaffold workflow, Vite proxy config, PAT auth setup, and gotchas from real runs.

Quick summary:
1. `npm run build && npm version 1.0.0-test.1 --no-git-tag-version && npm pack`
2. Scaffold temp app at `samples/e2e-test/` (React + Vite + Tailwind, PAT auth)
3. Generate test component tailored to onboarded methods
4. `npm install && npm run dev` → open browser, interact with test UI
5. Verify: imports resolve, fields are camelCase, dropped fields absent, bound methods exist, pagination shape correct
6. Delete entire app — `rm -rf samples/e2e-test`, delete tarball, revert version

**Common E2E failures:**
- `Cannot find module` → check `rollup.config.js` entry and `package.json` exports
- Fields still PascalCase → `pascalToCamelCaseKeys()` missing in transform pipeline
- `entity.method is not a function` → `create{Entity}WithMethods()` not applied in service method

---

## Step 7: Whitelist Endpoint in Cloudflare Workers

Add the new endpoint pattern to the Cloudflare Workers proxy whitelist so browser-based E2E tests can reach the API via `alpha.api.uipath.com`. This step is **non-blocking** — if it fails, continue with Step 9.

**Follow the full procedure in [`references/cloudflare-whitelist.md`](references/cloudflare-whitelist.md).**

---

## Step 8: Commit & Raise PR

1. **Stage & commit** all changed files:
   - Message: `feat(<service>): onboard <method-name>`
   - If Path A, include ticket key in body: `Refs SDK-123`
2. **Push branch** to remote with `-u` flag.
3. **Create PR** using `gh pr create`:
   - **Title:** `feat(<service>): onboard <method-name>`
   - **Body:**
     ```
     ## Summary
     - Onboarded `<METHOD> <endpoint-path>` to `<ServiceName>`
     - <additional context: new types, pagination setup, etc.>
     - <if Path A: Refs <TICKET-KEY>>

     ## Test plan
     - [ ] Unit tests pass (`npm run test:unit`)
     - [ ] Typecheck passes (`npm run typecheck`)
     - [ ] Lint passes (`npm run lint`)
     - [ ] Build succeeds (`npm run build`)

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```

---

## Multi-Endpoint Support

If multiple endpoints are requested, onboard **one at a time**, simplest first (GET before POST, single before batch). Proceed to the next endpoint automatically after each completes. Single commit + PR at the end covering all endpoints.

---

## NEVER Do

- **NEVER expand scope beyond what the ticket/user asked** — if the ticket says "onboard Jobs_Get", onboard `Jobs_Get` (the list endpoint) ONLY. Do not also onboard `Jobs_GetById`, lifecycle operations, or related endpoints. Match the **exact Swagger operation ID** — `Jobs_Get` ≠ `Jobs_GetById`. If the requested endpoint is already implemented, stop and report — do not invent additional work to fill the gap.
- **NEVER assume the Jira description is complete** — Jira tickets may have outdated Swagger URLs or missing details. Always validate extracted info against the actual spec.
- **NEVER skip fetching the Swagger spec when using Jira input** — the ticket is a shortcut to collect input; the spec is the source of truth.
- **NEVER skip Step 2 (PAT + curl)** unless the user explicitly opts out — real API responses are required for design decisions.
- **NEVER push to main/master directly** — always create a feature branch. All work goes through a PR.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse single-record types.
- **NEVER ask the user to confirm information the spec clearly provides** — OAuth scopes, parameter types, headers. Only ask when genuinely ambiguous.
