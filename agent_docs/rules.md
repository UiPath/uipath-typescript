# Testing & Quality

## Testing guidelines

- Tests use `vitest` with `vi.mock()` and `vi.hoisted()`. Shared mocks in `tests/utils/mocks/`. Use `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`.
- **Arrange-Act-Assert** pattern. Reset mocks in `afterEach`.
- Test both **success and error scenarios** for every public method.
- Test descriptions must match what's being tested — **NEVER** write `'should call entity.insert'` if testing `insertRecord()`. Mismatched descriptions make failures misleading.
- Type request objects in tests — don't leave as untyped objects.
- Use existing test constants from `tests/utils/constants/` instead of hardcoding values. **NEVER** hardcode test values — hardcoded values drift and hide which test is using which fixture.
- **Use domain-specific error constants for entity-specific method tests** (e.g., `getById` → `JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND`, `ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND`). Generic `TEST_CONSTANTS.ERROR_MESSAGE` is acceptable for collection methods like `getAll`. Existing pattern: Assets, Queues, Jobs all follow this split.
- Verify bound methods exist on response objects when `getById` returns entities with attached methods.
- **Validate transform completeness** — for any method with a transform pipeline, verify both: (a) transformed fields have correct values (`result.createdTime`), AND (b) original PascalCase fields are absent (`(result as any).CreationTime` is `undefined`). This catches transform regressions that value-only assertions miss. Existing pattern: Assets (`assets.test.ts:94`), Queues (`queues.test.ts:88`), ChoiceSets (`choicesets.test.ts:243`). **For semantic rename tests, use a distinctive non-null value in the mock override** (e.g., a specific timestamp string) — a `null` default doesn't verify value preservation: `expect(result.renamedField).toBe(null)` passes whether the rename correctly transferred the null or the field was never populated. A distinctive value like `'2000-01-01T00:00:00.000Z'` confirms the specific value traveled through the rename intact.
- **Every service with bound methods must have a model test file** — `tests/unit/models/{domain}/{entity}.test.ts` testing bound method delegation. This is separate from service tests and verifies that `create{Entity}WithMethods()` correctly binds methods. Existing pattern: Tasks, CaseInstances, ProcessInstances, Entities, Conversations.
- **Mock factories must return `Raw{Entity}GetResponse`**, not `{Entity}GetResponse`** — mock factories like `createBasicJob()` produce plain data without bound methods. Methods are attached by the service layer via `create{Entity}WithMethods()`, not by mocks. Using the combined type causes compile errors for missing method properties.
- **Shared mock setup belongs in `beforeEach`**, not inline in individual tests** — mock creation like `mockApiClient.getValidToken = vi.fn()` must be in the shared setup block, not duplicated inside each test.
- **NEVER** leave unused mock methods in mock objects — dead mocks obscure what the test actually exercises and accumulate as the API evolves.
- **NEVER** access private methods via `as any` in tests (e.g., `(service as any)._privateMethod()`). This violates the no-`any` rule and creates brittle tests tied to implementation internals. Test behaviour through the public API instead, or extract the logic to a module-level pure function that can be imported and tested directly.
- Use `let variable!: Type` (definite assignment assertion) for variables initialized in `beforeAll`, not `let variable: Type | undefined`. The `!` signals TypeScript that the value is guaranteed before any test runs, eliminating null-checks throughout the test bodies. The `afterAll` guard (`if (!variable) return`) still works at runtime.
- **NEVER** wrap integration test API calls in try/catch — let errors propagate naturally. Silent catches mask real failures and make tests pass when they should fail.
- **NEVER** create a separate `afterAll` per describe block if the file already has one — reuse the existing cleanup block by pushing to the shared `createdRecordIds` array.
- **After a successful delete in an integration test, remove the resource from `createdRecordIds`** (or the equivalent cleanup array) — if cleanup runs after a delete test, trying to delete an already-deleted record produces a spurious error. Remove it immediately after the delete call succeeds: `createdRecordIds.splice(createdRecordIds.indexOf(id), 1)`.
- **Consolidate service availability guards in `beforeAll`**, not inline in each test — if a service may be `undefined` (e.g., `getServices().feedback`), check once in `beforeAll` with `if (!service) throw new Error(...)` and assign to a non-nullable `let service!: ServiceType` variable. Repeating the guard in every `it` block is noise and can mask which test actually failed.
- **Test all meaningful branches for boolean-like conditions** — when a method branches on `param === false` vs other values, add explicit tests for `true`, `false`, and `undefined`. Testing only the `false` branch leaves the `true` branch unverified; a later change from `=== false` to a truthy check would silently break behavior without failing any existing tests.
- **When sibling methods share a configuration pattern (e.g., `excludeFromPrefix`, fallback logic), each method needs its own test for that pattern** — verifying it on one method does not cover a sibling that uses the same setup. If `excludeFromPrefix` were accidentally dropped from one method, no unit test would catch it unless each method's suite independently verifies the behavior (e.g., that filter keys are sent without `$` prefix).
- **Coverage**: 80% minimum for new code, 100% for critical paths (auth, API calls).
- Remove unused mock methods. Extract repeated logic into shared helpers.

