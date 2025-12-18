Service model for managing Maestro Case Instances

Maestro case instances are the running instances of Maestro cases.

## Methods

### getAll()

```
getAll<T>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<CaseInstanceGetResponse> : NonPaginatedResponse<CaseInstanceGetResponse>>;
```

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
const instances = await sdk.maestro.cases.instances.getAll();

// Cancel/Close faulted instances using methods directly on instances
for (const instance of instances.items) {
  if (instance.latestRunStatus === 'Faulted') {
    await instance.close({ comment: 'Closing faulted case instance' });
  }
}

// With filtering
const instances = await sdk.maestro.cases.instances.getAll({
  processKey: 'MyCaseProcess'
});

// First page with pagination
const page1 = await sdk.maestro.cases.instances.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await sdk.maestro.cases.instances.getAll({ cursor: page1.nextCursor });
}
```

______________________________________________________________________

### getById()

```
getById(instanceId: string, folderKey: string): Promise<CaseInstanceGetResponse>;
```

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
const instance = await sdk.maestro.cases.instances.getById(
  <instanceId>,
  <folderKey>
);

// Access instance properties
console.log(`Status: ${instance.latestRunStatus}`);
```

______________________________________________________________________

### close()

```
close(
   instanceId: string, 
   folderKey: string, 
   options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;
```

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
const result = await sdk.maestro.cases.instances.close(
  <instanceId>,
  <folderKey>
);

or

const instance = await sdk.maestro.cases.instances.getById(
  <instanceId>,
  <folderKey>
);
const result = await instance.close();

console.log(`Closed: ${result.success}`);

// Close with a comment
const result = await instance.close({
  comment: 'Closing due to invalid input data'
});

if (result.success) {
  console.log(`Instance ${result.data.instanceId} status: ${result.data.status}`);
}
```

______________________________________________________________________

### pause()

```
pause(
   instanceId: string, 
   folderKey: string, 
   options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;
```

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

### resume()

```
resume(
   instanceId: string, 
   folderKey: string, 
   options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;
```

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

______________________________________________________________________

### getExecutionHistory()

```
getExecutionHistory(instanceId: string, folderKey: string): Promise<CaseInstanceExecutionHistoryResponse>;
```

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
const history = await sdk.maestro.cases.instances.getExecutionHistory(
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

```
getStages(caseInstanceId: string, folderKey: string): Promise<CaseGetStageResponse[]>;
```

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
const stages = await sdk.maestro.cases.instances.getStages(
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

### getActionTasks()

```
getActionTasks<T>(caseInstanceId: string, options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<TaskGetResponse> : NonPaginatedResponse<TaskGetResponse>>;
```

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
const tasks = await sdk.maestro.cases.instances.getActionTasks(
  <caseInstanceId>,
);

// First page with pagination
const page1 = await sdk.maestro.cases.instances.getActionTasks(
  <caseInstanceId>,
  { pageSize: 10 }
);
// Iterate through tasks
for (const task of page1.items) {
  console.log(`Task: ${task.title}`);
  console.log(`Task: ${task.status}`);
}

// Jump to specific page
const page5 = await sdk.maestro.cases.instances.getActionTasks(
  <caseInstanceId>,
  {
    jumpToPage: 5,
    pageSize: 10
  }
);
```
