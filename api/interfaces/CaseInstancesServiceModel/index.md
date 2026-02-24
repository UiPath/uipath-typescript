Service model for managing Maestro Case Instances

Maestro case instances are the running instances of Maestro cases.

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { CaseInstances } from '@uipath/uipath-typescript/cases';

const caseInstances = new CaseInstances(sdk);
const allInstances = await caseInstances.getAll();
```

## Methods

### close()

> **close**(`instanceId`: `string`, `folderKey`: `string`, `options?`: [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/)): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Close/Cancel a case instance

#### Parameters

| Parameter    | Type                                                               | Description                         |
| ------------ | ------------------------------------------------------------------ | ----------------------------------- |
| `instanceId` | `string`                                                           | The ID of the instance to cancel    |
| `folderKey`  | `string`                                                           | Required folder key                 |
| `options?`   | [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/) | Optional close options with comment |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Promise resolving to operation result with instance data

#### Example

```
// Close a case instance
const result = await caseInstances.close(
  <instanceId>,
  <folderKey>
);

// Or using instance method
const instance = await caseInstances.getById(
  <instanceId>,
  <folderKey>
);
const result = await instance.close();

console.log(`Closed: ${result.success}`);

// Close with a comment
const resultWithComment = await instance.close({
  comment: 'Closing due to invalid input data'
});

if (resultWithComment.success) {
  console.log(`Instance ${resultWithComment.data.instanceId} status: ${resultWithComment.data.status}`);
}
```

______________________________________________________________________

### getActionTasks()

> **getActionTasks**\<`T`>(`caseInstanceId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>>

Get human in the loop tasks associated with a case instance

The method returns either:

- An array of tasks (when no pagination parameters are provided)
- A paginated result with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

| Type Parameter                                                             | Default type                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `T` *extends* [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) | [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) |

#### Parameters

| Parameter        | Type     | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `caseInstanceId` | `string` | The ID of the case instance               |
| `options?`       | `T`      | Optional filtering and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>>

Promise resolving to human in the loop tasks associated with the case instance

#### Example

```
// Get all tasks for a case instance (non-paginated)
const actionTasks = await caseInstances.getActionTasks(
  <caseInstanceId>,
);

// First page with pagination
const page1 = await caseInstances.getActionTasks(
  <caseInstanceId>,
  { pageSize: 10 }
);
// Iterate through tasks
for (const task of page1.items) {
  console.log(`Task: ${task.title}`);
  console.log(`Task: ${task.status}`);
}

// Jump to specific page
const page5 = await caseInstances.getActionTasks(
  <caseInstanceId>,
  {
    jumpToPage: 5,
    pageSize: 10
  }
);
```

______________________________________________________________________

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)>>

Get all case instances with optional filtering and pagination

#### Type Parameters

| Type Parameter                                                                                                         | Default type                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `T` *extends* [`CaseInstanceGetAllWithPaginationOptions`](../../type-aliases/CaseInstanceGetAllWithPaginationOptions/) | [`CaseInstanceGetAllWithPaginationOptions`](../../type-aliases/CaseInstanceGetAllWithPaginationOptions/) |

#### Parameters

| Parameter  | Type | Description                                             |
| ---------- | ---- | ------------------------------------------------------- |
| `options?` | `T`  | Query parameters for filtering instances and pagination |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)>>

Promise resolving to either an array of case instances NonPaginatedResponse or a PaginatedResponse when pagination options are used. [CaseInstanceGetResponse](../../type-aliases/CaseInstanceGetResponse/)

#### Example

```
// Get all case instances (non-paginated)
const instances = await caseInstances.getAll();

// Cancel/Close faulted instances using methods directly on instances
for (const instance of instances.items) {
  if (instance.latestRunStatus === 'Faulted') {
    await instance.close({ comment: 'Closing faulted case instance' });
  }
}

// With filtering
const filteredInstances = await caseInstances.getAll({
  processKey: 'MyCaseProcess'
});

// First page with pagination
const page1 = await caseInstances.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await caseInstances.getAll({ cursor: page1.nextCursor });
}
```

______________________________________________________________________

### getById()

> **getById**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)>

Get a specific case instance by ID

#### Parameters

| Parameter    | Type     | Description          |
| ------------ | -------- | -------------------- |
| `instanceId` | `string` | The case instance ID |
| `folderKey`  | `string` | Required folder key  |

#### Returns

`Promise`\<[`CaseInstanceGetResponse`](../../type-aliases/CaseInstanceGetResponse/)>

Promise resolving to case instance with methods [CaseInstanceGetResponse](../../type-aliases/CaseInstanceGetResponse/)

#### Example

```
// Get a specific case instance
const instance = await caseInstances.getById(
  <instanceId>,
  <folderKey>
);

// Access instance properties
console.log(`Status: ${instance.latestRunStatus}`);
```

______________________________________________________________________

### getExecutionHistory()