### Integration tests

Every new method must also have an integration test in `tests/integration/shared/{domain}/`. These run against a live API and catch issues unit tests miss — wrong endpoints, broken transforms, auth/header problems.

- Use `getServices()` and `getTestConfig()` from `tests/integration/config/unified-setup.ts`
- Use `registerResource()` from `tests/integration/utils/cleanup.ts` for cleanup tracking
- Use `generateRandomString()` from `tests/integration/utils/helpers.ts` for unique test data
- Tests run in both `v0` and `v1` init modes via `describe.each(modes)` — **only if the service is registered in both modes in `unified-setup.ts`**. New services that only support `v1` init should use `['v1']` only.
- **Always `throw new Error()` when test preconditions are not met** — whether it's missing config (e.g., no `folderId`) or missing test data (e.g., no running jobs). Never use `console.warn()` + `return` to silently skip — silent skips hide unrunnable tests and make CI green when tests aren't actually exercised.
- **`describe.skip` is permitted only when the service does not support PAT auth** — e.g., `insightsrtm_` endpoints reject PAT tokens entirely (returns 401 regardless of scopes) and require OAuth. In this case, write the full test body as if it will eventually run, add a comment explaining the limitation (e.g., `// skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth`), and use `describe.skip` rather than omitting the test entirely. This preserves the test structure for when PAT support is added. Do **not** use `describe.skip` for missing test data, missing config, or flakiness — those require a `beforeAll` guard or a `throw`. Equivalently, **NEVER** exclude integration test files via `vitest.integration.config.ts` using env vars or file exclusion patterns — that is functionally equivalent to `describe.skip` across an entire file and has the same problem: tests appear to pass but are never actually exercised. Guard with `beforeAll` + `throw` inside the test file instead.
- **Use snapshot+restore for integration tests that mutate shared state** — when an operation has wide-reaching, hard-to-undo side effects (e.g., marking all notifications as read, clearing a queue), read the current state before the test, perform the operation, then restore the previous state in cleanup. This prevents one test from permanently altering the shared environment and corrupting subsequent tests.
- **NEVER** write redundant integration tests — each test must cover a distinct code path, error scenario, or response shape aspect.
- **When a new parameter is added to an existing method, update the integration test to exercise that parameter** — a passing integration test that never sends the new parameter does not validate that the API actually accepts it. Add a dedicated `it` block (or extend the existing one) that explicitly passes the new parameter and asserts the expected behavior.
- **NEVER** test client-side `ValidationError` in integration tests — a call that throws before making any HTTP request (e.g., `updateValueById('', ...)` failing on empty ID) belongs in unit tests, not integration tests. Integration tests must only exercise code paths that reach the actual API.
- **Extract shared data lookups to `beforeAll`** in integration tests — when multiple tests in a `describe` block need the same setup data (e.g., fetching an existing resource to run further operations against it), fetch it once in `beforeAll` and store in a `let variable!: Type` variable. Repeating `getAll` or equivalent calls inside each `it` block wastes API quota and slows the suite.
- **Include a transform validation test** for new methods with a transform pipeline. This test should verify: (a) transformed camelCase fields exist and have values (`job.createdTime`, `job.processName`), AND (b) original PascalCase API fields are absent (`(job as any).CreationTime` is `undefined`, `(job as any).ReleaseName` is `undefined`). This is a separate test from the basic "should retrieve by ID" test — it validates the SDK transform layer against the live API. Note: existing integration tests don't yet follow this pattern, but unit tests do (Assets, Queues, ChoiceSets). Extending it to integration tests catches mismatches between the Swagger spec assumptions and the live API response.

