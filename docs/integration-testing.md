# Integration Testing

Every new method must have an integration test. These run against a live API and catch issues unit tests miss — wrong endpoints, broken transforms, and auth/header problems.

## Environment configuration

Integration tests read their configuration from `tests/.env.integration`. Create that file (it is git-ignored — never commit it) and populate it with the variables.

The full, current set of config values lives in the team Slack canvas: [UiPath SDK – Integration Test Config (.env)](https://uipath.enterprise.slack.com/docs/TLXCE0J2Z/F0B9B5G7M2Q). Copy them into your local `tests/.env.integration` and fill in `UIPATH_SECRET` with your own PAT from the `procodeapps` org.

**Create test artifacts in the `integrationtest` tenant**, inside the **"Integration Test"** folder. Keeping all test data in this dedicated tenant and folder avoids polluting shared environments and keeps cleanup predictable.

## Where tests live

Add your test under `tests/integration/shared/{domain}/`, mirroring the service domain it covers.

## Setup helpers

- Use `getServices()` and `getTestConfig()` from `tests/integration/config/unified-setup.ts`
- Use `registerResource()` from `tests/integration/utils/cleanup.ts` for cleanup tracking
- Use `generateRandomString()` from `tests/integration/utils/helpers.ts` for unique test data

## Guidelines

- Tests run in both `v0` and `v1` init modes via `describe.each(modes)` — **only if the service is registered in both modes** in `unified-setup.ts`. New services that only support `v1` init should use `['v1']` only.
- **Always `throw new Error()` when test preconditions are not met** — whether it's missing config (e.g., no `folderId`) or missing test data (e.g., no running jobs). Never use `console.warn()` + `return` to silently skip — silent skips hide unrunnable tests and make CI green when tests aren't actually exercised.
- **`describe.skip` is permitted only when the service does not support PAT auth** (e.g., endpoints that require OAuth). Write the full test body as if it will eventually run, add a comment explaining the limitation, and use `describe.skip` rather than omitting the test. Do **not** use `describe.skip` for missing test data, missing config, or flakiness — those require a `beforeAll` guard or a `throw`.
- **Never** wrap integration test API calls in try/catch — let errors propagate naturally. Silent catches mask real failures.
- **Never** write redundant tests — each test must cover a distinct code path, error scenario, or response-shape aspect.
- **Extract shared data lookups to `beforeAll`** — fetch setup data once and store it in a `let variable!: Type` variable rather than repeating `getAll` calls in each `it` block.
- **Clean up after deletes** — after a successful delete, remove the resource from the cleanup array so later cleanup doesn't try to delete an already-deleted record.
- **Include a transform validation test** for methods with a transform pipeline. Verify both that (a) transformed camelCase fields exist and have values (`job.createdTime`, `job.processName`), and (b) original PascalCase API fields are absent (`(job as any).CreationTime` is `undefined`).

## Running the tests

```bash
npm run test:integration   # integration tests only
npm run test:all           # unit + integration tests
```
