# Pagination

Always check whether the API supports paginated responses. If it does, use `PaginationHelpers.getAll()` from `src/utils/pagination/helpers.ts` instead of raw HTTP calls.

## Two Pagination Types

### `PaginationType.OFFSET` — OData-style

- Items in a `value` array, count in `@odata.count`
- Params: `$top`, `$skip`, `$count`
- Supports `jumpToPage`
- Shared constants: `ODATA_PAGINATION`, `ODATA_OFFSET_PARAMS`

### `PaginationType.TOKEN` — Continuation-token

- Items in a named array field, next page via continuation token field
- Does **NOT** support `jumpToPage`
- Uses service-specific constants

## Defining Constants

Add to `src/utils/constants/common.ts`. Each paginated service needs two constant objects:

### 1. Response shape — where to find items and count/token

```typescript
// OFFSET example (OData)
export const ENTITY_PAGINATION = {
  ITEMS_FIELD: 'value',
  TOTAL_COUNT_FIELD: 'totalRecordCount',
} as const;

// TOKEN example
export const PROCESS_INSTANCE_PAGINATION = {
  ITEMS_FIELD: 'instances',
  CONTINUATION_TOKEN_FIELD: 'nextPage',
} as const;
```

If the API uses standard OData shape, reuse `ODATA_PAGINATION` directly.

### 2. Request params — what query parameter names to send

```typescript
// OFFSET example
export const ENTITY_OFFSET_PARAMS = {
  PAGE_SIZE_PARAM: 'limit',
  OFFSET_PARAM: 'start',
  COUNT_PARAM: undefined,
} as const;

// TOKEN example
export const PROCESS_INSTANCE_TOKEN_PARAMS = {
  PAGE_SIZE_PARAM: 'pageSize',
  TOKEN_PARAM: 'nextPage',
} as const;
```

If the API uses standard OData params, reuse `ODATA_OFFSET_PARAMS` directly.

**Naming convention:** `{SERVICE}_PAGINATION` for response shape, `{SERVICE}_OFFSET_PARAMS` or `{SERVICE}_TOKEN_PARAMS` for request params.

## `excludeFromPrefix`

By default, `PaginationHelpers.getAll()` prefixes all option keys with `$` (ODATA_PREFIX). Prevent this for specific keys with `excludeFromPrefix: string[]`:

| Scenario | Example |
|----------|---------|
| Service-specific query params | Entities: `'expansionLevel'`, Buckets: `'prefix'` |
| Custom filter params | Tasks: `'event'` |
| TOKEN-based APIs (all non-OData) | `excludeFromPrefix: Object.keys(options \|\| {})` |

## Return Type

Conditional via `HasPaginationOptions<T>` from `src/utils/pagination/types.ts`:
- Without pagination options → `NonPaginatedResponse<T>`
- With any pagination option → `PaginatedResponse<T>`

## How to Add Pagination

1. Define pagination constants in `src/utils/constants/common.ts`
2. Call `PaginationHelpers.getAll()` with: `serviceAccess`, `getEndpoint`, `transformFn`, `pagination` config (type, field names, param names), and `excludeFromPrefix` if needed
3. Type signature with conditional return: `Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<R> : NonPaginatedResponse<R>>`
4. Update `docs/pagination.md` quick reference table with the new method and `jumpToPage` support
