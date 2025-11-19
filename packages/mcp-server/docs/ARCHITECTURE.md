# UiPath MCP Server - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architectural Decisions](#architectural-decisions)
3. [Design Rationale](#design-rationale)
4. [Implementation Details](#implementation-details)
5. [Tool vs Resource Strategy](#tool-vs-resource-strategy)
6. [Consumption Patterns](#consumption-patterns)

---

## Overview

The UiPath MCP Server is a **Model Context Protocol** implementation that bridges AI assistants (like Claude) with the UiPath automation platform. It exposes the UiPath TypeScript SDK capabilities through a standardized protocol that AI models can understand and interact with.

### What is MCP?

Model Context Protocol (MCP) is an open standard introduced by Anthropic for connecting AI assistants to external tools and data sources. It provides:

- **Tools** - Executable functions that perform actions (write operations)
- **Resources** - URI-addressable data sources (read operations)
- **Standardized Communication** - JSON-RPC 2.0 over stdio/HTTP

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Assistant (Claude)                    │
│                                                              │
│  "Start the MonthlyReport process with region=US"           │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (stdio)
                         │ JSON-RPC 2.0
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    UiPath MCP Server                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Tools    │  │  Resources   │  │   Config     │     │
│  │  (16 tools)  │  │ (27 patterns)│  │   Handler    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         └──────────┬───────┘                                │
│                    ▼                                         │
│         ┌─────────────────────┐                            │
│         │  UiPath SDK Client  │                            │
│         └──────────┬──────────┘                            │
└────────────────────┼────────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    UiPath Cloud Platform                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Orchestrator │  │Action Center │  │ Data Fabric  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Maestro    │  │   Storage    │  │    Assets    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Architectural Decisions

### 1. Separate Package Structure

**Decision:** Create MCP server as a separate package under `packages/mcp-server`

**Rationale:**
- ✅ **Separation of Concerns** - MCP server is a distinct use case from direct SDK usage
- ✅ **Optional Dependency** - Users who don't need MCP don't install those dependencies
- ✅ **Independent Versioning** - Can version and release separately from SDK
- ✅ **Cleaner Dependencies** - MCP SDK dependencies isolated from main SDK
- ✅ **Easier Testing** - Can test MCP functionality independently

**Alternative Considered:** Built-in to main SDK package
- ❌ Bloats main SDK with MCP-specific dependencies
- ❌ Couples SDK evolution to MCP protocol changes
- ❌ Less clear for users who only want SDK or only want MCP

---

### 2. Hybrid Tool/Resource Strategy

**Decision:** Use 16 coarse-grained tools + 27 resource patterns instead of 80+ fine-grained tools

**Rationale:**

#### Tool Granularity Analysis

| Aspect | Fine-Grained (1:1) | Hybrid (Chosen) |
|--------|-------------------|-----------------|
| **Tool Count** | 80-100 tools | 16 tools |
| **AI Context Size** | ~4,000 tokens/request | ~1,000 tokens/request |
| **Maintenance** | High - duplicate code | Low - shared handlers |
| **AI Selection Accuracy** | Lower - too many choices | Higher - clear intent |
| **Read Operations** | ❌ Mixed with tools | ✅ Proper resources |
| **Caching** | ❌ Not possible | ✅ Resources cacheable |

#### Why 16 Tools is Optimal

**Token Budget Analysis:**
- Claude's context window: 200K tokens
- Average conversation: 20 messages
- Tool definitions sent per message: ~50-60 tokens per tool

```
Fine-grained (80 tools):
  80 tools × 60 tokens × 20 messages = 96,000 tokens (48% of budget)

Hybrid (16 tools):
  16 tools × 60 tokens × 20 messages = 19,200 tokens (9.6% of budget)

Savings: 76,800 tokens per conversation = 38.4% of budget freed
```

**AI Decision Quality:**
- Studies show AI accuracy decreases with >20 choices (choice paralysis)
- 16 tools fit comfortably in working memory
- Intent-based naming improves selection accuracy

---

### 3. Tool Design Patterns

**Decision:** Group related operations into smart multi-action tools

#### Pattern 1: Action Parameter

```typescript
// Single tool handles multiple related actions
uipath_update_task {
  action: 'assign' | 'reassign' | 'unassign' | 'complete'
  // Other parameters conditional on action
}
```

**Benefits:**
- Logical grouping of lifecycle operations
- Single documentation page
- Shared validation logic
- Clear state machine

#### Pattern 2: Operation Parameter

```typescript
// Single tool handles CRUD family
uipath_modify_entity {
  action: 'insert' | 'update' | 'delete'
  // Data structure similar across actions
}
```

**Benefits:**
- Consistent API across similar operations
- Easy to extend (add 'upsert', 'bulk')
- Shared error handling

#### Pattern 3: Dedicated Tool for High-Value Operations

```typescript
// Critical operations get own tool for visibility
uipath_start_process { ... }
uipath_cancel_process { ... }
```

**Benefits:**
- High visibility in tool list
- Clear audit trail
- Explicit user intent
- Dedicated error handling

---

### 4. Resource URI Schema

**Decision:** Use hierarchical URI structure like `uipath://domain/resource/id/subresource`

**Examples:**
```
uipath://tasks
uipath://tasks/123
uipath://maestro/instances
uipath://maestro/instances/abc-123/variables
uipath://entities/uuid-123/records
```

**Rationale:**
- ✅ **Intuitive Navigation** - Mimics REST API patterns
- ✅ **Hierarchical Discovery** - AI can browse from general to specific
- ✅ **Type-Safe Parsing** - Easy to route and validate
- ✅ **Extensible** - Can add query parameters later
- ✅ **Standard Pattern** - Familiar to developers

**Alternative Considered:** Flat structure like `uipath://task-123`
- ❌ No clear hierarchy
- ❌ Hard to list related resources
- ❌ Doesn't scale with nested resources

---

### 5. Read vs Write Separation

**Decision:** Strict separation - ALL reads are resources, ALL writes are tools

**Implementation:**

```typescript
// ✅ Correct
Resource: uipath://tasks              → sdk.tasks.getAll()
Resource: uipath://tasks/123          → sdk.tasks.getById(123)
Tool: uipath_create_task              → sdk.tasks.create(...)
Tool: uipath_update_task              → sdk.tasks.assign/complete(...)

// ❌ Wrong
Tool: uipath_get_tasks                → Should be resource!
Tool: uipath_list_processes           → Should be resource!
```

**Rationale:**

| Capability | Tools | Resources |
|------------|-------|-----------|
| **Caching** | ❌ Not cacheable | ✅ AI can cache |
| **Side Effects** | ✅ Expected | ❌ Must be read-only |
| **AI Behavior** | Cautious, may ask confirmation | Freely reads for context |
| **Auditing** | High importance | Low importance |
| **Cost** | Higher (action overhead) | Lower (simple reads) |

**Real-World Impact:**

Scenario: "Show me task 123 and complete it"

```typescript
// With proper separation:
1. AI reads: uipath://tasks/123 (free, fast, cacheable)
2. AI calls: uipath_update_task(action: 'complete')
   Total: 1 tool call

// Without separation (all tools):
1. AI calls: uipath_get_task(123) (tool overhead)
2. AI calls: uipath_complete_task(123) (tool overhead)
   Total: 2 tool calls
```

---

### 6. Error Handling Strategy

**Decision:** Graceful degradation with detailed error messages

**Implementation:**

```typescript
// Tool errors
try {
  const result = await sdk.tasks.create(...);
  return formatSuccess("Task created", result);
} catch (error) {
  return formatError(error); // isError: true
}

// Resource errors
try {
  const data = await sdk.tasks.getAll();
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
} catch (error) {
  return { uri, mimeType: 'text/plain', text: `Error: ${error.message}` };
}
```

**Benefits:**
- ✅ AI receives error context, can retry or suggest alternatives
- ✅ No server crashes - errors returned as data
- ✅ User sees helpful error messages
- ✅ Logging captures full error details

---

### 7. Authentication Strategy

**Decision:** Use secret-based authentication (PAT) rather than OAuth

**Rationale:**

| Aspect | Secret-Based (Chosen) | OAuth |
|--------|----------------------|-------|
| **Setup Complexity** | Simple - just set env var | Complex - redirect flow |
| **Server Type** | Headless (stdio) ✅ | Interactive (HTTP) |
| **Use Case** | Background server ✅ | User-facing app |
| **Token Management** | Manual rotation | Auto-refresh |
| **MCP Compatibility** | Perfect fit ✅ | Awkward |

**Implementation:**
```typescript
const sdk = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  secret: process.env.UIPATH_SECRET, // PAT
});
// SDK is immediately ready - no await sdk.initialize()
```

---

### 8. Transport Layer

**Decision:** Use stdio (Standard Input/Output) transport

**Rationale:**

MCP supports two transports:
1. **stdio** - Process communication via stdin/stdout
2. **HTTP + SSE** - Web server with Server-Sent Events

**Why stdio:**
- ✅ **Native MCP Support** - All MCP clients support stdio
- ✅ **Simple Deployment** - No port management
- ✅ **Secure** - No network exposure
- ✅ **Process Isolation** - Each client gets own process
- ✅ **Claude Desktop Default** - Expected pattern

**When to use HTTP:**
- Multiple clients sharing one server
- Web-based integrations
- Remote server deployment

---

## Implementation Details

### Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── tools/
│   │   ├── definitions.ts       # Tool schemas (what AI sees)
│   │   └── handlers.ts          # Tool implementations
│   ├── resources/
│   │   ├── definitions.ts       # Resource schemas
│   │   └── handlers.ts          # Resource implementations
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── utils/
│       ├── config.ts            # Configuration loading
│       ├── errors.ts            # Error formatting
│       └── logger.ts            # Logging (to stderr)
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md (this file)
```

### Key Components

#### 1. Tool Definitions (`tools/definitions.ts`)

Purpose: Define the contract for each tool (what AI sees)

```typescript
export const TOOL_DEFINITIONS = [
  {
    name: 'uipath_start_process',
    description: 'Start a UiPath Orchestrator process...',
    inputSchema: {
      type: 'object',
      properties: {
        processKey: { type: 'string', description: '...' },
        folderId: { type: 'number', description: '...' },
        // ...
      },
      required: ['processKey', 'folderId'],
    },
  },
  // ... 15 more tools
];
```

**Design Principles:**
- ✅ Clear, descriptive names (verb_noun pattern)
- ✅ Detailed descriptions (AI uses these to decide when to call)
- ✅ Explicit required fields
- ✅ Rich property descriptions

#### 2. Tool Handlers (`tools/handlers.ts`)

Purpose: Implement tool logic by calling SDK

```typescript
export class ToolHandlers {
  constructor(private sdk: UiPath) {}

  async handleToolCall(toolName: string, args: any): Promise<ToolResponse> {
    switch (toolName) {
      case 'uipath_start_process':
        return await this.startProcess(args);
      // ... route to handlers
    }
  }

  private async startProcess(args: StartProcessArgs): Promise<ToolResponse> {
    const result = await this.sdk.processes.start({ ... }, args.folderId);
    return formatSuccess('Process started!', { jobKey: result.key });
  }
}
```

**Design Principles:**
- ✅ Single responsibility - one handler per tool
- ✅ Type-safe arguments
- ✅ Consistent error handling
- ✅ Informative success messages

#### 3. Resource Definitions (`resources/definitions.ts`)

Purpose: Catalog available resources for AI to browse

```typescript
export const RESOURCE_DEFINITIONS = [
  {
    uri: 'uipath://tasks',
    name: 'Action Center Tasks',
    description: 'List all Action Center tasks...',
    mimeType: 'application/json',
  },
  // ... 26 more resources
];
```

#### 4. Resource Handlers (`resources/handlers.ts`)

Purpose: Parse URIs and fetch data from SDK

```typescript
export class ResourceHandlers {
  async handleResourceRead(uri: string) {
    const data = await this.routeResource(uri);
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    };
  }

  private async routeResource(uri: string) {
    // Parse: uipath://domain/id/subresource
    // Route to appropriate SDK call
  }
}
```

**Design Principles:**
- ✅ Hierarchical routing (domain → resource → subresource)
- ✅ Graceful error handling (return error as text)
- ✅ Consistent JSON formatting
- ✅ MIME type detection

---

## Tool vs Resource Strategy

### Decision Matrix

Use this matrix to decide if a new SDK method should be a tool or resource:

| Question | Tool | Resource |
|----------|------|----------|
| Does it modify state? | ✅ Yes | ❌ No |
| Does it have side effects? | ✅ Yes | ❌ No |
| Should AI ask before calling? | ✅ Yes | ❌ No |
| Is it expensive/rate-limited? | ✅ Maybe | ❌ Rarely |
| Should it be audited? | ✅ Yes | ❌ Low priority |
| Can results be cached? | ❌ No | ✅ Yes |
| Is it read-only? | ❌ No | ✅ Yes |

### Examples

```typescript
// ✅ Resources (read-only)
sdk.tasks.getAll()           → uipath://tasks
sdk.tasks.getById(123)       → uipath://tasks/123
sdk.processes.getAll()       → uipath://processes
sdk.entities.getRecords()    → uipath://entities/{id}/records

// ✅ Tools (write/action)
sdk.tasks.create()           → uipath_create_task
sdk.tasks.assign()           → uipath_update_task (action: assign)
sdk.processes.start()        → uipath_start_process
sdk.entities.insert()        → uipath_modify_entity (action: insert)

// 🤔 Edge Cases
sdk.queues.getItems()        → Resource (read-only list)
sdk.queues.getNextItem()     → Tool! (pops from queue - state change)
sdk.assets.getValue()        → Tool (may contain secrets, explicit intent)
sdk.buckets.getReadUri()     → Tool (generates temporary URL - action)
```

---

## Consumption Patterns

### Pattern 1: Claude Desktop (Primary)

**Configuration:**
```json
{
  "mcpServers": {
    "uipath": {
      "command": "npx",
      "args": ["-y", "@uipath/mcp-server"],
      "env": { "UIPATH_BASE_URL": "...", ... }
    }
  }
}
```

**How it works:**
1. User opens Claude Desktop
2. Claude spawns MCP server process via stdio
3. Server loads config from env vars
4. Server lists tools/resources to Claude
5. User chats → Claude reads resources & calls tools
6. Server proxies to UiPath Cloud
7. Results returned to Claude → formatted for user

**Pros:**
- ✅ Zero setup after config
- ✅ Automatic updates (npx pulls latest)
- ✅ Secure (local process, no network)
- ✅ Integrated experience

**Cons:**
- ⚠️ Requires Claude Desktop
- ⚠️ Credentials in config file

---

### Pattern 2: Custom Application (TypeScript)

**Code:**
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'my-app', version: '1.0.0' }, {});

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/mcp-server/dist/index.js'],
  env: { UIPATH_BASE_URL: '...', ... },
});

await client.connect(transport);

// Call a tool
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'uipath_start_process',
    arguments: { processKey: 'MyProcess', folderId: 123 },
  },
});

// Read a resource
const tasks = await client.request({
  method: 'resources/read',
  params: { uri: 'uipath://tasks' },
});
```

**Use Cases:**
- Custom AI agent applications
- Automation scripting tools
- Integration with other AI models
- Batch processing workflows

---

### Pattern 3: HTTP Server (Future)

**Not yet implemented** - would require:

```typescript
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const transport = new HttpServerTransport({
  port: 3000,
  path: '/mcp',
});

await server.connect(transport);
```

**Use Cases:**
- Shared server for multiple clients
- Web-based AI integrations
- Remote MCP access
- Kubernetes deployment

---

## Performance Considerations

### 1. Caching Strategy

**Resources (Cacheable):**
```typescript
// AI can cache resource reads
uipath://tasks → Cached for 60s
uipath://processes → Cached for 5min
```

**Tools (Not Cacheable):**
```typescript
// Always fresh execution
uipath_start_process → No cache
uipath_create_task → No cache
```

### 2. Pagination

**Implementation:**
```typescript
// Fetch with reasonable defaults
await sdk.tasks.getAll({ pageSize: 100 });
await sdk.maestro.processes.instances.getAll({ pageSize: 100 });
```

**Rationale:**
- AI can always request more via URI parameters
- 100 items balances completeness vs. performance
- Token-based pagination for stateful iteration

### 3. Connection Pooling

**Current:** Single SDK instance per server process

```typescript
const sdk = new UiPath(config); // Reused across all requests
```

**Benefits:**
- ✅ HTTP connection reuse
- ✅ Faster subsequent requests
- ✅ Lower memory footprint

---

## Security Considerations

### 1. Credential Storage

**✅ Secure:**
- Environment variables (ephemeral)
- Claude config file (OS-protected)
- Secret management services (Vault, etc.)

**❌ Insecure:**
- Hardcoded in source
- Committed to git
- Plain text in shared locations

### 2. Least Privilege

Generate PATs with minimal scopes:

```
Required Scopes:
- OR.Execution (start processes)
- OR.Queues (read queues)
- OR.Assets (read assets)
- AC.Tasks (manage tasks)
- DF.Entities (read/write entities)
```

### 3. Audit Trail

All tool calls are logged:

```typescript
logger.info(`Tool called: ${toolName}`, args);
```

Configure log forwarding to SIEM for compliance.

---

## Extension Points

### Adding New Tools

1. **Define schema** in `tools/definitions.ts`:
```typescript
{
  name: 'uipath_new_operation',
  description: '...',
  inputSchema: { ... },
}
```

2. **Implement handler** in `tools/handlers.ts`:
```typescript
private async newOperation(args: NewOperationArgs) {
  const result = await this.sdk.someService.someMethod(args);
  return formatSuccess('Operation complete', result);
}
```

3. **Route in switch**:
```typescript
case 'uipath_new_operation':
  return await this.newOperation(args);
```

### Adding New Resources

1. **Define URI** in `resources/definitions.ts`:
```typescript
{
  uri: 'uipath://new-domain/{id}',
  name: 'New Resource',
  description: '...',
  mimeType: 'application/json',
}
```

2. **Implement handler** in `resources/handlers.ts`:
```typescript
private async handleNewDomainResource(parts: string[]) {
  const id = parts[0];
  return await this.sdk.newService.getById(id);
}
```

3. **Route in switch**:
```typescript
case 'new-domain':
  return this.handleNewDomainResource(rest);
```

---

## Future Enhancements

### 1. Dynamic Resource Templates

Allow parameterized resources:

```typescript
// Current: Fixed URIs
uipath://tasks

// Future: Query parameters
uipath://tasks?filter=priority eq 'High'&orderBy=dueDate
```

### 2. Prompts

MCP supports "prompts" - pre-defined conversation templates:

```typescript
server.setRequestHandler('prompts/list', () => ({
  prompts: [
    {
      name: 'daily-report',
      description: 'Generate daily automation report',
      arguments: [{ name: 'date', description: 'Report date' }],
    },
  ],
}));
```

### 3. Sampling

MCP supports "sampling" - AI can request completions from other models:

```typescript
// Use specialized model for code generation
const code = await client.sample({
  messages: [...],
  systemPrompt: 'You are an expert in UiPath automation...',
});
```

### 4. Authentication Helpers

```typescript
// Tool to validate credentials
uipath_test_connection → Returns connection status

// Tool to rotate PAT
uipath_rotate_token → Generates new PAT
```

---

## Conclusion

The UiPath MCP Server architecture prioritizes:

1. **AI Performance** - Minimal context overhead with 16 tools
2. **Developer Experience** - Clear patterns, easy to extend
3. **Maintainability** - DRY principle, shared handlers
4. **Proper MCP Usage** - Resources for reads, tools for writes
5. **Security** - Least privilege, no credential leakage
6. **Production Ready** - Error handling, logging, type safety

This design enables natural language automation workflows while maintaining the flexibility to evolve as the MCP standard and UiPath SDK mature.

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [UiPath TypeScript SDK](../../README.md)
- [Claude Desktop Documentation](https://claude.ai/download)
