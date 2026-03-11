# Testing Conventions

## Unit Tests

### Setup

- Framework: `vitest` with `vi.mock()` and `vi.hoisted()`
- Shared mocks: `tests/utils/mocks/`
- Setup helpers: `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`
- Test files mirror `src/` structure under `tests/unit/`

### Rules

| Rule | Detail |
|------|--------|
| Test descriptions | Must match what's being tested — `'should call entity.insert'` is wrong if testing `insertRecord()` |
| Request objects | Type them — no untyped objects in tests |
| Test constants | Use existing constants from `tests/utils/constants/` (e.g., `MAESTRO_TEST_CONSTANTS.TEST_COMMENT`) instead of hardcoding |
| Bound methods | Verify bound methods exist on response objects returned by `getById` |
| Mock methods | Remove unused/deprecated mock methods from mock objects |
| Shared helpers | Extract repeated logic into shared helpers — don't duplicate code |

## Integration Tests

Every new method must also have an integration test. These run against a live UiPath API and catch issues unit tests miss — wrong endpoints, broken transforms, auth/header problems, response shape mismatches.

### Setup

- Test files in `tests/integration/shared/{domain}/` (e.g., `entities.integration.test.ts`)
- Use `getServices()` and `getTestConfig()` from `tests/integration/config/unified-setup.ts`
- Use `registerResource()` from `tests/integration/utils/cleanup.ts` for cleanup tracking
- Use `generateRandomString()` from `tests/integration/utils/helpers.ts` for unique test data
- Tests run in both `v0` and `v1` init modes via `describe.each(modes)`

### Rules

| Rule | Detail |
|------|--------|
| Guard clauses | Always check `if (!entityId)` and skip gracefully — tests are environment-dependent |
| Error handling | Wrap API calls in try/catch — don't hard-fail on API errors (schema constraints, missing data, permissions) |
| Test data | Use `generateRandomString()` for names to avoid collisions across test runs |
| Cleanup | Register created resources with `registerResource()` and clean up in `afterAll` |
| Test ordering | Place new method tests logically — create before update, update before delete |
| Assertions | At minimum verify `result` is defined and key identifying fields match (e.g., `result.id === recordId`) |
