---
name: sdk-verify
description: Run verification and E2E testing for SDK changes — typecheck, lint, unit tests, build, and E2E browser validation. Reports errors as a structured summary without fixing them. Use after making changes to an onboarded service or any SDK code. Triggers on "verify my changes", "run e2e", "revalidate", "test the sdk".
---

# SDK Verify

Pure verification skill — runs all checks and reports results. Does NOT fix any issues.

**If running standalone** (not as part of full onboard), ensure you're on the correct feature branch and the SDK has been built at least once.

---

## Context Gathering

1. Detect which service was changed: check `git diff --name-only` for files under `src/services/` or ask the user.
2. Read PAT from `.env` in the repo root (needed for E2E validation). Parse `PAT_TOKEN`, `BASE_URL`, `ORG_NAME`, `TENANT_NAME`.

---

## Step 1: Static Verification

Run all four checks:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

If any fail, collect the error output and include it in the final summary. **Do NOT attempt to fix.** Continue to Step 2 only if all four pass.

---

## Step 2: E2E Validation

After static verification passes, validate end-to-end by scaffolding a temporary React app. This catches issues unit tests miss — import path problems, build output errors, type declaration bugs, runtime transform failures.

**MANDATORY — Read** [`../onboard-api/references/e2e-testing.md`](../onboard-api/references/e2e-testing.md) for the full scaffold workflow, Vite proxy config, PAT auth setup, and gotchas from real runs.

Quick summary:
1. `npm run build && npm version 1.0.0-test.1 --no-git-tag-version && npm pack`
2. Scaffold temp app at `samples/e2e-test/` (React + Vite + Tailwind, PAT auth)
3. Generate test component tailored to the changed service's methods
4. `npm install && npm run dev` → open browser, interact with test UI
5. Verify: imports resolve, fields are camelCase, dropped fields absent, bound methods exist, pagination shape correct

**Common E2E failures:**
- `Cannot find module` → check `rollup.config.js` entry and `package.json` exports
- Fields still PascalCase → `pascalToCamelCaseKeys()` missing in transform pipeline
- `entity.method is not a function` → `create{Entity}WithMethods()` not applied in service method

### E2E Cleanup

Cleanup behavior depends on context:

- **Standalone (user-invoked):** After reporting the verification summary, **ask the user** whether to clean up the E2E app. The user may want to inspect the app, manually test in the browser, or iterate on fixes before cleanup. Only clean up after explicit confirmation.
- **Called from `onboard-api`:** Do **NOT** clean up on failure — the onboard skill owns the fix loop and needs the app alive to iterate (rebuild → bump version → reinstall → revalidate). Clean up only after all checks pass.

Cleanup commands (when confirmed):
```bash
# From repo root
rm -rf samples/e2e-test
rm -f uipath-uipath-typescript-1.0.0-test.*.tgz
git checkout package.json
```

---

## Output: Structured Error Summary

After running all checks, report the results in this format:

```
## Verification Summary

**Overall: PASS / FAIL**

| Check | Status | Details |
|-------|--------|---------|
| typecheck | ✅ PASS / ❌ FAIL | <error details if failed> |
| lint | ✅ PASS / ❌ FAIL | <error details if failed> |
| test:unit | ✅ PASS / ❌ FAIL | <failing test names + error if failed> |
| build | ✅ PASS / ❌ FAIL | <error details if failed> |
| E2E | ✅ PASS / ❌ FAIL / ⏭️ SKIPPED | <what failed + likely root cause> |

<If any failures, include:>
### Failure Details
- **<check>**: <error message>
  - Likely root cause: <location from failure mapping table>
```

**Critical:** Do NOT attempt to fix any issues. Report and stop. The caller (either the `onboard-api` orchestrator or the user) decides what to fix.
