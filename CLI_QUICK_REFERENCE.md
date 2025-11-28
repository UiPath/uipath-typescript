# CLI Quick Reference

## For Adding New Methods

### 1. Method Template

```typescript
import { cliCommand } from '../../core/cli/metadata';

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
@mcpTool({ name: 'service_methodName' })
@cliCommand({
  command: 'service method-name',
  description: 'One-line summary',
  examples: ['uipath service method-name <param>'],
  params: [
    { name: 'param', positional: true, required: true }
  ]
})
async methodName(param: Type, options?: OptionsType): Promise<ReturnType> {
  // Implementation
}
```

### 2. Command Naming Rules

- **Command path**: `{service} {method-name-in-kebab-case}`
- **Nested services**: `{service} {subservice} {method-name}`
- **Examples**:
  - `entities get-by-id`
  - `processes start`
  - `maestro cases get-all`

### 3. Parameter Configuration

#### Positional Argument (Required ID)

```typescript
@cliCommand({
  params: [
    { name: 'id', positional: true, required: true, description: 'Entity UUID' }
  ]
})
async getById(id: string) { }
```

Usage: `uipath entities get-by-id <id>`

#### Flag (Optional Parameter)

```typescript
@cliCommand({
  params: [
    { name: 'options', flag: 'page-size', type: 'number', description: 'Records per page' }
  ]
})
async getAll(options?: { pageSize?: number }) { }
```

Usage: `uipath entities get-all --page-size 50`

#### Short Flag

```typescript
@cliCommand({
  params: [
    { name: 'options', flag: 'expansion-level', char: 'e', type: 'number' }
  ]
})
```

Usage: `uipath entities get-records <id> -e 2`

#### Boolean Flag

```typescript
@cliCommand({
  params: [
    { name: 'options', flag: 'fail-on-first', type: 'boolean', default: false }
  ]
})
```

Usage: `uipath entities delete <id> --fail-on-first`

#### Array Parameter

```typescript
@cliCommand({
  params: [
    { name: 'recordIds', flag: 'ids', type: 'array', multiple: true, required: true }
  ]
})
```

Usage: `uipath entities delete <id> --ids id1 id2 id3`

#### JSON Parameter

```typescript
@cliCommand({
  params: [
    { name: 'data', flag: 'data', type: 'json', required: true }
  ]
})
```

Usage: `uipath entities insert <id> --data '{"key":"value"}'`

### 4. Required Elements

- ✅ `@cliCommand()` decorator
- ✅ `command` path (kebab-case)
- ✅ `description`
- ✅ `params` array with parameter mappings
- ✅ `examples` array
- ✅ JSDoc with `@param` tags
- ✅ JSDoc with `@returns`

## For Migrating Existing Methods

### Step 1: Add Import

```typescript
import { cliCommand } from '../../core/cli/metadata';
```

### Step 2: Add Decorator

```typescript
@track('ServiceName.MethodName')
@mcpTool({ name: 'service_methodName' })
@cliCommand({
  command: 'service method-name',
  description: 'Description from JSDoc',
  examples: ['uipath service method-name <param>'],
  params: [
    { name: 'param', positional: true, required: true }
  ]
})
async methodName(...) {
  // Existing code unchanged
}
```

## Common Patterns

### Pattern 1: Get by ID

```typescript
@cliCommand({
  command: 'entities get-by-id',
  params: [{ name: 'id', positional: true, required: true }]
})
async getById(id: string) { }
```

### Pattern 2: Get All with Pagination

```typescript
@cliCommand({
  command: 'entities get-all',
  params: [
    { name: 'options', flag: 'page-size', type: 'number' },
    { name: 'options', flag: 'page-number', type: 'number', default: 1 }
  ]
})
async getAll(options?: { pageSize?: number; pageNumber?: number }) { }
```

### Pattern 3: Create/Insert

```typescript
@cliCommand({
  command: 'entities insert',
  params: [
    { name: 'id', positional: true },
    { name: 'data', flag: 'data', type: 'json', required: true }
  ]
})
async insertById(id: string, data: Record<string, any>[]) { }
```

### Pattern 4: Delete with Array

```typescript
@cliCommand({
  command: 'entities delete',
  params: [
    { name: 'id', positional: true },
    { name: 'recordIds', flag: 'ids', type: 'array', multiple: true, required: true }
  ]
})
async deleteById(id: string, recordIds: string[]) { }
```

### Pattern 5: Nested Service

```typescript
@cliCommand({
  command: 'maestro cases get-all',
  description: 'Get all cases'
})
async getAll() { }
```

## Checklist

- [ ] Import `cliCommand`
- [ ] Add `@cliCommand()` decorator
- [ ] Set `command` path (kebab-case)
- [ ] Set `description`
- [ ] Add `examples` array
- [ ] Configure `params` array:
  - [ ] Map required IDs to positional args
  - [ ] Map optional params to flags
  - [ ] Set appropriate types
  - [ ] Add descriptions
  - [ ] Set defaults where needed
  - [ ] Add short flags for common options
- [ ] Verify JSDoc has `@param` tags
- [ ] Verify JSDoc has `@returns` tag

