# CLI Command Generation - Implementation Summary

## Overview

This document summarizes the CLI command generation framework that enables automatic CLI command creation from decorated SDK methods, similar to the MCP system.

## Solution Architecture

### 1. Metadata System (`src/core/cli/metadata.ts`)

A decorator-based metadata system that marks SDK methods as CLI commands:

- **`@cliCommand()` decorator**: Marks methods as CLI commands with metadata
- **Parameter configuration**: Maps method parameters to CLI flags/arguments
- **Metadata storage**: Uses Symbols to attach metadata to methods
- **Utility functions**: Functions to extract metadata from services and methods

### 2. Command Generator (`src/core/cli/generator.ts`)

Utilities for generating OCLIF command structures:

- **OCLIF command generation**: Converts CLI metadata to OCLIF command definitions
- **Flag/argument mapping**: Maps method parameters to CLI flags and positional arguments
- **Code generation**: Generates TypeScript code for OCLIF command classes
- **Type conversion**: Converts TypeScript types to CLI flag types

### 3. Extractor (`src/core/cli/extractor.ts`)

Utilities for extracting CLI commands from SDK:

- **Service extraction**: Extracts all CLI commands from service instances
- **SDK extraction**: Extracts commands from entire SDK instance
- **Command file generation**: Framework for generating command files

### 4. Documentation

- **`CLI_CONVENTIONS.md`**: Complete conventions guide for CLI commands
- **`CLI_MIGRATION_EXAMPLE.md`**: Step-by-step migration examples
- **This document**: Implementation summary

## Minimal Changes Required

### For Existing Methods

1. **Add one import**:
   ```typescript
   import { cliCommand } from '../../core/cli/metadata';
   ```

2. **Add one decorator** to each public method:
   ```typescript
   @cliCommand({
     command: 'service method-name',
     description: 'Method description',
     params: [
       { name: 'param1', positional: true, required: true }
     ]
   })
   ```

3. **Configure parameters** to map to CLI flags/arguments

### For New Methods

Follow the conventions in `CLI_CONVENTIONS.md`:
- Use `@cliCommand()` decorator
- Configure parameter mapping
- Complete JSDoc with `@param` and `@returns`
- Provide usage examples
- Explicit TypeScript types

## Key Features

### 1. Non-Breaking Changes

- Decorators use Symbols, so they don't affect existing code
- Methods work exactly as before
- No runtime overhead when CLI is not used

### 2. Deterministic Generation

- Metadata is stored directly on methods
- Can be extracted at build time
- Generates OCLIF command classes automatically

### 3. Flexible Parameter Mapping

- Positional arguments for required identifiers
- Flags for optional parameters
- Support for arrays, booleans, numbers, JSON
- Short flags for common options

### 4. Convention-Based

- Clear naming conventions (`service method-name`)
- Consistent structure across all services
- Easy to understand and follow

## CLI Command Naming Convention

Format: `{servicePath} {method-name-in-kebab-case}`

Examples:
- `entities get-by-id` (from `sdk.entities.getById()`)
- `processes start` (from `sdk.processes.start()`)
- `maestro cases get-all` (from `sdk.maestro.cases.getAll()`)

## Parameter Mapping

### Positional Arguments

For required, single-value parameters that are primary identifiers:

```typescript
@cliCommand({
  params: [
    { name: 'id', positional: true, required: true }
  ]
})
async getById(id: string) { }
```

Usage: `uipath entities get-by-id <id>`

### Flags

For optional parameters or named parameters:

```typescript
@cliCommand({
  params: [
    { name: 'options', flag: 'page-size', type: 'number' }
  ]
})
async getAll(options?: { pageSize?: number }) { }
```

Usage: `uipath entities get-all --page-size 50`

### Options Object

Map individual properties of options objects to separate flags:

