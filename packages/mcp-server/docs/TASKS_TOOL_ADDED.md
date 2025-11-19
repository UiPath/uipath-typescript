# Added `uipath_get_tasks` Tool

## Problem

Claude Desktop was not using the `uipath://tasks` resource when asked to "show all tasks." Instead, it was either:
1. Trying to use the `uipath_query_entity` tool (incorrect - that's for Data Fabric entities)
2. Saying no tool is available to retrieve tasks

Even after fixing the resource/template separation, Claude Desktop still preferred tools over resources.

## Solution

Added a **`uipath_get_tasks` tool** to provide an explicit, discoverable way for Claude to retrieve tasks.

This creates a **hybrid approach**:
- **Resource** (`uipath://tasks`) - For context and caching
- **Tool** (`uipath_get_tasks`) - For explicit retrieval when asked

## Implementation

### 1. Tool Definition

**File**: `packages/mcp-server/src/tools/definitions.ts`

```typescript
{
  name: 'uipath_get_tasks',
  description:
    'Retrieve Action Center tasks with optional filtering. Use this to list, search, or get all tasks. No folder ID required - returns tasks across all folders.',
  inputSchema: {
    type: 'object',
    properties: {
      pageSize: {
        type: 'number',
        description: 'Maximum number of tasks to return (default: 100)',
      },
      status: {
        type: 'string',
        description: 'Filter by task status: Unassigned, Pending, Completed, etc.',
      },
      assignedToUser: {
        type: 'string',
        description: 'Filter by assigned user ID or username',
      },
    },
    required: [],
  },
}
```

### 2. Tool Handler

**File**: `packages/mcp-server/src/tools/handlers.ts`

```typescript
private async getTasks(args: {
  pageSize?: number;
  status?: string;
  assignedToUser?: string
}): Promise<ToolResponse> {
  const options: any = {
    pageSize: args.pageSize || 100,
  };

  // Add filters if provided
  if (args.status) {
    options.status = args.status;
  }
  if (args.assignedToUser) {
    options.assignedToUser = args.assignedToUser;
  }

  const result = await this.sdk.tasks.getAll(options);

  return formatSuccess(
    `Retrieved ${result.items?.length || 0} tasks`,
    result
  );
}
```

### 3. Router Update

Added case to the tool router:

```typescript
case 'uipath_get_tasks':
  return await this.getTasks(args);
```

## Usage

Now Claude Desktop can retrieve tasks in two ways:

### Method 1: Using the Tool (Explicit)
```
User: "Show me all my Action Center tasks"
Claude: [Calls uipath_get_tasks tool]
```

### Method 2: Reading the Resource (Context)
```
User: "Read the uipath://tasks resource"
Claude: [Reads from resource]
```

## Benefits

### Why Add a Tool When We Have a Resource?

1. **Discoverability**: Tools are more prominent in Claude's decision-making
2. **Filtering**: Tool allows optional filtering by status, user, page size
3. **Explicit Intent**: When user asks to "get" or "show" tasks, tool is the clear choice
4. **Backwards Compatibility**: Some MCP clients may handle tools better than resources

### Resource Still Valuable

The `uipath://tasks` resource remains important for:
- **Caching**: Claude can cache resource data
- **Browsing**: Resources are meant for browsing/context
- **MCP Pattern**: Following proper MCP design (resources for reads, tools for actions)

## Tool Count Update

The MCP server now has **17 tools** (was 16):

1. `uipath_start_process`
2. `uipath_cancel_process`
3. `uipath_control_process_instance`
4. **`uipath_get_tasks`** ← NEW
5. `uipath_create_task`
6. `uipath_update_task`
7. `uipath_query_entity`
8. `uipath_modify_entity`
9. `uipath_upload_file`
10. `uipath_get_file_url`
11. `uipath_get_asset_value`
12. `uipath_add_queue_item`
13. `uipath_get_queue_item`
14. (3 more tools not shown)

## Testing

After restarting Claude Desktop, test with:

```
"Show me all my Action Center tasks"
"Get tasks with status Pending"
"List all unassigned tasks"
```

Claude should now successfully call the `uipath_get_tasks` tool and return your tasks.

## Architecture Decision

This hybrid approach (tools + resources) is pragmatic:

- **Pure resources** would be ideal in theory
- **Hybrid approach** works better in practice with current Claude Desktop behavior
- As MCP adoption matures, we can shift more toward resources
- For now, critical read operations get both a tool AND a resource

## Next Candidates

Other read operations that might benefit from dual tool+resource exposure:
- Process instances (`uipath_get_process_instances`)
- Entity records (already has `uipath_query_entity` tool)
- Assets (`uipath_get_assets`)
- Queues (`uipath_get_queues`)

---

**Added**: November 14, 2025
**Impact**: High - Enables task retrieval in Claude Desktop
**Tool Type**: Read operation (typically would be resource-only, but tool added for discoverability)