> **getExecutionHistory**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<[`CaseInstanceExecutionHistoryResponse`](../CaseInstanceExecutionHistoryResponse/)>

Get execution history for a case instance

#### Parameters

| Parameter    | Type     | Description                 |
| ------------ | -------- | --------------------------- |
| `instanceId` | `string` | The ID of the case instance |
| `folderKey`  | `string` | Required folder key         |

#### Returns

`Promise`\<[`CaseInstanceExecutionHistoryResponse`](../CaseInstanceExecutionHistoryResponse/)>

Promise resolving to instance execution history [CaseInstanceExecutionHistoryResponse](../CaseInstanceExecutionHistoryResponse/)

#### Example

```
// Get execution history for a case instance
const history = await caseInstances.getExecutionHistory(
  <instanceId>,
  <folderKey>
);

// Access element executions
if (history.elementExecutions) {
  for (const execution of history.elementExecutions) {
    console.log(`Element: ${execution.elementName} - Status: ${execution.status}`);
  }
}
```

______________________________________________________________________

### getStages()

> **getStages**(`caseInstanceId`: `string`, `folderKey`: `string`): `Promise`\<[`CaseGetStageResponse`](../CaseGetStageResponse/)[]>

Get stages and its associated tasks information for a case instance

#### Parameters

| Parameter        | Type     | Description                 |
| ---------------- | -------- | --------------------------- |
| `caseInstanceId` | `string` | The ID of the case instance |
| `folderKey`      | `string` | Required folder key         |

#### Returns

`Promise`\<[`CaseGetStageResponse`](../CaseGetStageResponse/)[]>

Promise resolving to an array of case stages with their tasks and status

#### Example

```
// Get stages for a case instance
const stages = await caseInstances.getStages(
  <caseInstanceId>,
  <folderKey>
);

// Iterate through stages
for (const stage of stages) {
  console.log(`Stage: ${stage.name} - Status: ${stage.status}`);

  // Check tasks in the stage
  for (const taskGroup of stage.tasks) {
    for (const task of taskGroup) {
      console.log(`  Task: ${task.name} - Status: ${task.status}`);
    }
  }
}
```

______________________________________________________________________

### pause()

> **pause**(`instanceId`: `string`, `folderKey`: `string`, `options?`: [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/)): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Pause a case instance

#### Parameters

| Parameter    | Type                                                               | Description                         |
| ------------ | ------------------------------------------------------------------ | ----------------------------------- |
| `instanceId` | `string`                                                           | The ID of the instance to pause     |
| `folderKey`  | `string`                                                           | Required folder key                 |
| `options?`   | [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/) | Optional pause options with comment |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Promise resolving to operation result with instance data

______________________________________________________________________

### reopen()

> **reopen**(`instanceId`: `string`, `folderKey`: `string`, `options`: [`CaseInstanceReopenOptions`](../CaseInstanceReopenOptions/)): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Reopen a case instance from a specified element

#### Parameters

| Parameter    | Type                                                         | Description                                                                             |
| ------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `instanceId` | `string`                                                     | The ID of the case instance                                                             |
| `folderKey`  | `string`                                                     | Required folder key                                                                     |
| `options`    | [`CaseInstanceReopenOptions`](../CaseInstanceReopenOptions/) | Reopen options containing stageId (the stage ID to resume from) and an optional comment |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Promise resolving to operation result with instance data [CaseInstanceOperationResponse](../CaseInstanceOperationResponse/)

#### Example

```
import { CaseInstances } from '@uipath/uipath-typescript/cases';

const caseInstances = new CaseInstances(sdk);

// First, get the available stages for the case instance
const stages = await caseInstances.getStages('<instanceId>', '<folderKey>');
const stageId = stages[0].id; // Select the stage to reopen from

// Reopen a case instance from a specific stage
const result = await caseInstances.reopen(
  '<instanceId>',
  '<folderKey>',
  { stageId }
);

// Reopen with a comment
const result = await caseInstances.reopen(
  '<instanceId>',
  '<folderKey>',
  { stageId, comment: 'Reopening to retry failed stage' }
);

// Or using instance method
const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
const stages = await instance.getStages();
const result = await instance.reopen({ stageId: stages[0].id });
```

______________________________________________________________________

### resume()

> **resume**(`instanceId`: `string`, `folderKey`: `string`, `options?`: [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/)): `Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Resume a case instance

#### Parameters

| Parameter    | Type                                                               | Description                          |
| ------------ | ------------------------------------------------------------------ | ------------------------------------ |
| `instanceId` | `string`                                                           | The ID of the instance to resume     |
| `folderKey`  | `string`                                                           | Required folder key                  |
| `options?`   | [`CaseInstanceOperationOptions`](../CaseInstanceOperationOptions/) | Optional resume options with comment |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`CaseInstanceOperationResponse`](../CaseInstanceOperationResponse/)>>

Promise resolving to operation result with instance data
