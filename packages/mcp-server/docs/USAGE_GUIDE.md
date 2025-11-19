# UiPath MCP Server - Usage Guide

## Quick Reference for Claude Desktop Users

When using Claude Desktop with the UiPath MCP server, you can access UiPath data in two ways:

### 📖 Resources (Read-Only)
Resources allow you to **browse and read** data without making changes. These don't require folder IDs.

### 🔨 Tools (Actions)
Tools allow you to **perform actions** like creating tasks, starting processes, etc. These may require folder IDs.

---

## Common Operations

### View All Tasks (No Folder ID Required)

**What to ask:**
```
Show me all my Action Center tasks
Can you list my tasks?
What tasks do I have?
```

**What Claude will do:**
- Read from resource: `uipath://tasks`
- Returns: List of all your Action Center tasks across all folders

**Example response structure:**
```json
{
  "items": [
    {
      "id": 123,
      "title": "Review Invoice",
      "priority": "High",
      "status": "Pending",
      "folderId": 456
    }
  ]
}
```

---

### View Specific Task Details

**What to ask:**
```
Show me details for task 123
What's in task 123?
```

**What Claude will do:**
- Read from resource: `uipath://tasks/123`
- Returns: Full details of task 123

---

### View All Maestro Processes

**What to ask:**
```
List all my Maestro processes
Show me my workflows
What processes are available?
```

**What Claude will do:**
- Read from resource: `uipath://maestro/processes`
- Returns: All Maestro process definitions

---

### View Running Process Instances

**What to ask:**
```
Show me running process instances
What instances are currently executing?
List my active workflows
```

**What Claude will do:**
- Read from resource: `uipath://maestro/instances`
- Returns: All process instances with their status

---

### View Process Instance Details

**What to ask:**
```
Show me details for instance abc-123
What's the status of instance abc-123?
Show me variables for instance abc-123
```

**What Claude will do:**
- Read from resource: `uipath://maestro/instances/abc-123`
- For variables: `uipath://maestro/instances/abc-123/variables`
- For history: `uipath://maestro/instances/abc-123/history`

---

### View Data Fabric Entities

**What to ask:**
```
What entities do I have in Data Fabric?
List my entities
Show me all my data tables
```

**What Claude will do:**
- Read from resource: `uipath://entities`
- Returns: List of all Data Fabric entities

---

### View Entity Records

**What to ask:**
```
Show me records from entity {entity-id}
What data is in the Customers entity?
```

**What Claude will do:**
- Read from resource: `uipath://entities/{entity-id}/records`
- Returns: Records from the specified entity (up to 100)

---

### View Orchestrator Processes

**What to ask:**
```
List my Orchestrator processes
What automation processes are available?
```

**What Claude will do:**
- Read from resource: `uipath://processes`
- Returns: All Orchestrator process releases

---

### View Assets

**What to ask:**
```
Show me my Orchestrator assets
List all my configuration assets
```

**What Claude will do:**
- Read from resource: `uipath://assets`
- Returns: All assets

---

### View Queues

**What to ask:**
```
What queues do I have?
List my work queues
```

**What Claude will do:**
- Read from resource: `uipath://queues`
- Returns: All queue definitions

---

### View Storage Buckets

**What to ask:**
```
Show me my storage buckets
What files are in bucket {bucket-id}?
```

**What Claude will do:**
- Read from resource: `uipath://buckets`
- For files: `uipath://buckets/{bucket-id}/files`

---

## Action Operations (Require Folder IDs)

### Create a Task

**What to ask:**
```
Create a task titled "Review Invoice" with high priority in folder 456
```

**What Claude will do:**
- Call tool: `uipath_create_task`
- Requires: `title`, `folderId`
- Optional: `priority`

---

### Start a Process

**What to ask:**
```
Start the MonthlyReport process in folder 123
```

**What Claude will do:**
- Call tool: `uipath_start_process`
- Requires: `processKey`, `folderId`
- Optional: `inputArguments`

---

### Assign/Complete a Task

