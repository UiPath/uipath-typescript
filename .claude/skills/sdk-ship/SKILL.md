---
name: sdk-ship
description: Commit SDK changes and raise or update a PR. Creates a new PR if none exists, or commits and updates the existing PR description. Optionally whitelists endpoints in Cloudflare Workers. Use after verification passes. Triggers on "raise PR", "ship it", "commit and push", "update PR".
---

# SDK Ship

Handles committing, Cloudflare whitelisting, and PR creation/update. Assumes verification has already passed.

---

## Context Gathering

1. Detect service name and ticket key from the current branch name (e.g., `feat/sdk-plt-99452` → ticket `PLT-99452`) or ask the user.
2. Detect mode — create or update (see below).

---

## Mode Detection

```bash
gh pr list --head $(git branch --show-current) --state open --json number,url
```

- **Empty result** → **Create mode**: new PR will be created
- **Has result** → **Update mode**: existing PR will be updated

---

## Step 1: Cloudflare Whitelist

Add the new endpoint pattern to the Cloudflare Workers proxy whitelist so browser-based E2E tests can reach the API via `alpha.api.uipath.com`. This step is **non-blocking** — if it fails, continue with Step 2.

**Follow the full procedure in [`../onboard-api/references/cloudflare-whitelist.md`](../onboard-api/references/cloudflare-whitelist.md).**

**If Composite:** Whitelist every endpoint the composite method calls internally, not just one.

**In update mode:**
- Read current endpoint constants from the SDK branch.
- Check what's already whitelisted in `apps-dev-tools` (read the whitelist file).
- If new/changed endpoints need whitelisting → update `apps-dev-tools` (push to existing branch if PR exists, or create new branch/PR).
- If endpoints unchanged → skip this step.

---

## Step 2: Commit & Raise/Update PR

### Commit

1. **Stage & commit** all changed files:
   - **Create mode message:** `feat(<service>): add <ServiceName> <method-name> service [<TICKET-KEY>]`
   - **Update mode message:** `fix(<service>): address review feedback [<TICKET-KEY>]`
   - If no ticket key, omit the `[<TICKET-KEY>]` suffix
2. **Push branch** to remote with `-u` flag.

### Create Mode — New PR

3. **Create PR** using `gh pr create`:
   - **Title:** `feat(<service>): add <ServiceName> <method-name> service [<TICKET-KEY>]`
   - **Body** — build dynamically from the work actually done. Every section below is mandatory. Use this structure:

     ```
     ## Method Added

     | Layer | Method | Signature |
     |-------|--------|-----------|
     | Service | `<service>.<methodName>()` | `<methodName>(<full signature with return type>)` |
     <repeat for each method onboarded>

     ## Endpoint Called

     | Method | HTTP | Endpoint | OAuth Scope |
     |--------|------|----------|-------------|
     | `<methodName>()` | <GET/POST/etc.> | `<endpoint path>` | `<scope>` |
     <repeat for each endpoint the method calls>

     - <service base class info, e.g., "Extends FolderScopedService — sets X-UIPATH-OrganizationUnitId header">
     - <key capabilities, e.g., "Supports OData pagination ($top, $skip, $count)">
     - <if composite: describe composition, e.g., "Sequential: fetches job by ID, then resolves output via inline args or blob download">

     ## Example Usage

     ```typescript
     import { UiPath } from '@uipath/uipath-typescript/core';
     import { <Service> } from '@uipath/uipath-typescript/<service>';

     const sdk = new UiPath(config);
     await sdk.initialize();
     const <service> = new <Service>(sdk);

     // Basic usage
     <minimal example — no optional params>

     // With options
     <example with filtering, pagination, or other options>
     ```

     ## API Response vs SDK Response

     <For Direct API methods:>

     ### Transform pipeline
     `<step1>` → `<step2>` → ...

     ### Field mapping
     | API Response (PascalCase) | SDK Response (camelCase) | Change | Reason |
     |---------------------------|--------------------------|--------|--------|
     | `<ApiField>` | `<sdkField>` | <Case / Case + Rename> | <reason> |
     <include all renamed fields + a summary row for case-only conversions>

     <For Composite methods:>

     ### Composition flow
     ```
     <ASCII flow diagram showing the sequential/conditional/parallel steps>
     ```

     ### Internal types (not exported)
     | Type | Purpose |
     |------|---------|
     | `<TypeName>` | <what it represents> |

     ## Files

     | Area | Files |
     |------|-------|
     | Endpoint | `<path>` |
     | Types | `<path>` |
     | Constants | `<path>` |
     | Models | `<path>` |
     | Service | `<path>` |
     | Build | `package.json`, `rollup.config.js` (if changed) |
     | Barrel exports | `<paths>` (if changed) |
     | Unit tests | `<path>` (<N> tests) |
     | Integration tests | `<path>` (<N> tests) |
     | Test utils | `<path>` |
     | Docs | `<paths>` |

     <if ticket: Refs <TICKET-KEY>>

     *🤖 Auto-generated using [onboarding skills](https://github.com/UiPath/uipath-typescript/pull/302)*
     ```

### Update Mode — Existing PR

3. **Regenerate PR body** from the current state of the code:
   - Read the service class, ServiceModel interface, endpoint constants, types, and test files to build all table sections
   - **Method Added** — only include methods that are **new on this branch**. Run `git diff main...HEAD -- <models file>` to identify which methods were added to the ServiceModel interface, not all methods on the interface.
   - **Endpoint Called** — read endpoint constants + service methods for HTTP method, path, scope. Only include endpoints used by newly added methods.
   - **Example Usage** — copy from JSDoc `@example` blocks on the newly added methods in the ServiceModel interface
   - **API Response vs SDK Response** — read transform pipeline in service class + types for field mapping. Only include for newly added methods.
   - **Files** — run `git diff main...HEAD --name-only` to get all files on the branch, group by area, count tests
   - Use the exact same template structure as Create mode
4. **Update PR** using `gh pr edit <number> --body "<regenerated body>"`
   - Do NOT append to old body — regenerate entirely so the description always reflects current branch state

### PR Body Rules (both modes)

- **Every section is mandatory** — Method Added, Endpoint Called, Example Usage, API Response vs SDK Response, Files.
- All fields in the tables must be filled from the actual implementation — never use placeholder values.
- **Method Added** must include full return type in the signature (e.g., `Promise<PaginatedResponse<JobGetResponse>>`).
- **Endpoint Called** must list every HTTP endpoint the method hits, with OAuth scope per endpoint.
- **Example Usage** must be real, runnable TypeScript — copy from the JSDoc `@example` blocks.
- **API Response vs SDK Response** — for Direct API methods, show the transform pipeline and field mapping table with reasons. For Composite methods, show the composition flow diagram and internal types table.
- **Files** must list every file touched, grouped by area. Include test counts.
- Do NOT list implementation details (constant names, internal type names) in a summary section — that's what the Files table is for.
