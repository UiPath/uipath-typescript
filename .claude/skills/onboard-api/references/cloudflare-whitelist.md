# Cloudflare Workers Endpoint Whitelist

The E2E testing browser app calls the API via `alpha.api.uipath.com` (a Cloudflare Workers proxy). New endpoints may not be whitelisted yet, causing 403s. This step adds the endpoint pattern to the whitelist in `apps-dev-tools`.

> **This step is non-blocking** for SDK work — the Vite proxy in the E2E app handles CORS during local validation. This PR is for production consumers using `alpha.api.uipath.com`.

## Procedure

1. **Read the Cloudflare Worker source** at the additional working directory `apps-dev-tools` (`CFWorkers/ApiCorsWorker/api-cors-worker.ts`). If the directory is not available, warn the user and skip this step entirely.

2. **Check if the endpoint pattern already exists** — grep `ALLOWED_API_PATTERNS` for the endpoint path segments. If already present, skip this step and note it.

3. **Determine the service base constant** from the endpoint path:

   | Path prefix | Constant |
   |-------------|----------|
   | `orchestrator_/` | `ORCHESTRATOR_BASE` |
   | `pims_/` | `PIMS_BASE` |
   | `datafabric_/` | `DATAFABRIC_BASE` |
   | `identity_/` | `IDENTITY_BASE` |
   | `autopilotforeveryone_/` | `AUTOPILOT_BASE` |
   | `llmopstenant_/` | `LLM_OPS_BASE` |
   | `portal_/` | `PORTAL_BASE` |

4. **Add RegExp pattern(s)** to the `ALLOWED_API_PATTERNS` array in `api-cors-worker.ts`. Follow existing conventions:
   - OData list: `new RegExp('^\\/${BASE}\\/odata\\/Entity$')`
   - OData by ID: `new RegExp('^\\/${BASE}\\/odata\\/Entity\\(\\d+\\)$')`
   - OData actions: `new RegExp('^\\/${BASE}\\/odata\\/Entity\\/UiPath\\.Server\\.Configuration\\.OData\\.ActionName')`
   - REST list: `new RegExp('^\\/${BASE}\\/api\\/v1\\/resource$')`
   - REST with path params: `new RegExp('^\\/${BASE}\\/api\\/v1\\/resource\\/[^\\/]+$')`
   - Group under a comment: `// <Service Name> Service`

5. **Add test case(s)** to `CFWorkers/ApiCorsWorker/tests/api-cors-worker.test.ts` inside the `Path Validation - Allowed Paths` describe block:
   ```typescript
   it('should allow <Service> <endpoint> endpoint', async () => {
       const request = createMockRequest('https://api.uipath.com/org/tenant/<full-path>');
       const response = await worker.fetch(request, env as any, ctx);
       expect(response.status).not.toBe(403);
       expect(fetchSpy).toHaveBeenCalled();
   });
   ```

6. **Run tests** to verify patterns work:
   ```bash
   cd <apps-dev-tools-path>/CFWorkers && npm install && npm test
   ```

7. **If tests pass**, create branch, commit, push, and raise PR:
   - Branch: `feat/whitelist-<service>-<method>` (e.g., `feat/whitelist-jobs-getall`)
   - Commit message: `feat(api-cors-worker): whitelist <Service> <method> endpoint`
   - PR title: `feat(api-cors-worker): whitelist <Service> <method> endpoint`
   - PR body: mention this is for the SDK onboarding PR being raised in Step 9
   - Use `gh pr create` targeting the `apps-dev-tools` repo
   - Log the PR URL so the user can track it

8. **If tests fail**, stop and show the error — do not raise a broken PR.

## Rules

- **If the pattern already exists** in `ALLOWED_API_PATTERNS`, skip entirely and note it.
- **If `apps-dev-tools` is not available or `gh` auth fails**, warn the user and continue with the SDK PR — do not block the onboarding flow.
- **If tests fail**, stop this step and show the error but continue with Step 9 for the SDK PR.
- **Match existing regex style exactly** — use template literal syntax with the base constant, double-escaped backslashes, and `as const`-compatible patterns.
