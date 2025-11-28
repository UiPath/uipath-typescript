# Auto-Generation Framework Summary

This document provides an overview of the auto-generation frameworks for both MCP server and CLI command generation from SDK methods.

## Overview

The SDK now supports automatic generation of:
1. **MCP (Model Context Protocol) Tools** - For AI/LLM integration
2. **CLI Commands** - For command-line interface

Both systems use decorator-based metadata that can be extracted deterministically to generate the respective interfaces.

## Architecture

### Shared Principles

Both MCP and CLI systems follow the same design principles:

1. **Decorator-based metadata**: Methods are marked with decorators (`@mcpTool()`, `@cliCommand()`)
2. **Non-breaking changes**: Decorators use Symbols, no runtime overhead
3. **Deterministic extraction**: Metadata stored directly on methods
4. **Type-safe**: Leverages TypeScript types
5. **Convention-based**: Clear naming and structure conventions

### File Structure

```
src/
  core/
    mcp/
      metadata.ts      # MCP decorator and utilities
      extractor.ts     # MCP tool extraction
      index.ts
    cli/
      metadata.ts      # CLI decorator and utilities
      generator.ts     # OCLIF command generation
      extractor.ts     # CLI command extraction
      index.ts
```

## MCP Framework

### Purpose
Generate MCP tools from SDK methods for AI/LLM integration.

### Usage

```typescript
import { mcpTool } from '../core/mcp/metadata';

@track('Entities.GetById')
@mcpTool({
  name: 'entities_getById',
  description: 'Gets entity metadata by ID'
})
async getById(id: string): Promise<EntityGetResponse> {
  // ...
}
```

### Key Features
- Simple decorator with name and description
- Auto-extraction of method signatures
- Type-to-JSON-Schema conversion framework
- JSDoc parsing framework

### Documentation
- `MCP_CONVENTIONS.md` - Complete conventions
- `MCP_MIGRATION_EXAMPLE.md` - Migration examples
- `MCP_QUICK_REFERENCE.md` - Quick reference
- `MCP_IMPLEMENTATION_SUMMARY.md` - Implementation details

## CLI Framework

### Purpose
Generate OCLIF CLI commands from SDK methods.

### Usage

```typescript
import { cliCommand } from '../core/cli/metadata';

@track('Entities.GetById')
@mcpTool({ name: 'entities_getById' })
@cliCommand({
  command: 'entities get-by-id',
  description: 'Get entity metadata by ID',
  examples: ['uipath entities get-by-id <id>'],
  params: [
    { name: 'id', positional: true, required: true }
  ]
})
async getById(id: string): Promise<EntityGetResponse> {
  // ...
}
```

### Key Features
- Command path configuration
- Parameter mapping (positional args vs flags)
- Type conversion (string, number, boolean, array, JSON)
- Short flags support
- Examples and help text generation

### Documentation
- `CLI_CONVENTIONS.md` - Complete conventions
- `CLI_MIGRATION_EXAMPLE.md` - Migration examples
- `CLI_QUICK_REFERENCE.md` - Quick reference
- `CLI_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `CLI_GENERATOR_EXAMPLE.ts` - Generator script example

## Combined Usage

Methods can be decorated for both MCP and CLI:

```typescript
@track('Entities.GetById')
@mcpTool({
  name: 'entities_getById',
  description: 'Gets entity metadata by ID'
})
@cliCommand({
  command: 'entities get-by-id',
  description: 'Get entity metadata by ID',
  examples: ['uipath entities get-by-id <id>'],
  params: [
    { name: 'id', positional: true, required: true }
  ]
})
async getById(id: string): Promise<EntityGetResponse> {
  // Single implementation serves both MCP and CLI
}
```

## Naming Conventions

### MCP Tools
- Format: `{service}_{methodName}` (snake_case)
- Examples: `entities_getById`, `maestro.cases_getAll`

### CLI Commands
- Format: `{service} {method-name}` (kebab-case, space-separated)
- Examples: `entities get-by-id`, `maestro cases get-all`

## Migration Checklist

For a method to support both MCP and CLI:

- [ ] Add `@mcpTool()` decorator
- [ ] Add `@cliCommand()` decorator
- [ ] Ensure JSDoc has `@param` tags for all parameters
- [ ] Ensure JSDoc has `@returns` tag
- [ ] Configure CLI `params` array
- [ ] Add CLI `examples` array
- [ ] Verify all types are explicit

## Generator Scripts

### MCP Generator
Extract MCP tools and generate MCP server definitions:

```typescript
import { getMcpToolsFromService } from '@uipath/uipath-typescript/core/mcp';

const tools = getMcpToolsFromService(sdk.entities);
// Generate MCP server tools from metadata
```

### CLI Generator
Extract CLI commands and generate OCLIF command files:

```typescript
import { getCliCommandsFromService } from '@uipath/uipath-typescript/core/cli';
import { generateOclifCommandClass } from '@uipath/uipath-typescript/core/cli';

const commands = getCliCommandsFromService(sdk.entities);
for (const [path, metadata] of commands) {
  const code = generateOclifCommandClass(/* ... */);
  // Write to CLI package
}
```

See `CLI_GENERATOR_EXAMPLE.ts` for a complete example.

## Benefits

1. **Single Source of Truth**: SDK methods are the source for both MCP and CLI
2. **Automatic Synchronization**: Changes to SDK automatically reflect in both interfaces
3. **Type Safety**: TypeScript ensures correctness
4. **Minimal Overhead**: Decorators have no runtime cost
5. **Easy Maintenance**: Clear conventions make it easy to add new methods
6. **Consistent UX**: All commands/tools follow the same patterns

## Next Steps

1. **Migrate existing methods**: Add decorators to all public service methods
2. **Build generators**: Create build-time scripts to generate MCP server and CLI commands
3. **Type extraction**: Implement full TypeScript type extraction (compiler API)
4. **JSDoc parsing**: Implement JSDoc parser for descriptions
5. **Integration**: Integrate generated commands into CLI package
6. **Testing**: Test generated commands and tools

## Questions?

- MCP: See `MCP_CONVENTIONS.md` and related docs
- CLI: See `CLI_CONVENTIONS.md` and related docs
- Implementation: See `src/core/mcp/` and `src/core/cli/` for code

