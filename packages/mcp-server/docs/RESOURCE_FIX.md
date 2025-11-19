# MCP Resource Fix - November 14, 2025

## Problem Identified

Claude Desktop was not properly recognizing the `uipath://tasks` resource and instead was trying to use the `uipath_query_entity` tool when asked to "show all tasks."

## Root Cause

The MCP specification distinguishes between two types of resource definitions:

1. **Static Resources** - Fixed URIs that return collections/lists
   - Use the `uri` field
   - Examples: `uipath://tasks`, `uipath://processes`
   - Returned via `resources/list` endpoint

2. **Resource Templates** - Parameterized URIs for accessing specific items
   - Use the `uriTemplate` field with RFC 6570 URI template syntax
   - Examples: `uipath://tasks/{taskId}`, `uipath://entities/{entityId}`
   - Returned via `resources/templates/list` endpoint

Our original implementation incorrectly mixed both types in a single array and only implemented the `resources/list` handler, not the `resources/templates/list` handler.

## Solution Implemented

### 1. Split Resource Definitions

**File**: `packages/mcp-server/src/resources/definitions.ts`

Split the resource definitions into two separate arrays:

```typescript
// Static resources (10 items)
export const STATIC_RESOURCES = [
  {
    uri: 'uipath://tasks',
    name: 'Action Center Tasks',
    description: 'List ALL Action Center tasks...',
    mimeType: 'application/json',
  },
  // ... 9 more static resources
];

// Resource templates (17 items)
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'uipath://tasks/{taskId}',
    name: 'Action Center Task Details',
    description: 'Get detailed information about a specific task...',
    mimeType: 'application/json',
  },
  // ... 16 more templates
];
```

### 2. Added Resource Templates Handler

**File**: `packages/mcp-server/src/index.ts`

Added the missing handler for resource templates:

```typescript
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,  // NEW
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Register static resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: STATIC_RESOURCES,
  };
});

// Register resource templates handler (NEW)
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: RESOURCE_TEMPLATES,
  };
});
```

### 3. No Changes to Resource Handlers Needed

The resource read handler (`ReadResourceRequestSchema`) already works correctly because it parses URIs dynamically. It doesn't care whether a resource was defined with `uri` or `uriTemplate` - it just handles whatever URI is requested.

## Testing the Fix

### 1. Restart Claude Desktop

After rebuilding the MCP server, you must restart Claude Desktop to pick up the changes:

```bash
# Quit Claude Desktop completely
# Then restart it
```

### 2. Verify Resource Availability

Ask Claude Desktop:
```
"What resources do you have available from UiPath?"
```

Claude should now see both:
- Static resources (like `uipath://tasks`)
- Resource templates (like `uipath://tasks/{taskId}`)

### 3. Test Task Listing

Ask Claude Desktop:
```
"Show me all my Action Center tasks"
```

Claude should now:
1. ✅ Read from the `uipath://tasks` resource directly
2. ❌ NOT try to use `uipath_query_entity` tool

## Why This Fix Matters

### Before the Fix
- Claude only saw a mixed list of resources
- The templated resources weren't properly registered
- Claude would default to using tools instead of resources
- Resources weren't being browsed/cached efficiently

### After the Fix
- Claude sees 10 static resources for browsing collections
- Claude sees 17 templates for accessing specific items
- Claude can properly distinguish between read operations (resources) and write operations (tools)
- Better token efficiency through resource caching

## Resource Breakdown

### Static Resources (10)
1. `uipath://tasks` - All tasks
2. `uipath://tasks/users` - Task-eligible users
3. `uipath://processes` - Orchestrator processes
4. `uipath://maestro/processes` - Maestro processes
5. `uipath://maestro/instances` - Process instances
6. `uipath://entities` - Data Fabric entities
7. `uipath://assets` - Orchestrator assets
8. `uipath://queues` - Work queues
9. `uipath://buckets` - Storage buckets
10. `uipath://cases` - Case processes

### Resource Templates (17)
1. `uipath://tasks/{taskId}` - Specific task
2. `uipath://processes/{processId}` - Specific process
3. `uipath://maestro/processes/{processKey}` - Specific Maestro process
4. `uipath://maestro/instances/{instanceId}` - Instance details
5. `uipath://maestro/instances/{instanceId}/variables` - Instance variables
6. `uipath://maestro/instances/{instanceId}/history` - Execution history
7. `uipath://maestro/instances/{instanceId}/incidents` - Instance incidents
8. `uipath://maestro/instances/{instanceId}/bpmn` - BPMN diagram
9. `uipath://entities/{entityId}` - Entity schema
10. `uipath://entities/{entityId}/records` - Entity records
11. `uipath://assets/{assetId}` - Specific asset
12. `uipath://queues/{queueId}` - Specific queue
13. `uipath://buckets/{bucketId}` - Specific bucket
14. `uipath://buckets/{bucketId}/files` - Bucket files
15. `uipath://case-instances/{instanceId}` - Case instance

## References

- [MCP Specification - Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [RFC 6570 - URI Templates](https://tools.ietf.org/html/rfc6570)
- MCP SDK Types: `@modelcontextprotocol/sdk/types.js`

## Next Steps

1. ✅ Rebuild complete (`npm run build`)
2. ⏳ Restart Claude Desktop
3. ⏳ Test resource browsing
4. ⏳ Verify task listing works correctly
5. ⏳ Test other resource types

---

**Fixed**: November 14, 2025
**Impact**: Critical - Enables proper resource browsing in Claude Desktop
