Service for managing UiPath Action Center

Tasks are task-based automation components that can be integrated into applications and processes. They represent discrete units of work that can be triggered and monitored through the UiPath API. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)

### Usage

```
import { Tasks } from '@uipath/uipath-typescript/tasks';

const tasks = new Tasks(sdk);
const allTasks = await tasks.getAll();
```

## Methods

### assign()

> **assign**(`options`: `TaskAssignmentOptions` | `TaskAssignmentOptions`[]): `Promise`\<`OperationResponse`\<`TaskAssignmentOptions`[] | `TaskAssignmentResponse`[]>>

Assigns tasks to users

#### Parameters

- `options`: `TaskAssignmentOptions` | `TaskAssignmentOptions`[] — Single task assignment or array of task assignments

#### Returns

`Promise`\<`OperationResponse`\<`TaskAssignmentOptions`[] | `TaskAssignmentResponse`[]>>

Promise resolving to array of task assignment results [TaskAssignmentResponse](../TaskAssignmentResponse/)

#### Examples

```
// Assign a single task to a user by ID
const result = await tasks.assign({
  taskId: <taskId>,
  userId: <userId>
});

// Or using instance method
const task = await tasks.getById(<taskId>);
const result = await task.assign({
  userId: <userId>
});

// Assign a single task to a user by email
const result = await tasks.assign({
  taskId: <taskId>,
  userNameOrEmail: "user@example.com"
});

// Assign multiple tasks
const result = await tasks.assign([
  { taskId: <taskId1>, userId: <userId> },
  { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
]);
```

```
import { TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks';

// Assign to a directory group by userId + criteria — Action Center
// distributes the task across the group's members based on the criteria
const result = await tasks.assign({
  taskId: <taskId>,
  userId: <groupId>, // a DirectoryGroup id from tasks.getUsers()
  assignmentCriteria: TaskAssignmentCriteria.AllUsers
});

// ...or identify the group by name instead of id
const result2 = await tasks.assign({
  taskId: <taskId>,
  userNameOrEmail: "<groupName>",
  assignmentCriteria: TaskAssignmentCriteria.AllUsers
});
```

### complete()

> **complete**(`options`: `TaskCompletionOptions`, `folderId`: `number`): `Promise`\<`OperationResponse`\<`TaskCompletionOptions`>>

Completes a task with the specified type and data

#### Parameters

- `options`: `TaskCompletionOptions` — The completion options including task type, taskId, data, and action
- `folderId`: `number` — Required folder ID

#### Returns

`Promise`\<`OperationResponse`\<`TaskCompletionOptions`>>

Promise resolving to completion result [TaskCompleteOptions](../../type-aliases/TaskCompleteOptions/)

#### Example

```
// Complete an app task
await tasks.complete({
  type: TaskType.App,
  taskId: <taskId>,
  data: {},
  action: "submit"
}, <folderId>); // folderId is required

// Complete an external task
await tasks.complete({
  type: TaskType.External,
  taskId: <taskId>
}, <folderId>); // folderId is required
```

### create()

> **create**(`options`: `TaskCreateOptions`, `folderId`: `number`): `Promise`\<`TaskCreateResponse`>

Creates a new task

#### Parameters

- `options`: `TaskCreateOptions` — The task to be created
- `folderId`: `number` — Required folder ID

#### Returns

`Promise`\<`TaskCreateResponse`>

Promise resolving to the created task [TaskCreateResponse](../../type-aliases/TaskCreateResponse/)

#### Example

```
import { TaskPriority } from '@uipath/uipath-typescript';
const task = await tasks.create({
  title: "My Task",
  priority: TaskPriority.Medium
}, <folderId>); // folderId is required
```

### createCatalog()

> **createCatalog**(`request`: `TaskCatalogCreateRequest`, `options?`: `FolderScopedOptions`): `Promise`\<`TaskCatalogGetResponse`>

Creates a task catalog.

#### Parameters

- `request`: `TaskCatalogCreateRequest` — The task catalog to create
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath) to create it in

#### Returns

`Promise`\<`TaskCatalogGetResponse`>

