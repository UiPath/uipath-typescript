# MCP Server Generation Conventions

This document outlines the minimal changes needed in SDK methods and conventions that new methods should follow to enable deterministic MCP (Model Context Protocol) server generation from the same repository.

## Overview

The SDK methods can be automatically converted to MCP tools by following these conventions and using the provided metadata system. The MCP server generator will extract method signatures, JSDoc comments, and type information to create tool definitions.

## Minimal Changes Required

### 1. Add MCP Metadata Decorator

All public service methods that should be exposed as MCP tools must use the `@mcpTool()` decorator:

```typescript
import { mcpTool } from '../core/mcp/metadata';

@track('Entities.GetById')
@mcpTool({
  name: 'entities_getById',
  description: 'Gets entity metadata by entity ID with attached operation methods'
})
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation
}
```

### 2. Ensure JSDoc Documentation

All methods must have complete JSDoc comments with:
- `@param` tags for each parameter (with type and description)
- `@returns` tag describing the return value
- `@example` tag showing usage (optional but recommended)

```typescript
/**
 * Gets entity metadata by entity ID with attached operation methods
 * 
 * @param id - UUID of the entity
 * @returns Promise resolving to entity metadata with schema information and operation methods
 * 
 * @example
 * ```typescript
 * const entity = await sdk.entities.getById("<entityId>");
 * ```
 */
```

### 3. Use Explicit TypeScript Types

All parameters and return types must be explicitly typed (no `any` without constraints):

```typescript
// ✅ Good
async getById(id: string): Promise<EntityGetResponse>

// ❌ Bad
async getById(id: any): Promise<any>
```

## Conventions for New Methods

### 1. Method Naming

- Use camelCase for method names
- Use descriptive, action-oriented names (e.g., `getById`, `insertById`, `start`)
- Follow RESTful conventions where applicable (get, create, update, delete)

### 2. Parameter Structure

- **Required parameters first**: Place required parameters before optional ones
- **Options object last**: If multiple optional parameters, use an options object
- **Single parameter methods**: If only one required parameter, it can be a direct parameter

```typescript
// ✅ Good - Required first, options last
async getRecordsById(entityId: string, options?: EntityGetRecordsByIdOptions)

// ✅ Good - Single required parameter
async getById(id: string)

// ❌ Bad - Optional before required
async badMethod(options?: Options, requiredId: string)
```

### 3. Return Types

- Always return `Promise<T>` for async methods
- Use specific types, not `any`
- For paginated methods, use conditional types with `HasPaginationOptions`

```typescript
// ✅ Good
async getAll<T extends ProcessGetAllOptions = ProcessGetAllOptions>(
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<ProcessGetResponse>
    : NonPaginatedResponse<ProcessGetResponse>
>

// ✅ Good - Simple return
async getById(id: string): Promise<EntityGetResponse>
```

### 4. JSDoc Requirements

Every public method must include:

```typescript
/**
 * [One-line summary of what the method does]
 * 
 * [Optional: Additional detailed description]
 * 
 * @param paramName - Description of the parameter
 * @param options - Description of options object (if applicable)
 * @returns Description of what is returned
 * 
 * @example
 * ```typescript
 * // Example usage
 * const result = await sdk.service.method(param);
 * ```
 */
```

### 5. Error Handling

- Methods should throw typed errors from `core/errors`
- Document potential errors in JSDoc when relevant
- Use appropriate error types (AuthenticationError, NotFoundError, etc.)

### 6. Telemetry

- All public methods should use `@track()` decorator
- Use format: `'ServiceName.MethodName'` (e.g., `'Entities.GetById'`)

```typescript
@track('Entities.GetById')
@mcpTool({ name: 'entities_getById' })
async getById(id: string): Promise<EntityGetResponse> {
  // ...
}
```

### 7. Service Structure

- Services must extend `BaseService` or `FolderScopedService`
- Services must implement a corresponding model interface (e.g., `EntityServiceModel`)
- Services are registered in `src/uipath.ts` via getter methods

### 8. Type Definitions

- All parameter and return types must be exported from model files
- Use interfaces for options objects
- Use enums for fixed sets of values
- Avoid inline object types in method signatures

```typescript
// ✅ Good - Types defined in models
async insertById(id: string, data: Record<string, any>[], options: EntityInsertOptions): Promise<EntityInsertResponse>

// ❌ Bad - Inline types
async insertById(id: string, data: Record<string, any>[], options: { expansionLevel?: number }): Promise<{ success: boolean }>
```

## MCP Tool Naming Convention

The `@mcpTool()` decorator requires a `name` field that follows this convention:

- Format: `{service}_{methodName}`
- Use snake_case
- Service name should match the service getter in `UiPath` class (e.g., `entities`, `processes`, `maestro.cases`)
- For nested services, use dot notation: `maestro.cases_getAll`

Examples:
- `entities_getById`
- `entities_getRecordsById`
- `processes_start`
- `maestro.cases_getAll`
- `maestro.processes.instances_getAll`

## Method Categories

### Query Methods (GET operations)
- Typically return data without side effects
- May support pagination
- Examples: `getAll()`, `getById()`, `getRecordsById()`

### Mutation Methods (POST/PUT/PATCH/DELETE)
- Modify data or trigger actions
- Return operation results
- Examples: `insertById()`, `updateById()`, `deleteById()`, `start()`

### Special Methods
- Methods that return objects with attached methods (e.g., `getById()` returning entity with methods)
- These are still valid MCP tools, but the return type may be complex

## Excluding Methods from MCP

If a method should NOT be exposed as an MCP tool:

1. Don't add the `@mcpTool()` decorator
2. Mark as `@private` in JSDoc if it's an internal method
3. Use `protected` or `private` access modifiers for internal methods

## Example: Complete Method Template

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
 * ```
 */
@track('Entities.GetById')
@mcpTool({
  name: 'entities_getById',
  description: 'Gets entity metadata by entity ID with attached operation methods'
})
async getById(id: string): Promise<EntityGetResponse> {
  // Implementation
}
```

## Migration Checklist

For existing methods to be MCP-compatible:

- [ ] Add `@mcpTool()` decorator with appropriate name
- [ ] Ensure JSDoc has `@param` tags for all parameters
- [ ] Ensure JSDoc has `@returns` tag
- [ ] Verify all parameters have explicit TypeScript types
- [ ] Verify return type is explicitly typed
- [ ] Check that method follows parameter ordering conventions
- [ ] Ensure `@track()` decorator is present
- [ ] Verify method is public (not private/protected)