```typescript
@cliCommand({
  params: [
    { name: 'options.expansionLevel', flag: 'expansion-level', type: 'number' },
    { name: 'options.pageSize', flag: 'page-size', type: 'number' }
  ]
})
async getRecords(id: string, options?: { expansionLevel?: number; pageSize?: number }) { }
```

## Usage Example

### SDK Method (After Migration)

```typescript
@track('Entities.GetById')
@mcpTool({ name: 'entities_getById' })
@cliCommand({
  command: 'entities get-by-id',
  description: 'Get entity metadata by ID',
  examples: ['uipath entities get-by-id <entity-id>'],
  params: [
    { name: 'id', positional: true, required: true }
  ]
})
async getById(id: string): Promise<EntityGetResponse> {
  // ... implementation
}
```

### Generated CLI Command

The generator creates an OCLIF command class that:
1. Parses CLI arguments/flags
2. Initializes the SDK
3. Calls the method with parsed parameters
4. Outputs the result

### CLI Usage

```bash
uipath entities get-by-id abc123-def456-ghi789
```

## CLI Generator Requirements

To generate CLI commands from this SDK, you need to:

1. **Extract metadata** from all services using `getCliCommandsFromService()`
2. **Generate OCLIF commands** using `generateOclifCommand()`
3. **Generate command files** using `generateOclifCommandClass()`
4. **Map parameters** from CLI flags/args to method parameters
5. **Handle type conversion** (string to number, JSON parsing, etc.)
6. **Generate help text** from JSDoc and metadata

## File Structure

```
src/
  core/
    cli/
      metadata.ts      # Decorator and metadata utilities
      generator.ts     # OCLIF command generation
      extractor.ts      # Command extraction utilities
      index.ts         # Public exports
CLI_CONVENTIONS.md     # Conventions guide
CLI_MIGRATION_EXAMPLE.md  # Migration examples
CLI_IMPLEMENTATION_SUMMARY.md  # This file
```

## Integration with Existing CLI

The generated commands can be integrated into the existing OCLIF-based CLI:

1. **Generate command files** to `packages/cli/src/commands/generated/`
2. **Register commands** in the CLI configuration
3. **Handle SDK initialization** (authentication, config)
4. **Format output** (JSON, table, etc.)

## Next Steps

1. **Build CLI generator script**: Create a build-time script that:
   - Scans all services
   - Extracts CLI metadata
   - Generates OCLIF command files
   - Writes them to the CLI package

2. **Parameter type extraction**: Implement full TypeScript type to CLI type conversion

3. **JSDoc parsing**: Extract parameter descriptions from JSDoc

4. **SDK initialization**: Handle authentication and configuration in generated commands

5. **Output formatting**: Add options for JSON, table, or custom output formats

## Benefits

1. **Single source of truth**: SDK methods are the source for CLI commands
2. **Automatic synchronization**: Changes to SDK methods automatically reflect in CLI
3. **Type safety**: TypeScript types ensure correctness
4. **Minimal overhead**: Decorators have no runtime cost
5. **Easy maintenance**: Clear conventions make it easy to add new commands
6. **Consistent UX**: All commands follow the same patterns

## Example Generator Script

A build script would look like:

```typescript
import { extractCliCommandsFromSdk } from '@uipath/uipath-typescript/core/cli';
import { generateOclifCommandClass } from '@uipath/uipath-typescript/core/cli';
import { writeFileSync } from 'fs';

const sdk = new UiPath(config);
const commands = extractCliCommandsFromSdk(sdk);

for (const [commandPath, command] of commands) {
  const code = generateOclifCommandClass(
    command,
    command.metadata.servicePath,
    command.metadata.methodName
  );
  
  const filename = commandPath.replace(/\s+/g, '-') + '.ts';
  writeFileSync(`packages/cli/src/commands/generated/${filename}`, code);
}
```

## Questions?

Refer to:
- `CLI_CONVENTIONS.md` for conventions
- `CLI_MIGRATION_EXAMPLE.md` for examples
- `src/core/cli/metadata.ts` for API documentation

