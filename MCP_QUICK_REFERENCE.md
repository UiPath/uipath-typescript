# MCP Quick Reference

## For Adding New Methods

### 1. Method Template

```typescript
import { mcpTool } from '../../core/mcp/metadata';

/**
 * [One-line summary]
 * 
 * @param paramName - Description
 * @param options - Description (if applicable)
 * @returns Description
 * 
 * @example
 * ```typescript
 * const result = await sdk.service.method(param);
 * ```
 */
@track('ServiceName.MethodName')
@mcpTool({
  name: 'service_methodName',
  description: 'One-line summary'
})
async methodName(param: Type, options?: OptionsType): Promise<ReturnType> {
  // Implementation
}
```

### 2. Naming Rules

- **Tool name**: `{service}_{methodName}` (snake_case)
- **Nested services**: `{service}.{subservice}_{methodName}`
- **Examples**:
  - `entities_getById`
  - `processes_start`
  - `maestro.cases_getAll`

### 3. Required Elements

- ✅ `@mcpTool()` decorator
- ✅ `@track()` decorator
- ✅ JSDoc with `@param` for each parameter
- ✅ JSDoc with `@returns`
- ✅ Explicit TypeScript types (no `any`)

## For Migrating Existing Methods

### Step 1: Add Import

```typescript
import { mcpTool } from '../../core/mcp/metadata';
```

### Step 2: Add Decorator

```typescript
@track('ServiceName.MethodName')
@mcpTool({
  name: 'service_methodName',
  description: 'Description from JSDoc'
})
async methodName(...) {
  // Existing code unchanged
}
```

That's it! ✅

## Common Patterns

### Simple Get Method

```typescript
@mcpTool({ name: 'entities_getById', description: 'Get entity by ID' })
async getById(id: string): Promise<EntityResponse> { }
```

### Method with Options

```typescript
@mcpTool({ name: 'entities_getRecords', description: 'Get records with options' })
async getRecords(id: string, options?: Options): Promise<Response> { }
```

### Nested Service

```typescript
@mcpTool({ name: 'maestro.cases_getAll', description: 'Get all cases' })
async getAll(): Promise<Case[]> { }
```

## Checklist

- [ ] Import `mcpTool`
- [ ] Add `@mcpTool()` decorator
- [ ] Set correct `name` (follow convention)
- [ ] Set `description`
- [ ] Verify JSDoc has `@param` tags
- [ ] Verify JSDoc has `@returns` tag
- [ ] Verify all types are explicit

