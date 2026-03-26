# Rules, Testing & Quality

## NEVER Do

Every item below has caused rejected PRs. Each has a reason — not arbitrary style.

### Naming
- **NEVER use "Request" for parameter types** — always "Options". The entire SDK uses `{Entity}{Operation}Options`. Using "Request" creates inconsistency and confuses the public API. (`TaskAssignmentOptions`, not `TaskAssignmentRequest`)
- **NEVER use `batch` prefix** for batch methods — use plural names instead. `insertRecordsById`, not `batchInsertRecords`. The SDK convention is singular/plural to distinguish cardinality.

### Types
- **NEVER use `any` type** — use `unknown` then validate.
- **NEVER use `as unknown as` type casts** — refactor to make types flow naturally. Casts hide real type errors and break when upstream types change.
- **NEVER make all fields required** if the API sometimes omits them — mark optional fields as optional. Over-requiring causes runtime `undefined` access on fields the API didn't return.
- **NEVER leave raw strings/numbers for fixed value sets** — use enums. Raw values lose type safety and autocomplete. If the API returns `1`, `2`, `3` for status, map them to a `Status` enum.
- **NEVER duplicate fields across option types** — extend existing ones. If `CaseInstanceOperationOptions` already has `comment`, extend it instead of re-declaring. When the shape is identical, use `extends` (e.g., `export interface EntityUpdateRecordByIdOptions extends EntityGetRecordByIdOptions {}`) instead of a type alias, as type aliases break TypeDoc documentation generation.
- **NEVER use type aliases for response types** — even when the shape matches an existing one, use an `extends` interface. Type aliases (e.g., `export type EntityUpdateRecordResponse = EntityRecord`) break TypeDoc docs generation by not rendering as standalone types. Use `export interface EntityUpdateRecordResponse extends EntityRecord {}` instead.
- **NEVER write `param || {}` for required parameters** — this hides bugs by silently accepting missing required data at call sites.

### Transforms
- **NEVER add case-only entries to `{Entity}Map`** — field maps are for semantic renames only (`creationTime` → `createdTime`). Case conversion (`CreationTime` → `creationTime`) is handled by `pascalToCamelCaseKeys()`. Mixing them causes double-conversion bugs and makes the map lie about its purpose.
- **NEVER add transform steps without checking the actual API response first** — if the API already returns camelCase, don't add `pascalToCamelCaseKeys()`. If it doesn't return raw enum codes, don't add `applyDataTransforms()`. Each step must be justified by what the API actually sends.
- **NEVER skip transformations** — never return raw API responses; apply applicable pipeline steps.

### Method binding
- **NEVER bind `getAll()`, `getById()`, `create()`** to response objects — these are service-level entry points, not entity operations. Binding them creates circular nonsense (an entity that retrieves itself).
- **NEVER add `{Entity}Methods` to read-only services** — Assets, Buckets, Queues, Processes, ChoiceSets, Cases, ProcessIncidents have no mutations, so no methods to bind.

### Internal types
- **NEVER re-export `internal-types.ts` through index.ts** — these are private implementation details (raw API shapes, intermediate parsing types). Re-exporting pollutes the public API and creates breaking-change risk when internal formats change.

### Endpoints
- **NEVER bypass base service classes** — never directly instantiate HTTP clients; use `this.get()`, `this.post()` from BaseService.
- **NEVER hardcode HTTP method strings in service methods** — use existing constants. Hardcoded strings drift and miss centralized changes.
- **NEVER use inconsistent param names** across endpoints in the same group — if one endpoint uses `instanceId`, all should. Mixing `id`/`instanceId` creates confusion when reading endpoint constants.
- **NEVER use redundant names** in nested groups — under a `CASE` group, use `REOPEN` not `REOPEN_CASE`. The group context already provides the prefix.

### OperationResponse
- **NEVER use `OperationResponse` for `getAll()`, `getById()`, `create()`** — these return entity data directly. `OperationResponse` is only for state-change operations (cancel, pause, resume) and bulk OData operations with ambiguous success.

### Pagination
- **NEVER implement pagination manually** — always use `PaginationHelpers.getAll()`.

### Tests
- **NEVER write test descriptions that don't match the code** — `'should call entity.insert'` is wrong if testing `insertRecord()`. Mismatched descriptions make failures misleading.
- **NEVER hardcode test values** — use existing constants from `tests/utils/constants/`. Hardcoded values drift and hide which test is using which fixture.
- **NEVER leave unused mock methods in mock objects** — dead mocks obscure what the test actually exercises and accumulate as the API evolves.
- **NEVER use `console.log` + `return` in integration test guards** — use `throw new Error()`. Silent skips hide missing test configuration and make CI green when tests aren't actually running.
- **NEVER wrap integration test API calls in try/catch** — let errors propagate naturally. Silent catches mask real failures and make tests pass when they should fail.
- **NEVER create a separate `afterAll` per describe block** if the file already has one — reuse the existing cleanup block by pushing to the shared `createdRecordIds` array.
- **NEVER copy-paste JSDoc comments between endpoint groups** — each constant needs its own comment. A "Asset Service Endpoints" comment on `JOB_ENDPOINTS` is a review rejection.

### Code hygiene
- **NEVER leave unused code** — unused imports, variables, redundant constructors that only call `super()`. Linter (oxlint) catches these.
- **NEVER add redundant constructors** — if the constructor only calls `super()`, delete it entirely.
- **NEVER commit sensitive files** — `.env`, `credentials.json`, `*.key`, `*.pem`, hardcoded API keys/tokens.

