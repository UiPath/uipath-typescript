# Documentation Requirements

## JSDoc — Source of Truth for Public API Docs

JSDoc comments in `src/models/{domain}/*.models.ts` are processed by TypeDoc → generated markdown in `docs/api/` → served by MkDocs Material.

`{Entity}ServiceModel` interfaces are the main API reference pages.

## JSDoc Rules

| Requirement | Detail |
|-------------|--------|
| `@example` | Fenced TypeScript code blocks — render as copyable snippets |
| `{@link TypeName}` | Cross-reference response types in every method's JSDoc |
| Prerequisite IDs | Show how to get them (e.g., "First, get entities with `entities.getAll()`") |
| ID placeholders | Use `<paramName>` convention (e.g., `<entityId>`, `<taskId>`, `<folderId>`) |
| Case in examples | Use camelCase (matching SDK response format after transformation) |
| Sync after renames | Update every `@example` and description referencing old method names |
| Internal code | Tag with `@internal` or `@ignore` to exclude from generated docs |

## Telemetry

Every public service method must be decorated with `@track('ServiceName.MethodName')`.

## Documentation Files to Update

| File | When |
|------|------|
| `docs/oauth-scopes.md` | Same PR as any method addition or rename. Group related services (e.g., ChoiceSets under Entities). |
| `docs/pagination.md` | When adding paginated methods — update quick reference table with method and `jumpToPage` support. |

## Generating Docs

Run `npm run docs:api` to regenerate. A post-process step renames entity interface docs for cleaner URLs.
