# Testing Conventions

## Setup

- Framework: `vitest` with `vi.mock()` and `vi.hoisted()`
- Shared mocks: `tests/utils/mocks/`
- Setup helpers: `createMockApiClient()` and `createServiceTestDependencies()` from `tests/utils/setup.ts`
- Test files mirror `src/` structure under `tests/unit/`

## Rules

| Rule | Detail |
|------|--------|
| Test descriptions | Must match what's being tested — `'should call entity.insert'` is wrong if testing `insertRecord()` |
| Request objects | Type them — no untyped objects in tests |
| Test constants | Use existing constants from `tests/utils/constants/` (e.g., `MAESTRO_TEST_CONSTANTS.TEST_COMMENT`) instead of hardcoding |
| Bound methods | Verify bound methods exist on response objects returned by `getById` |
| Mock methods | Remove unused/deprecated mock methods from mock objects |
| Shared helpers | Extract repeated logic into shared helpers — don't duplicate code |
