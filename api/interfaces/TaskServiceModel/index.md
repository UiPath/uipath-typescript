Service for managing UiPath Action Center

Tasks are task-based automation components that can be integrated into applications and processes. They represent discrete units of work that can be triggered and monitored through the UiPath API. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Tasks } from '@uipath/uipath-typescript/tasks';

const tasks = new Tasks(sdk);
const allTasks = await tasks.getAll();
```

## Methods

### assign()

> **assign**(`options`: [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/) | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[]): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

Assigns tasks to users

#### Parameters

| Parameter | Type                                                                 | Description                                                            |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `options` | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/) | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

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

______________________________________________________________________

### complete()

> **complete**(`options`: [`TaskCompletionOptions`](../../type-aliases/TaskCompletionOptions/), `folderId`: `number`): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskCompletionOptions`](../../type-aliases/TaskCompletionOptions/)>>

Completes a task with the specified type and data

#### Parameters

| Parameter  | Type                                                                 | Description                                                          |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `options`  | [`TaskCompletionOptions`](../../type-aliases/TaskCompletionOptions/) | The completion options including task type, taskId, data, and action |
| `folderId` | `number`                                                             | Required folder ID                                                   |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskCompletionOptions`](../../type-aliases/TaskCompletionOptions/)>>

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

______________________________________________________________________

### create()

> **create**(`options`: [`TaskCreateOptions`](../TaskCreateOptions/), `folderId`: `number`): `Promise`\<[`TaskCreateResponse`](../../type-aliases/TaskCreateResponse/)>

Creates a new task

#### Parameters

| Parameter  | Type                                         | Description            |
| ---------- | -------------------------------------------- | ---------------------- |
| `options`  | [`TaskCreateOptions`](../TaskCreateOptions/) | The task to be created |
| `folderId` | `number`                                     | Required folder ID     |

#### Returns

`Promise`\<[`TaskCreateResponse`](../../type-aliases/TaskCreateResponse/)>

Promise resolving to the created task [TaskCreateResponse](../../type-aliases/TaskCreateResponse/)

#### Example

```
import { TaskPriority } from '@uipath/uipath-typescript';
const task = await tasks.create({
  title: "My Task",
  priority: TaskPriority.Medium
}, <folderId>); // folderId is required
```

______________________________________________________________________

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>>

Gets all tasks across folders with optional filtering

#### Type Parameters

| Type Parameter                                                             | Default type                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `T` *extends* [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) | [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                                        |
| ---------- | ---- | ---------------------------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId, asTaskAdmin flag and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>>

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

______________________________________________________________________

### getById()

> **getById**(`id`: `number`, `options?`: [`BaseOptions`](../BaseOptions/), `folderId?`: `number`): `Promise`\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>

Gets a task by ID IMPORTANT: For form tasks, folderId must be provided.

#### Parameters

| Parameter   | Type                             | Description                                  |
| ----------- | -------------------------------- | -------------------------------------------- |
| `id`        | `number`                         | The ID of the task to retrieve               |
| `options?`  | [`BaseOptions`](../BaseOptions/) | Optional query parameters                    |
| `folderId?` | `number`                         | Optional folder ID (REQUIRED for form tasks) |

#### Returns

`Promise`\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>

Promise resolving to the task [TaskGetResponse](../../type-aliases/TaskGetResponse/)

#### Example

```
// Get a task by ID
const task = await tasks.getById(<taskId>);

// Get a form task by ID
const formTask = await tasks.getById(<taskId>, <folderId>);

// Access form task properties
console.log(formTask.formLayout);
```

______________________________________________________________________

### getUsers()

> **getUsers**\<`T`>(`folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)>>

Gets users in the given folder who have Tasks.View and Tasks.Edit permissions Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided, or a PaginatedResponse when any pagination parameter is provided

#### Type Parameters

| Type Parameter                                                                 | Default type                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `T` *extends* [`TaskGetUsersOptions`](../../type-aliases/TaskGetUsersOptions/) | [`TaskGetUsersOptions`](../../type-aliases/TaskGetUsersOptions/) |

#### Parameters

| Parameter  | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `folderId` | `number` | The folder ID to get users from          |
| `options?` | `T`      | Optional query and pagination parameters |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)>>

Promise resolving to either an array of users NonPaginatedResponse or a PaginatedResponse when pagination options are used. [UserLoginInfo](../UserLoginInfo/)

#### Example

```
// Get users from a folder
const users = await tasks.getUsers(<folderId>);

// Access user properties
console.log(users.items[0].name);
console.log(users.items[0].emailAddress);
```

______________________________________________________________________

### reassign()

> **reassign**(`options`: [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/) | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[]): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

Reassigns tasks to new users

#### Parameters

| Parameter | Type                                                                 | Description                                                            |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `options` | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/) | [`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentOptions`](../../type-aliases/TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

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

______________________________________________________________________

### unassign()

> **unassign**(`taskId`: `number` | `number`[]): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentResponse`](../TaskAssignmentResponse/)[] | { `taskId`: `number`; }[]>>

Unassigns tasks (removes current assignees)

#### Parameters

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `taskId`  | `number` | `number`[]  |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskAssignmentResponse`](../TaskAssignmentResponse/)[] | { `taskId`: `number`; }[]>>

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
