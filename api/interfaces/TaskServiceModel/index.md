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

#### Example

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

#### Example

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
