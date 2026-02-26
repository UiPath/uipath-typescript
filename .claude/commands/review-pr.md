# PR Review Instructions

> **Prerequisites:** Read `CLAUDE.md` at the repo root first for full project conventions, architecture, best practices, and anti-patterns. Everything below assumes familiarity with those rules.

## Review process

1. Read `CLAUDE.md` to understand project conventions
2. Run `gh pr diff <number>` to get the full diff
3. Run `gh pr view <number>` to get the PR description
4. Evaluate against the checklists and pitfalls below
5. Post a structured review comment

## Common review pitfalls (enforce these)

### Naming
- **Use "Options" not "Request"** for parameter types — never `{Entity}{Operation}Request`.
- **Method names**: singular for single-item operations (`insertRecordById`), plural for batch (`insertRecordsById`). Prefer plurals over `batch` prefix.
- **Endpoint param names**: consistent naming across endpoints (e.g., always `instanceId`). Avoid redundancy — under a `CASE` group, use `REOPEN` not `REOPEN_CASE`.

### JSDoc quality (these become the public docs)
- **Link response types** with `{@link TypeName}` in every method's JSDoc.
- **Show how to get prerequisite IDs** — if a method takes `entityId`, show how to obtain it.
- **Use `<paramName>` placeholder convention** for IDs in examples.
- **Use camelCase in examples** — write `id` not `Id`.
- **Keep JSDoc in sync with method names** — if renamed, update every `@example` and description.

### Types and safety
- **Mark optional fields as optional** in type interfaces.
- **Avoid `as unknown as`** type casts — refactor to make types flow naturally.
- **Use enums** for fixed sets of values. Ensure enum exports include runtime values, not just types.
- **Extend existing option types** to avoid duplicating fields.
- **No misleading fallbacks** — if a parameter is required, don't write `param || {}`.

### Endpoints
- **Group nested endpoints logically** (e.g., `ENTITY.ATTACHMENT.DOWNLOAD` not flat).
- **Use string constants for HTTP methods** — don't hardcode raw strings in service methods.

### Tests
- **Test descriptions must match what's being tested**.
- **Type request objects in tests** — don't leave as untyped objects.
- **Use existing test constants** from `tests/utils/constants/`.
- **Verify bound methods exist on response objects**.
- **Remove unused mock methods**.
- **Test both success and error scenarios** for every public method.

### Docs sync
- **`docs/oauth-scopes.md`** must be updated in the same PR as any method addition or rename.

---

## PR review checklist

### Critical (check first)
- [ ] No sensitive files committed (`.env`, credentials, keys)
- [ ] No hardcoded secrets in code
- [ ] Jira ticket linked
- [ ] All tests pass
- [ ] Breaking changes stated and migration path documented if applicable

### Architecture & types
- [ ] Services extend `BaseService` or `FolderScopedService`
- [ ] Models separated: `types.ts`, `models.ts`, `constants.ts`, `internal-types.ts`
- [ ] No `any` types; enums export runtime values
- [ ] No circular dependencies

### Transformations
- [ ] Correct pipeline order: case → field → value
- [ ] Each step justified by actual API response shape
- [ ] Field maps contain only semantic renames, not case-only entries

### Pagination
- [ ] Uses `PaginationHelpers.getAll()` (not manual implementation)
- [ ] `cursor` and `jumpToPage` never used together
- [ ] OData parameters prefixed with `$` (except documented exclusions)
- [ ] Correct pagination type (OFFSET/TOKEN) for the API

### Testing
- [ ] Both success and error scenarios covered
- [ ] Test descriptions match what's actually tested
- [ ] Existing test constants and shared mocks reused
- [ ] Bound methods on response objects verified

### Documentation
- [ ] JSDoc with `@param`, `@returns`, `@example`, `{@link}`
- [ ] Prerequisite IDs shown in examples
- [ ] `docs/oauth-scopes.md` updated
- [ ] CHANGELOG.md updated for user-facing changes

---

## Git workflow

- Branch from `develop`, PR into `develop`. `main` is release branch.
- CI runs on PRs: install → typecheck → test with coverage → build (`.github/workflows/pr-checks.yml`).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### Jira ticket requirements

Every PR must have a Jira ticket:
- Include in PR title: `feat: add feature name [PLT-12345]`
- Link in PR body: `Jira Ticket: [PLT-12345](https://uipath.atlassian.net/browse/PLT-12345)`

### PR description template

````markdown
## Summary
[Brief description of what and why]

## Changes
- Bullet point list of changes

## Tests
- All XXX unit tests pass
- Added X new test cases covering [scenarios]

## Usage (if applicable)
```typescript
// Code example showing how to use the new feature
```

## Is this a breaking change?
[Yes/No — if yes, explain impact and migration path]

## Related
- Jira Ticket: [PLT-XXXXX](https://uipath.atlassian.net/browse/PLT-XXXXX)
````

### Pre-submit checklist

- [ ] No `.env` or credential files in commits
- [ ] Jira ticket linked in PR title and description
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] No unused variables or imports
- [ ] New code has tests (80%+ coverage)
- [ ] JSDoc updated for new/changed public methods
- [ ] `docs/oauth-scopes.md` updated if methods added/renamed
- [ ] Breaking changes documented with migration path
