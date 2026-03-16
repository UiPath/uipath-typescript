---
name: onboard-api
description: Use when onboarding a new API endpoint to the UiPath TypeScript SDK. Accepts a Swagger/OpenAPI spec URL, a Jira ticket key/URL containing spec details, or a direct endpoint description. Triggers on keywords like onboard, swagger, openapi, spec, new endpoint, add method, new service, API integration, or Jira ticket key alongside onboarding intent.
---

# Onboard API

Thin orchestrator that collects input (Swagger URL + endpoint names), creates a feature branch, then hands off to `sdk-service-dev` for all implementation work.

**This skill does NOT implement anything.** It handles: input parsing, spec reference extraction, branch creation, and post-implementation git workflow (commit + PR). All implementation decisions, coding, testing, and verification are owned by `sdk-service-dev`.

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

## Step 3: Invoke `sdk-service-dev`

Invoke the `sdk-service-dev` skill with:

```
Onboard the following endpoint(s) to the SDK:

**Swagger URL:** <url>
**Endpoint(s):** <METHOD> <path>
**OAuth Scope:** <scope>
<any additional context from Jira/user>

Follow the onboarding checklist in sdk-service-dev. Use the Swagger URL for schema reference, but curl the real API with PAT token for ground truth response shapes.
```

Wait for `sdk-service-dev` to complete all steps (implementation, testing, verification).

---

## Step 4: Commit & Raise PR

After `sdk-service-dev` finishes:

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

If multiple endpoints are requested, onboard **one at a time** through `sdk-service-dev`, simplest first (GET before POST, single before batch). Proceed to the next endpoint automatically after each completes. Single commit + PR at the end covering all endpoints.

---

## NEVER Do

- **NEVER implement anything in this skill** — all coding, testing, type decisions, and transform logic belong to `sdk-service-dev`. This skill is input collection + git workflow only.
- **NEVER expand scope beyond what the ticket/user asked** — if the ticket says "onboard Jobs_Get", onboard Jobs_Get only. Do not suggest also onboarding GetById, lifecycle operations, or related endpoints.
- **NEVER assume the Jira description is complete** — Jira tickets may have outdated Swagger URLs or missing details. Always validate extracted info against the actual spec.
- **NEVER skip fetching the Swagger spec when using Jira input** — the ticket is a shortcut to collect input; the spec is the source of truth.
- **NEVER push to main/master directly** — always create a feature branch. All work goes through a PR.
- **NEVER onboard batch endpoints before their single-record counterpart** — batch operations reuse single-record types.
- **NEVER ask the user to confirm information the spec clearly provides** — OAuth scopes, parameter types, headers. Only ask when genuinely ambiguous.