**What to ask:**
```
Assign task 123 to user 456 in folder 789
Complete task 123 in folder 789
```

**What Claude will do:**
- Call tool: `uipath_update_task`
- Requires: `action`, `taskId`, `folderId`
- For assign: also requires `userId`

---

### Control Process Instances

**What to ask:**
```
Pause process instance abc-123 in folder default
Resume process instance abc-123 in folder default
Cancel process instance abc-123 in folder default
```

**What Claude will do:**
- Call tool: `uipath_control_process_instance` or `uipath_cancel_process`
- Requires: `instanceId`, `folderKey`

---

## Complete Workflows

### Workflow 1: Review and Complete Tasks

```
1. Show me all my tasks
2. Show me details for task 123
3. Assign task 123 to user 456 in folder 789
4. Complete task 123 in folder 789
```

### Workflow 2: Monitor Process Execution

```
1. List my Maestro processes
2. Show me running instances
3. Show me details for instance abc-123
4. Show me variables for instance abc-123
5. If needed: Pause instance abc-123 in folder default
```

### Workflow 3: Work with Data

```
1. Show me my Data Fabric entities
2. Show me the schema for entity {entity-id}
3. Show me records from entity {entity-id}
4. Query entity {entity-id} with filter "status eq 'Active'"
```

---

## Tips for Best Results

### ✅ DO:
- Use natural language - Claude understands conversational requests
- Reference tasks/processes by their IDs when you know them
- Ask to "show", "list", or "display" for read operations
- Say "create", "start", "assign" for action operations
- Specify folder IDs when performing actions

### ❌ DON'T:
- Don't try to reference folder IDs for read operations (tasks, processes list, etc.)
- Don't worry about exact API syntax - Claude will translate
- Don't specify folder IDs when just browsing/listing resources

---

## Troubleshooting

### "I don't have access to that"
- Make sure the MCP server is running (check Claude Desktop logs)
- Verify your credentials are correct in the config
- Restart Claude Desktop

### "Folder ID required"
- This is expected for **action operations** (create, update, etc.)
- Read operations (list, show, display) don't need folder IDs
- Check what folder your resource is in and provide that ID

### "Resource not found"
- Verify the ID exists (task ID, entity ID, etc.)
- Check that you have permissions to access it
- Try listing all resources first to find the correct ID

---

## Available Resources (No Folder ID Needed)

- `uipath://tasks` - All Action Center tasks
- `uipath://tasks/{id}` - Specific task details
- `uipath://maestro/processes` - Maestro process definitions
- `uipath://maestro/instances` - Process instances
- `uipath://maestro/instances/{id}` - Instance details
- `uipath://maestro/instances/{id}/variables` - Instance variables
- `uipath://maestro/instances/{id}/history` - Execution history
- `uipath://entities` - Data Fabric entities
- `uipath://entities/{id}` - Entity schema
- `uipath://entities/{id}/records` - Entity data
- `uipath://processes` - Orchestrator processes
- `uipath://assets` - Orchestrator assets
- `uipath://queues` - Work queues
- `uipath://buckets` - Storage buckets

## Available Tools (May Need Folder IDs)

- `uipath_start_process` - Start a process
- `uipath_create_task` - Create a task
- `uipath_update_task` - Assign/complete/update task
- `uipath_cancel_process` - Cancel process instance
- `uipath_control_process_instance` - Pause/resume instance
- `uipath_query_entity` - Query entity with filters
- `uipath_modify_entity` - Insert/update/delete entity data
- `uipath_upload_file` - Upload to bucket
- `uipath_get_file_url` - Get download URL
- `uipath_get_asset_value` - Get asset value
- `uipath_add_queue_item` - Add to queue
- `uipath_get_queue_item` - Get queue item

---

## Summary

**For browsing/reading data:** Just ask naturally - no folder IDs needed!
**For taking actions:** Specify the folder ID when prompted.

The MCP server automatically knows which operations need folder IDs and which don't. Just describe what you want to do in natural language, and Claude will handle the rest!
