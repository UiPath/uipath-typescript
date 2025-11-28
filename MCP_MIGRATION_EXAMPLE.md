# MCP Migration Example

This document shows a concrete example of migrating an existing SDK method to be MCP-compatible.

## Before (Current State)

```typescript
/**
 * Gets entity metadata by entity ID with attached operation methods
 * 
 * @param id - UUID of the entity
 * @returns Promise resolving to entity metadata with schema information and operation methods
 * 
 * @example
 * ```typescript
 * // Get entity metadata with methods
 * const entity = await sdk.entities.getById("<entityId>");
 * 
 * // Call operations directly on the entity
 * const records = await entity.getRecords();
 * 
 * const insertResult = await entity.insert([
 *   { name: "John", age: 30 }
 * ]);
 * ```
 */
@track('Entities.GetById')
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation
}
```

## After (MCP-Compatible)

```typescript
import { mcpTool } from '../../core/mcp/metadata';

/**
 * Gets entity metadata by entity ID with attached operation methods
 * 
 * @param id - UUID of the entity
 * @returns Promise resolving to entity metadata with schema information and operation methods
 * 
 * @example
 * ```typescript
 * // Get entity metadata with methods
 * const entity = await sdk.entities.getById("<entityId>");
 * 
 * // Call operations directly on the entity
 * const records = await entity.getRecords();
 * 
 * const insertResult = await entity.insert([
 *   { name: "John", age: 30 }
 * ]);
 * ```
 */
@track('Entities.GetById')
@mcpTool({
  name: 'entities_getById',
  description: 'Gets entity metadata by entity ID with attached operation methods'
})
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation (unchanged)
}
```

## Changes Made

1. ✅ Added import: `import { mcpTool } from '../../core/mcp/metadata';`
2. ✅ Added `@mcpTool()` decorator with:
   - `name`: Following convention `{service}_{methodName}` → `entities_getById`
   - `description`: Extracted from JSDoc summary
3. ✅ JSDoc already had:
   - `@param` tags for all parameters
   - `@returns` tag
   - `@example` tag
4. ✅ Method signature already had:
   - Explicit TypeScript types for all parameters
   - Explicit return type

## More Complex Example: Method with Options

### Before

```typescript
@track('Entities.GetRecordsById')
async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
  entityId: string, 
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<EntityRecord>
    : NonPaginatedResponse<EntityRecord>
> {
  // ... implementation
}
```

### After

```typescript
@track('Entities.GetRecordsById')
@mcpTool({
  name: 'entities_getRecordsById',
  description: 'Gets entity records by entity ID with optional pagination and expansion level'
})
async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
  entityId: string, 
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<EntityRecord>
    : NonPaginatedResponse<EntityRecord>
> {
  // ... implementation (unchanged)
}
```

## Nested Service Example

For nested services like `sdk.maestro.cases.getAll()`:

```typescript
@track('Cases.GetAll')
@mcpTool({
  name: 'maestro.cases_getAll',
  description: 'Get all case management processes with their instance statistics'
})
async getAll(): Promise<CaseGetAllResponse[]> {
  // ... implementation
}
```

Note: The service path uses dot notation: `maestro.cases_getAll`

## Checklist for Each Method

When migrating a method, verify:

- [ ] Import `mcpTool` from `'../../core/mcp/metadata'` (adjust path as needed)
- [ ] Add `@mcpTool()` decorator after `@track()` decorator
- [ ] Set `name` following convention: `{service}_{methodName}` or `{service}.{subservice}_{methodName}`
- [ ] Set `description` (can be extracted from JSDoc summary)
- [ ] Verify JSDoc has `@param` for each parameter
- [ ] Verify JSDoc has `@returns` tag
- [ ] Verify all parameters have explicit TypeScript types
- [ ] Verify return type is explicitly typed
- [ ] Test that method still works (decorator should not affect functionality)

## Minimal Change Summary

The **minimal change** required is:

1. **One import statement** at the top of the service file
2. **One decorator** (`@mcpTool()`) added to each public method

That's it! The rest of the conventions (JSDoc, types, etc.) should already be in place for well-written SDK methods.

