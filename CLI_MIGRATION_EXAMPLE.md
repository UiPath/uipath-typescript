# CLI Migration Example

This document shows concrete examples of migrating SDK methods to be CLI-compatible.

## Simple Example: Single Required Parameter

### Before

```typescript
@track('Entities.GetById')
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation
}
```

### After

```typescript
import { cliCommand } from '../core/cli/metadata';

@track('Entities.GetById')
@mcpTool({ name: 'entities_getById' })
@cliCommand({
  command: 'entities get-by-id',
  description: 'Get entity metadata by ID',
  examples: [
    'uipath entities get-by-id <entity-id>'
  ],
  params: [
    {
      name: 'id',
      positional: true,
      description: 'Entity UUID',
      required: true
    }
  ]
})
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation (unchanged)
}
```

**CLI Usage:**
```bash
uipath entities get-by-id abc123-def456-ghi789
```

## Complex Example: Multiple Parameters with Options

### Before

```typescript
@track('Entities.GetRecordsById')
async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
  entityId: string,
  options?: T
): Promise<...> {
  // ... implementation
}
```

### After

```typescript
import { cliCommand } from '../core/cli/metadata';

@track('Entities.GetRecordsById')
@mcpTool({ name: 'entities_getRecordsById' })
@cliCommand({
  command: 'entities get-records',
  description: 'Get records from an entity with optional pagination and expansion',
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
      description: 'Expansion level for related entities (0-3)',
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
  // ... implementation (unchanged)
}
```

**CLI Usage:**
```bash
# Basic usage
uipath entities get-records abc123-def456-ghi789

# With expansion level
uipath entities get-records abc123-def456-ghi789 -e 2

# With pagination
uipath entities get-records abc123-def456-ghi789 --page-size 100 --page-number 2

# Combined
uipath entities get-records abc123-def456-ghi789 -e 2 --page-size 50
```

## Example: Method with Array Parameter

### Before

```typescript
@track('Entities.DeleteById')
async deleteById(id: string, recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse> {
  // ... implementation
}
```

### After

```typescript
@track('Entities.DeleteById')
@mcpTool({ name: 'entities_deleteById' })
@cliCommand({
  command: 'entities delete-by-id',
  description: 'Delete records from an entity',
  examples: [
    'uipath entities delete-by-id <entity-id> --record-ids id1 id2 id3',
    'uipath entities delete-by-id <entity-id> --record-ids id1,id2,id3'
  ],
  params: [
    {
      name: 'id',
      positional: true,
      description: 'Entity UUID',
      required: true
    },
    {
      name: 'recordIds',
      flag: 'record-ids',
      description: 'Array of record UUIDs to delete',
      type: 'array',
      multiple: true,
      required: true
    },
    {
      name: 'options',
      flag: 'fail-on-first',
      description: 'Stop on first error',
      type: 'boolean',
      default: false
    }
  ]
})
async deleteById(id: string, recordIds: string[], options?: EntityDeleteOptions): Promise<EntityDeleteResponse> {
  // ... implementation (unchanged)
}
```

**CLI Usage:**
```bash
uipath entities delete-by-id abc123 --record-ids id1 id2 id3
uipath entities delete-by-id abc123 --record-ids id1,id2,id3 --fail-on-first
```

## Example: Nested Service

### Before

```typescript
@track('Cases.GetAll')
async getAll(): Promise<CaseGetAllResponse[]> {
  // ... implementation
}
```

### After

```typescript
@track('Cases.GetAll')
@mcpTool({ name: 'maestro.cases_getAll' })
@cliCommand({
  command: 'maestro cases get-all',
  description: 'Get all case management processes',
  examples: [
    'uipath maestro cases get-all'
  ]
})
async getAll(): Promise<CaseGetAllResponse[]> {
  // ... implementation (unchanged)
}
```

**CLI Usage:**
```bash
uipath maestro cases get-all
```

## Example: Method with Complex Object

### Before

```typescript
@track('Processes.Start')
async start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]> {
  // ... implementation
}
```

### After

```typescript
@track('Processes.Start')
@mcpTool({ name: 'processes_start' })
@cliCommand({
  command: 'processes start',
  description: 'Start a process execution',
  examples: [
    'uipath processes start --process-key <key> --folder-id 123',
    'uipath processes start --process-name "MyProcess" --folder-id 123'
  ],
  params: [
    {
      name: 'request',
      flag: 'process-key',
      description: 'Process key (UUID)',
      type: 'string'
    },
    {
      name: 'request',
      flag: 'process-name',
      description: 'Process name (alternative to process-key)',
      type: 'string'
    },
    {
      name: 'folderId',
      flag: 'folder-id',
      description: 'Folder ID',
      type: 'number',
      required: true
    },
    {
      name: 'options',
      flag: 'input-arguments',
      description: 'Input arguments as JSON string',
      type: 'json'
    }
  ]
})
async start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]> {
  // ... implementation (unchanged)
}
```

**CLI Usage:**
```bash
uipath processes start --process-key abc123 --folder-id 456
uipath processes start --process-name "MyProcess" --folder-id 456 --input-arguments '{"param1":"value1"}'
```

## Checklist for Migration

When migrating a method to CLI:

- [ ] Import `cliCommand` from `'../core/cli/metadata'`
- [ ] Add `@cliCommand()` decorator
- [ ] Set `command` path (kebab-case)
- [ ] Set `description`
- [ ] Add `examples` array
- [ ] Configure `params` array:
  - [ ] Map required identifiers to positional args
  - [ ] Map optional parameters to flags
  - [ ] Set appropriate types
  - [ ] Add descriptions for all params
  - [ ] Set defaults where appropriate
  - [ ] Add short flags (`char`) for common options
- [ ] Verify JSDoc has `@param` tags
- [ ] Test command generation

## Common Patterns

### Pattern 1: Simple Get by ID
```typescript
@cliCommand({
  command: 'service get-by-id',
  params: [{ name: 'id', positional: true, required: true }]
})
async getById(id: string) { }
```

### Pattern 2: Get All with Pagination
```typescript
@cliCommand({
  command: 'service get-all',
  params: [
    { name: 'options', flag: 'page-size', type: 'number' },
    { name: 'options', flag: 'page-number', type: 'number', default: 1 }
  ]
})
async getAll(options?: { pageSize?: number; pageNumber?: number }) { }
```

### Pattern 3: Create/Insert with Data
```typescript
@cliCommand({
  command: 'service insert',
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
  command: 'service delete',
  params: [
    { name: 'id', positional: true },
    { name: 'recordIds', flag: 'ids', type: 'array', multiple: true, required: true }
  ]
})
async deleteById(id: string, recordIds: string[]) { }
```

