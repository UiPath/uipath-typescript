# CLI Command Generation Conventions

This document outlines the conventions for marking SDK methods as CLI commands and enabling automatic CLI command generation.

## Overview

The SDK methods can be automatically converted to CLI commands by following these conventions and using the provided metadata system. The CLI generator will extract method signatures, JSDoc comments, and type information to create OCLIF command definitions.

## Minimal Changes Required

### 1. Add CLI Metadata Decorator

All public service methods that should be exposed as CLI commands must use the `@cliCommand()` decorator:

```typescript
import { cliCommand } from '../core/cli/metadata';

@track('Entities.GetById')
@mcpTool({ name: 'entities_getById' })
@cliCommand({
  command: 'entities get-by-id',
  description: 'Get entity metadata by ID',
  params: [
    { name: 'id', positional: true, description: 'Entity UUID', required: true }
  ]
})
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation
}
```

### 2. Parameter Configuration

Configure how method parameters map to CLI flags/arguments:

```typescript
@cliCommand({
  command: 'entities get-records',
  params: [
    { 
      name: 'entityId', 
      positional: true,  // First positional argument
      description: 'Entity UUID',
      required: true
    },
    {
      name: 'options',
      flag: 'expansion-level',  // CLI flag name
      char: 'e',  // Short flag: -e
      description: 'Expansion level for related entities',
      type: 'number',
      default: 0
    },
    {
      name: 'options',
      flag: 'page-size',
      description: 'Number of records per page',
      type: 'number',
      default: 50
    }
  ]
})
async getRecordsById(
  entityId: string, 
  options?: { expansionLevel?: number; pageSize?: number }
): Promise<...> {
  // ...
}
```

### 3. Ensure JSDoc Documentation

All methods must have complete JSDoc comments (same as MCP requirements):
- `@param` tags for each parameter
- `@returns` tag
- `@example` tag (optional but recommended)

## Conventions for New Methods

### 1. Command Naming

- Use kebab-case for command paths: `entities get-by-id`
- For nested services: `maestro cases get-all`
- Command path format: `{service} {method-name-in-kebab-case}`

```typescript
// ✅ Good
@cliCommand({ command: 'entities get-by-id' })
async getById(id: string) { }

// ✅ Good - Nested service
@cliCommand({ command: 'maestro cases get-all' })
async getAll() { }

// ❌ Bad - Wrong format
@cliCommand({ command: 'entities_getById' })
async getById(id: string) { }
```

### 2. Parameter Mapping

#### Positional Arguments

Use for required, single-value parameters that are the primary identifier:

```typescript
@cliCommand({
  params: [
    { name: 'id', positional: true, required: true }
  ]
})
async getById(id: string) { }
```

Usage: `uipath entities get-by-id <id>`

#### Flags

Use for optional parameters or when you want named parameters:

```typescript
@cliCommand({
  params: [
    { name: 'id', positional: true },
    { name: 'options', flag: 'expansion-level', char: 'e', type: 'number' }
  ]
})
async getRecordsById(id: string, options?: { expansionLevel?: number }) { }
```

Usage: `uipath entities get-records <id> --expansion-level 2` or `uipath entities get-records <id> -e 2`

#### Options Object Parameters

When a method has an options object, map individual properties to flags:

```typescript
@cliCommand({
  params: [
    { name: 'entityId', positional: true },
    { name: 'options.expansionLevel', flag: 'expansion-level', type: 'number' },
    { name: 'options.pageSize', flag: 'page-size', type: 'number' },
    { name: 'options.failOnFirst', flag: 'fail-on-first', type: 'boolean' }
  ]
})
async insertById(
  entityId: string,
  data: Record<string, any>[],
  options?: { expansionLevel?: number; pageSize?: number; failOnFirst?: boolean }
) { }
```

### 3. Parameter Types

Map TypeScript types to CLI types:

- `string` → `type: 'string'` (default)
- `number` → `type: 'number'`
- `boolean` → `type: 'boolean'`
- `string[]` → `type: 'array'` with `multiple: true`
- Complex objects → `type: 'json'` (passed as JSON string)

```typescript
@cliCommand({
  params: [
    { name: 'id', type: 'string' },
    { name: 'count', type: 'number' },
    { name: 'verbose', type: 'boolean' },
    { name: 'tags', type: 'array', multiple: true },
    { name: 'config', type: 'json' }
  ]
})
```

### 4. Examples