### Docs
- **NEVER skip `docs/oauth-scopes.md` when adding a method** — every public method needs its scope listed in the same PR. Missing scopes break the OAuth integration guide.
- **NEVER skip `docs/pagination.md` when adding a paginated method** — update the quick reference table with the new method and `jumpToPage` support. Users rely on this table to know which methods support pagination.
- **NEVER skip `mkdocs.yml` when adding a new service** — the new service page won't appear in the docs site navigation without a nav entry. Existing services adding methods don't need this.
- **NEVER skip `@track()` decorator** on public service methods — telemetry gaps are invisible until production debugging, when they're expensive.
- **NEVER use PascalCase in JSDoc examples** — write `id` not `Id`. Examples must match the SDK's post-transform response format or users will write broken code.

## Testing guidelines

- Tests use `vitest` with `vi.mock()` and `vi.hoisted()`. Shared mocks in `tests/utils/mocks/`. Use `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`.
- **Arrange-Act-Assert** pattern. Reset mocks in `afterEach`.
- Test both **success and error scenarios** for every public method.
- Test descriptions must match what's being tested.
- Type request objects in tests — don't leave as untyped objects.
- Use existing test constants from `tests/utils/constants/` instead of hardcoding values.
- **Use domain-specific error constants for entity-specific method tests** (e.g., `getById` → `JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND`, `ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND`). Generic `TEST_CONSTANTS.ERROR_MESSAGE` is acceptable for collection methods like `getAll`. Existing pattern: Assets, Queues, Jobs all follow this split.
- Verify bound methods exist on response objects when `getById` returns entities with attached methods.
- **Validate transform completeness** — for any method with a transform pipeline, verify both: (a) transformed fields have correct values (`result.createdTime`), AND (b) original PascalCase fields are absent (`(result as any).CreationTime` is `undefined`). This catches transform regressions that value-only assertions miss. Existing pattern: Assets (`assets.test.ts:94`), Queues (`queues.test.ts:88`), ChoiceSets (`choicesets.test.ts:243`).
- **Coverage**: 80% minimum for new code, 100% for critical paths (auth, API calls).
- Remove unused mock methods. Extract repeated logic into shared helpers.

### Integration tests

Every new method must also have an integration test in `tests/integration/shared/{domain}/`. These run against a live API and catch issues unit tests miss — wrong endpoints, broken transforms, auth/header problems.

- Use `getServices()` and `getTestConfig()` from `tests/integration/config/unified-setup.ts`
- Use `registerResource()` from `tests/integration/utils/cleanup.ts` for cleanup tracking
- Use `generateRandomString()` from `tests/integration/utils/helpers.ts` for unique test data
- Tests run in both `v0` and `v1` init modes via `describe.each(modes)`
- **Include a transform validation test** for new methods with a transform pipeline. This test should verify: (a) transformed camelCase fields exist and have values (`job.createdTime`, `job.processName`), AND (b) original PascalCase API fields are absent (`(job as any).CreationTime` is `undefined`, `(job as any).ReleaseName` is `undefined`). This is a separate test from the basic "should retrieve by ID" test — it validates the SDK transform layer against the live API. Note: existing integration tests don't yet follow this pattern, but unit tests do (Assets, Queues, ChoiceSets). Extending it to integration tests catches mismatches between the Swagger spec assumptions and the live API response.

## Documentation

JSDoc comments in `src/models/{domain}/*.models.ts` are the **source of truth for the public API docs site**. TypeDoc (`typedoc.json`) runs on `src/index.ts`.

- `{Entity}ServiceModel` interfaces become the main API reference pages.
- Use `@example` with fenced TypeScript blocks, `@param`, `@returns`, `{@link TypeName}`.
- Tag internal code with `@internal` or `@ignore`.
- When adding methods, update `docs/oauth-scopes.md` with required OAuth scopes.
- Run `npm run docs:api` to regenerate.

**JSDoc quality rules:**
- Link response types with `{@link TypeName}` in every method's JSDoc `@returns`.
- Show how to get prerequisite IDs (e.g., "First, get entities with `entities.getAll()`").
- Use `<paramName>` placeholder convention for IDs in examples.
- Use camelCase in examples, matching SDK response format.
- Keep JSDoc in sync with method names.
- **When a method supports `expand`**, show multiple expandable entities in the `@example` (e.g., `expand: 'Robot,Machine,Release'`) so users see the comma-separated pattern.
- **Add a one-line description of what the response includes** beyond the method signature (e.g., "Returns the full job details including state, timing, and input/output arguments. Use `expand` to include related entities like Robot, Machine, or Release").

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
- [ ] Integration test written in `tests/integration/shared/{domain}/`

Documentation (the most commonly missed step):
- [ ] `docs/oauth-scopes.md` — new method's OAuth scope added
- [ ] `docs/pagination.md` — quick reference table updated (if paginated method)
- [ ] `mkdocs.yml` — nav entry added (if new service, not needed for methods on existing services)
- [ ] `package.json` exports + `rollup.config.js` — subpath export added (if new service)

## Skills for SDK development

**Invoke the `onboard-api` skill** for any work that involves adding API endpoints to the SDK — whether onboarding a new service or adding methods to an existing one. This includes:
- Adding a new service from a Swagger/OpenAPI spec URL
- Onboarding an endpoint described in a Jira ticket (provide the ticket key/URL)
- Adding a new method or service from a direct endpoint description
- Adding methods to an existing service

The `onboard-api` skill handles the full workflow: input collection → PAT token + live API curl → design decisions → implementation → testing → E2E validation → Cloudflare Workers whitelisting → commit + PR. All coding follows the conventions in these agent docs.

For non-onboarding changes (bug fixes, refactoring, reviewing code, updating tests), no skill is needed — the conventions in these files apply directly.