The created task catalog [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Example

```
const catalog = await tasks.createCatalog({ name: "Invoices" }, { folderId: <folderId> });
```

### createNote()

> **createNote**(`taskId`: `number`, `text`: `string`, `options?`: `FolderScopedOptions`): `Promise`\<`TaskNoteGetResponse`>

Creates a note on a task.

#### Parameters

- `taskId`: `number` — Id of the task the note belongs to
- `text`: `string` — Note text (max 512 characters)
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`TaskNoteGetResponse`>

The created note [TaskNoteGetResponse](../TaskNoteGetResponse/)

#### Example

```
const note = await tasks.createNote(<taskId>, "Escalated", { folderId: <folderId> });
```

### editMetadata()

> **editMetadata**(`taskId`: `number`, `options?`: `TaskEditMetadataOptions`): `Promise`\<`void`>

Edits a task's metadata (title, priority, catalog association, ...).

#### Parameters

- `taskId`: `number` — Id of the task to edit
- `options?`: `TaskEditMetadataOptions` — Fields to change plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the edit completes

#### Example

```
import { TaskPriority } from '@uipath/uipath-typescript/tasks';
await tasks.editMetadata(<taskId>, { title: "Review invoice", priority: TaskPriority.High, folderId: <folderId> });
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskGetResponse`> : `NonPaginatedResponse`\<`TaskGetResponse`>>

Gets all tasks across folders with optional filtering

#### Type Parameters

- `T` *extends* `TaskGetAllOptions` = `TaskGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId, asTaskAdmin flag and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskGetResponse`> : `NonPaginatedResponse`\<`TaskGetResponse`>>

Promise resolving to either an array of tasks NonPaginatedResponse or a PaginatedResponse when pagination options are used. [TaskGetResponse](../../type-aliases/TaskGetResponse/)

#### Example

```
// Standard array return
const allTasks = await tasks.getAll();

// Get tasks within a specific folder
const folderTasks = await tasks.getAll({
  folderId: 123
});

// Get tasks with admin permissions
// This fetches tasks across folders where the user has Task.View, Task.Edit and TaskAssignment.Create permissions
const adminTasks = await tasks.getAll({
  asTaskAdmin: true
});

// Get tasks without admin permissions (default)
// This fetches tasks across folders where the user has Task.View and Task.Edit permissions
const userTasks = await tasks.getAll({
  asTaskAdmin: false
});

// First page with pagination
const page1 = await tasks.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await tasks.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await tasks.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

### getById()

> **getById**(`id`: `number`, `options?`: `TaskGetByIdOptions`, `folderId?`: `number`): `Promise`\<`TaskGetResponse`>

Gets a task by ID

#### Parameters

- `id`: `number` — The ID of the task to retrieve
- `options?`: `TaskGetByIdOptions` — Optional query parameters including taskType for faster retrieval [TaskGetByIdOptions](../TaskGetByIdOptions/)
- `folderId?`: `number` — Optional folder ID (REQUIRED when options.taskType is provided)

#### Returns

`Promise`\<`TaskGetResponse`>

Promise resolving to the task [TaskGetResponse](../../type-aliases/TaskGetResponse/)

#### Example

```
// Get a task by ID
const task = await tasks.getById(<taskId>);

// Get a form task by ID
const formTask = await tasks.getById(<taskId>, {}, <folderId>);

// Access form task properties
console.log(formTask.formLayout);

// Get a document validation task by ID (faster with taskType provided in the options)
const dvTask = await tasks.getById(<taskId>, { taskType: TaskType.DocumentValidation }, <folderId>);
```

### getCatalogById()

> **getCatalogById**(`id`: `number`, `options?`: `TaskCatalogGetByIdOptions`): `Promise`\<`TaskCatalogGetResponse`>

Gets a task catalog by id.

#### Parameters

- `id`: `number` — The task catalog id
- `options?`: `TaskCatalogGetByIdOptions` — Folder scope (folderId, folderKey, or folderPath) plus expand/select

#### Returns

`Promise`\<`TaskCatalogGetResponse`>

The task catalog [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Example

```
const catalog = await tasks.getCatalogById(<catalogId>, { folderId: <folderId> });
```

### getCatalogs()

> **getCatalogs**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskCatalogGetResponse`> : `NonPaginatedResponse`\<`TaskCatalogGetResponse`>>

Gets task catalogs in a folder.

#### Type Parameters

- `T` *extends* `TaskCatalogGetAllOptions` = `TaskCatalogGetAllOptions`

#### Parameters

- `options?`: `T` — Folder scope (folderId, folderKey, or folderPath) plus query and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskCatalogGetResponse`> : `NonPaginatedResponse`\<`TaskCatalogGetResponse`>>

The task catalogs [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Example

```
const catalogs = await tasks.getCatalogs({ folderId: <folderId> });
```

### getData()

> **getData**(`taskId`: `number`, `options?`: `FolderScopedOptions`): `Promise`\<`TaskDataGetResponse`>

Gets a task's data (form/task payload) and core metadata.

Works for any task type (Form, App, External, etc.).

#### Parameters

- `taskId`: `number` — The task to fetch data for
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`TaskDataGetResponse`>

The task data [TaskDataGetResponse](../TaskDataGetResponse/)

#### Example

```
const task = await tasks.getData(<taskId>, { folderId: <folderId> });
console.log(task.data);
```

### getNotes()

> **getNotes**\<`T`>(`taskId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskNoteGetResponse`> : `NonPaginatedResponse`\<`TaskNoteGetResponse`>>

Gets the notes for a task.

#### Type Parameters

- `T` *extends* `TaskNoteGetByTaskIdOptions` = `TaskNoteGetByTaskIdOptions`

#### Parameters

- `taskId`: `number` — The task to list notes for
- `options?`: `T` — Folder scope (folderId, folderKey, or folderPath) plus query and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskNoteGetResponse`> : `NonPaginatedResponse`\<`TaskNoteGetResponse`>>

The task's notes [TaskNoteGetResponse](../TaskNoteGetResponse/)

#### Example

```
const notes = await tasks.getNotes(<taskId>, { folderId: <folderId> });
```

### getUsers()

> **getUsers**\<`T`>(`folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`UserLoginInfo`> : `NonPaginatedResponse`\<`UserLoginInfo`>>

Gets task users (users, robots, groups etc) in the given folder who have Tasks.View and Tasks.Edit permissions Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided, or a PaginatedResponse when any pagination parameter is provided

#### Type Parameters

- `T` *extends* `TaskGetUsersOptions` = `TaskGetUsersOptions`

#### Parameters

- `folderId`: `number` — The folder ID to get task users from
- `options?`: `T` — Optional query and pagination parameters

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`UserLoginInfo`> : `NonPaginatedResponse`\<`UserLoginInfo`>>

Promise resolving to either an array of task users NonPaginatedResponse or a PaginatedResponse when pagination options are used. [UserLoginInfo](../UserLoginInfo/)

#### Example

```
// Get task users from a folder
const users = await tasks.getUsers(<folderId>);

// Access user properties
console.log(users.items[0].name);
console.log(users.items[0].emailAddress);
```

### reassign()

> **reassign**(`options`: `TaskAssignmentOptions` | `TaskAssignmentOptions`[]): `Promise`\<`OperationResponse`\<`TaskAssignmentOptions`[] | `TaskAssignmentResponse`[]>>

Reassigns tasks to new users

#### Parameters

- `options`: `TaskAssignmentOptions` | `TaskAssignmentOptions`[] — Single task assignment or array of task assignments

#### Returns

`Promise`\<`OperationResponse`\<`TaskAssignmentOptions`[] | `TaskAssignmentResponse`[]>>

Promise resolving to array of task assignment results [TaskAssignmentResponse](../TaskAssignmentResponse/)

#### Examples

```
// Reassign a single task to a user by ID
const result = await tasks.reassign({
  taskId: <taskId>,
  userId: <userId>
});

// Or using instance method
const task = await tasks.getById(<taskId>);
const result = await task.reassign({
  userId: <userId>
});

// Reassign a single task to a user by email
const result = await tasks.reassign({
  taskId: <taskId>,
  userNameOrEmail: "user@example.com"
});

// Reassign multiple tasks
const result = await tasks.reassign([
  { taskId: <taskId1>, userId: <userId> },
  { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
]);
```

```
import { TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks';

// Reassign to a directory group by userId + criteria
const result = await tasks.reassign({
  taskId: <taskId>,
  userId: <groupId>, // a DirectoryGroup id from tasks.getUsers()
  assignmentCriteria: TaskAssignmentCriteria.AllUsers
});

// ...or identify the group by name instead of id
const result2 = await tasks.reassign({
  taskId: <taskId>,
  userNameOrEmail: "<groupName>",
  assignmentCriteria: TaskAssignmentCriteria.AllUsers
});
```

### saveData()

> **saveData**(`taskId`: `number`, `data`: `Record`\<`string`, `unknown`>, `options?`: `FolderScopedOptions`): `Promise`\<`void`>

Saves a task's data (form/task payload).

#### Parameters

- `taskId`: `number` — The task to update
- `data`: `Record`\<`string`, `unknown`> — The task data to save
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the save completes

#### Example

```
await tasks.saveData(<taskId>, { amount: 1200, approved: true }, { folderId: <folderId> });
```

### saveTags()

> **saveTags**(`taskId`: `number`, `tags`: `Tag`[], `options?`: `FolderScopedOptions`): `Promise`\<`void`>

Saves the tags on a task, replacing any existing tags.

#### Parameters

- `taskId`: `number` — The task to tag
- `tags`: `Tag`[] — The tags to set
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the save completes

#### Example

```
await tasks.saveTags(<taskId>, [{ name: "priority", displayName: "Priority", displayValue: "High" }], { folderId: <folderId> });
```

### unassign()

> **unassign**(`taskId`: `number` | `number`[]): `Promise`\<`OperationResponse`\<`TaskAssignmentResponse`[] | { `taskId`: `number`; }[]>>

Unassigns tasks (removes current assignees)

#### Parameters

- `taskId`: `number` | `number`[] — Single task ID or array of task IDs to unassign

#### Returns

`Promise`\<`OperationResponse`\<`TaskAssignmentResponse`[] | { `taskId`: `number`; }[]>>

Promise resolving to array of task assignment results [TaskAssignmentResponse](../TaskAssignmentResponse/)

#### Example

```
// Unassign a single task
const result = await tasks.unassign(<taskId>);

// Or using instance method
const task = await tasks.getById(<taskId>);
const result = await task.unassign();

// Unassign multiple tasks
const result = await tasks.unassign([<taskId1>, <taskId2>, <taskId3>]);
```

### updateCatalog()

> **updateCatalog**(`id`: `number`, `request`: `TaskCatalogUpdateRequest`, `options?`: `FolderScopedOptions`): `Promise`\<`void`>

Updates a task catalog.

#### Parameters

- `id`: `number` — The task catalog id
- `request`: `TaskCatalogUpdateRequest` — The updated fields
- `options?`: `FolderScopedOptions` — Folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the update completes

#### Example

```
await tasks.updateCatalog(<catalogId>, { name: "Invoices" }, { folderId: <folderId> });
```