Provide usage examples in the decorator:

```typescript
@cliCommand({
  command: 'entities get-by-id',
  examples: [
    'uipath entities get-by-id <entity-id>',
    'uipath entities get-by-id <entity-id> --output json'
  ]
})
```

### 5. Aliases

Add command aliases for convenience:

```typescript
@cliCommand({
  command: 'entities get-by-id',
  aliases: ['get', 'fetch']
})
```

Usage: `uipath entities get <id>` or `uipath entities fetch <id>`

### 6. Hidden Commands

Mark internal/experimental commands as hidden:

```typescript
@cliCommand({
  command: 'entities internal-method',
  hidden: true
})
```

## Complete Example

```typescript
import { cliCommand } from '../core/cli/metadata';
import { mcpTool } from '../core/mcp/metadata';

/**
 * Gets entity records by entity ID
 * 
 * @param entityId - UUID of the entity
 * @param options - Query options including expansionLevel and pagination options
 * @returns Promise resolving to entity records
 * 
 * @example
 * ```typescript
 * const records = await sdk.entities.getRecordsById(entityId, { expansionLevel: 1 });
 * ```
 */
@track('Entities.GetRecordsById')
@mcpTool({ name: 'entities_getRecordsById' })
@cliCommand({
  command: 'entities get-records',
  description: 'Get records from an entity by entity ID',
  examples: [
    'uipath entities get-records <entity-id>',
    'uipath entities get-records <entity-id> --expansion-level 2',
    'uipath entities get-records <entity-id> --page-size 100 --page-number 2'
  ],
  params: [
    {
      name: 'entityId',
      positional: true,
      description: 'UUID of the entity',
      required: true
    },
    {
      name: 'options',
      flag: 'expansion-level',
      char: 'e',
      description: 'Expansion level for related entities',
      type: 'number',
      default: 0
    },
    {
      name: 'options',
      flag: 'page-size',
      description: 'Number of records per page',
      type: 'number'
    },
    {
      name: 'options',
      flag: 'page-number',
      description: 'Page number (1-indexed)',
      type: 'number',
      default: 1
    }
  ]
})
async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
  entityId: string,
  options?: T
): Promise<...> {
  // Implementation
}
```

## CLI Command Structure

### Flat Services

For services like `sdk.entities`:

- Command: `entities get-by-id`
- CLI: `uipath entities get-by-id <id>`

### Nested Services

For services like `sdk.maestro.cases`:

- Command: `maestro cases get-all`
- CLI: `uipath maestro cases get-all`

## Parameter Mapping Rules

1. **Required, single identifiers** → Positional arguments
   - `getById(id: string)` → `uipath entities get-by-id <id>`

2. **Optional parameters** → Flags
   - `getAll(options?: { pageSize?: number })` → `uipath entities get-all --page-size 50`

3. **Boolean flags** → Boolean flags
   - `delete(id: string, options?: { force?: boolean })` → `uipath entities delete <id> --force`

4. **Arrays** → Multiple flags or comma-separated
   - `deleteById(id: string, recordIds: string[])` → `uipath entities delete-by-id <id> --record-ids id1 id2 id3`

5. **Complex objects** → JSON flag
   - `update(id: string, data: ComplexObject)` → `uipath entities update <id> --data '{"key":"value"}'`

## Excluding Methods from CLI

If a method should NOT be exposed as a CLI command:

1. Don't add the `@cliCommand()` decorator
2. Mark as `@private` in JSDoc if it's an internal method
3. Use `protected` or `private` access modifiers

## Migration Checklist

For existing methods to be CLI-compatible:

- [ ] Add `@cliCommand()` decorator with command path
- [ ] Configure `params` array mapping method parameters to CLI flags/args
- [ ] Ensure JSDoc has `@param` tags for all parameters
- [ ] Ensure JSDoc has `@returns` tag
- [ ] Add `examples` array with usage examples
- [ ] Verify all parameters have explicit TypeScript types
- [ ] Test command generation

## Best Practices

1. **Use positional args for required identifiers**: Makes commands more intuitive
2. **Use flags for optional parameters**: Provides flexibility
3. **Provide good descriptions**: Helps users understand parameters
4. **Include examples**: Shows real-world usage
5. **Use short flags for common options**: `-e` for expansion-level, `-f` for force, etc.
6. **Set sensible defaults**: Reduces required flags
7. **Group related flags**: Use options objects in method signatures