## Documentation

JSDoc comments in `src/models/{domain}/*.models.ts` are the **source of truth for the public API docs site**. TypeDoc (`typedoc.json`) runs on `src/index.ts`.

- `{Entity}ServiceModel` interfaces become the main API reference pages. **Only JSDoc on `{Entity}ServiceModel` is rendered in docs — JSDoc on `{Entity}Methods` does NOT appear.** Place all public-facing documentation on the ServiceModel interface.
- Use `@example` with fenced TypeScript blocks, `@param`, `@returns`, `{@link TypeName}`.
- Tag internal code with `@internal` or `@ignore`.
- When adding methods, update `docs/oauth-scopes.md` with required OAuth scopes. **NEVER** skip this — missing scopes break the OAuth integration guide. **Exception: methods tagged `@internal` in their JSDoc do not get an OAuth scope entry** — they are not part of the public API surface and do not appear in the OAuth integration guide. Similarly, `mkdocs.yml` nav entries and docs site pages are not needed for services where every public-facing method is tagged `@internal` (i.e., the service has no user-visible API).
- Run `npm run docs:api` to regenerate.

**JSDoc quality rules:**
- Link response types with `{@link TypeName}` in every method's JSDoc `@returns`. **NEVER** add `{@link TypeName}` inside `@param` descriptions — TypeDoc automatically links parameter types, so adding it is redundant noise.
- Show how to get prerequisite IDs (e.g., "First, get entities with `entities.getAll()`").
- Use `<paramName>` placeholder convention for IDs in examples.
- Use camelCase in examples, matching SDK response format. **NEVER** use PascalCase in JSDoc examples — users will write broken code.
- Keep JSDoc in sync with method names.
- **Keep JSDoc on service class methods in sync with `{Entity}ServiceModel`** — both the models file and the service implementation file must have identical JSDoc for each public method. `ServiceModel` is the source of truth for docs, but the service class copy aids developer navigation and IDE tooltips. When updating JSDoc on one, update the other.
- **When a method supports `expand`**, show multiple expandable entities in the `@example` (e.g., `expand: 'Robot,Machine,Release'`) so users see the comma-separated pattern.
- **Add a one-line description of what the response includes** beyond the method signature (e.g., "Returns the full job details including state, timing, and input/output arguments. Use `expand` to include related entities like Robot, Machine, or Release").
- **NEVER** reference unrelated parameters in JSDoc examples — keep examples focused on the method being documented. If `getOutput()` doesn't accept `folderId`, don't show `folderId` in its example.
- **Show bare minimum call first** in the first `@example`, then a second example with filtering/options. Never use `$` prefix on OData params in examples (`expand` not `$expand`).
- **NEVER** assign a `void` return to a variable in JSDoc examples — if a method returns `Promise<void>`, write `await service.method()` not `const result = await service.method()`. Assigning void implies the return value is usable, which misleads users.
- **When a new option or feature is added to one method, update related methods' `@example` blocks too** — if `create()` gains an `agentInput` option, `updateById()` (which accepts the same option) also needs a second `@example` showing it. Users look at examples to learn what's possible; a feature shown on one method but silently omitted from a parallel method is effectively invisible.
- **Add JSDoc to non-obvious enum values** — if an enum has values whose meaning isn't clear from the name alone, add a brief comment to each value.
- **NEVER use unexplained abbreviations or acronyms in JSDoc** — spell out the full form (e.g., write "Automation Governance Units" not "AGU"). If the abbreviated form is necessary for brevity, introduce it with the full form first: `Automation Governance Units (AGU)`.
- **NEVER use `@internal` on individual fields of a public interface** — TypeDoc omits the field from generated docs, but TypeScript consumers still see it in IDE autocomplete, creating a confusing experience. To hide a field from docs, move the type to an internal type file or restructure the public interface. `@internal` belongs only on whole declarations (methods, types, classes, interfaces), not on individual fields within a public type.
- **JSDoc `@example` blocks that reference named types must include the import statement** — if an example uses `EntityAggregateFunction` or any other imported type, open the block with the necessary import so the example is self-contained and copy-pasteable without IDE assistance.
- **Propagate `@internal` and `@experimental` to every public layer that exposes the same API** — if an underlying service method is tagged `@internal` or `@experimental`, the corresponding wrapper on the `UiPath` class (or any other public-facing class) must also carry the same tag. TypeDoc runs directly on public class methods; a missing tag on one layer surfaces the method in generated docs even if the service layer correctly marks it. This applies equally to `@experimental` — marking a service model `@experimental` without also marking the service class leaves the class-level JSDoc inconsistent with the published API status.
- **Do not duplicate backend validation SDK-side** — when an API parameter has backend-enforced constraints (e.g., character limits, allowed formats), document the constraint in JSDoc (`@param search - Search string (1–100 chars)`) rather than adding matching SDK-side validation. SDK-side checks risk drifting out of sync with backend rules as the API evolves, producing confusing double-error scenarios.
- **NEVER** expose internal implementation details in user-facing JSDoc — remove references to `OData`, internal API protocols, or internal endpoint names (e.g., "via the OData GetFiles endpoint", "with OData query options"). End users don't need to know which protocol or internal API mechanism the SDK uses; such details belong in code comments or internal docs, not in generated API documentation.

