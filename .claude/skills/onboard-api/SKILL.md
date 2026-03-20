---
name: onboard-api
description: Use when onboarding a new API endpoint to the UiPath TypeScript SDK — whether a new service or adding methods to an existing one. Accepts a Swagger/OpenAPI spec URL, a Jira ticket key/URL containing spec details, or a direct endpoint description. Handles the full lifecycle: input collection, live API inspection, implementation, testing, E2E validation, and PR creation.
---

# Onboard API

Single skill that handles the full onboarding lifecycle for new SDK endpoints. All coding conventions and rules are in CLAUDE.md (always loaded). This skill provides the procedural workflow and design decision trees.

---

## Step 1: Collect Input

Accepts input from two paths:

### Path A: Jira Ticket

If the user provides a Jira key (`[A-Z]+-\d+`) or Atlassian URL:

1. **Fetch the ticket** using `getJiraIssue` with `responseContentFormat: "markdown"`.
2. **Parse the description** to extract:
   - **Swagger/OpenAPI spec URL** — URLs ending in `.json`, `.yaml`, `/swagger.json`, `/openapi.json`, or containing `swagger`, `openapi`, `api-docs`
   - **Endpoint(s)** — HTTP method + path patterns (e.g., `GET /odata/Jobs`, `POST /api/v1/...`), bullet lists, or table rows
   - **OAuth scope** — scope strings (e.g., `OR.Jobs`, `OR.Tasks`)
   - **Additional context** — acceptance criteria, notes about headers, pagination, etc.
3. **If Swagger URL or endpoint names are missing**, stop and report what's missing.

### Path B: Direct Input

The user provides:
- **Swagger URL** — spec URL or local file path
- **Endpoint(s)** — which path(s) + method(s) to onboard

If either is missing, stop and ask.

### Input Detection

- Jira key pattern (`[A-Z]+-\d+`) or Atlassian URL → **Path A**
- Swagger/OpenAPI URL, file path, or endpoint description → **Path B**
- Cannot determine → stop and ask

---

## Step 2: Log Summary & Create Feature Branch

Print a compact summary of what will be onboarded:

```
### Onboarding Summary
**Source:** <Jira ticket key or "Direct input">
**Swagger:** <spec URL>
**Endpoint(s):** <METHOD> <path> [, ...]
**OAuth Scope:** <scope or "from spec">
**Context:** <any extra notes from ticket/user>
```

**Create feature branch:**
- **Path A (Jira):** `feat/sdk-<ticket-key-lowered>` (e.g., `SDK-123` → `feat/sdk-sdk-123`)
- **Path B (Direct):** `feat/<service>-<method-name>` (e.g., `feat/orchestrator-get-jobs`)

If already on a non-main feature branch, skip branch creation and note it.

---

## Step 3: Read PAT Token & Curl Live API (BLOCKING)

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

---

## Step 4: Design SDK Response & Architecture

**Only after you have a real API response**, make the design decisions. See [`references/onboarding.md`](references/onboarding.md) for detailed decision trees.

This step covers four decisions:

1. **SDK Response Design** — For each field in the raw response: DROP internal metadata? RENAME for SDK conventions? RESHAPE the structure? ENRICH with additional context?
2. **Service Placement** — Independent root service (Pattern A), domain-grouped (Pattern B), or hierarchical sub-service (Pattern C)?
3. **Method Binding** — Which methods should be bound to response objects? (Only state-changing ops, never getAll/getById/create)
4. **Transform Pipeline** — Which of the 4 transform steps does this endpoint need? (Only steps justified by the actual response)

---

## Step 5: Implement

Follow the onboarding checklist in [`references/onboarding.md`](references/onboarding.md). All coding conventions (type naming, transforms, pagination, endpoints, headers, etc.) are defined in CLAUDE.md.

Implementation order:
1. Create model files (`types.ts`, `constants.ts`, `models.ts`, optionally `internal-types.ts`)
2. Define endpoint constants
3. Define pagination constants (if paginated)
4. Implement service class
5. Wire up exports (area `index.ts`, `src/index.ts`, `package.json`, `rollup.config.js`)
6. Write unit tests
7. Write integration tests
8. Write JSDoc on `{Entity}ServiceModel` interface
9. Update docs (`oauth-scopes.md`, `pagination.md`, `mkdocs.yml`)

---

## Step 6: Verify

Run the post-implementation verification checklist defined in CLAUDE.md:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Do not proceed until all four pass.

---

## Step 7: E2E Validate

After implementation passes verification, validate end-to-end by scaffolding a temporary React app. This catches issues unit tests miss — import path problems, build output errors, type declaration bugs, runtime transform failures.

**Follow the full workflow in [`references/e2e-testing.md`](references/e2e-testing.md).**

Quick summary:
1. `npm run build && npm version 1.0.0-test.1 --no-git-tag-version && npm pack`
2. Scaffold temp app at `samples/e2e-test/` (React + Vite + Tailwind, PAT auth)
3. Generate test component tailored to onboarded methods
4. `npm install && npm run dev` → open browser, interact with test UI
5. Verify: imports resolve, fields are camelCase, dropped fields absent, bound methods exist, pagination shape correct
6. Delete entire app — `rm -rf samples/e2e-test`, delete tarball, revert version

---

## Step 8: Whitelist Endpoint in Cloudflare Workers

Add the new endpoint pattern to the Cloudflare Workers proxy whitelist so browser-based E2E tests can reach the API via `alpha.api.uipath.com`. This step is **non-blocking** — if it fails, continue with Step 9.

**Follow the full procedure in [`references/cloudflare-whitelist.md`](references/cloudflare-whitelist.md).**

---

## Step 9: Commit & Raise PR

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

- **NEVER expand scope beyond what the ticket/user asked** — if the ticket says "onboard Jobs_Get", onboard Jobs_Get only. Do not suggest also onboarding GetById, lifecycle operations, or related endpoints.
- **NEVER assume the Jira description is complete** — Jira tickets may have outdated Swagger URLs or missing details. Always validate extracted info against the actual spec.
- **NEVER skip fetching the Swagger spec when using Jira input** — the ticket is a shortcut to collect input; the spec is the source of truth.
- **NEVER skip Step 3 (PAT + curl)** unless the user explicitly opts out — real API responses are required for design decisions.
- **NEVER push to main/master directly** — always create a feature branch. All work goes through a PR.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse single-record types.
- **NEVER ask the user to confirm information the spec clearly provides** — OAuth scopes, parameter types, headers. Only ask when genuinely ambiguous.