## Post-implementation verification checklist

Run after every implementation, before committing.

```bash
npm run typecheck     # TypeScript compilation — must be clean
npm run lint          # oxlint — 0 errors
npm run test:unit     # All unit tests pass
npm run build         # Rollup build produces dist/ output
```

Manual checks:
- [ ] No `any` types, unused imports, or redundant constructors
- [ ] Transform pipeline matches actual raw API response (not assumptions)
- [ ] Types reuse existing shapes where possible (aliases, not duplicates)
- [ ] All `@track('ServiceName.MethodName')` decorators present on public methods
- [ ] JSDoc complete on `{Entity}ServiceModel` interface with `@example`, `@param`, `@returns`
- [ ] Unit tests cover success + error paths for every public method
- [ ] Model tests for bound methods in `tests/unit/models/{domain}/` (if service has `{Entity}Methods`)
- [ ] Integration test written in `tests/integration/shared/{domain}/`

Documentation (the most commonly missed step):
- [ ] `docs/oauth-scopes.md` — new method's OAuth scope added (skip for `@internal` methods)
- [ ] `docs/pagination.md` — quick reference table updated (if paginated method)
- [ ] `mkdocs.yml` — nav entry added (if new service, not needed for methods on existing services; skip if all methods on the new service are `@internal`)
- [ ] `package.json` exports + `rollup.config.js` — subpath export added (if new service)

## Skills for SDK development

**Invoke the `onboard-api` skill** for any work that involves adding API endpoints to the SDK — whether onboarding a new service or adding methods to an existing one. This includes:
- Adding a new service from a Swagger/OpenAPI spec URL
- Onboarding an endpoint described in a Jira ticket (provide the ticket key/URL)
- Adding a new method or service from a direct endpoint description
- Adding methods to an existing service

The `onboard-api` skill handles the full workflow: input collection → PAT token + live API curl → design decisions → implementation → testing → E2E validation → Cloudflare Workers whitelisting → commit + PR. All coding follows the conventions in these agent docs.

For non-onboarding changes (bug fixes, refactoring, reviewing code, updating tests), no skill is needed — the conventions in these files apply directly.
