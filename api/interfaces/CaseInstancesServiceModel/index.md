Service model for managing Maestro Case Instances

Maestro case instances are the running instances of Maestro cases.

### Usage

```
import { CaseInstances } from '@uipath/uipath-typescript/cases';

const caseInstances = new CaseInstances(sdk);
const allInstances = await caseInstances.getAll();
```

Note

Methods that rely on the Insights Real-Time Monitoring service (`getSlaSummary`, `getStagesSlaSummary`) may have up to ~1 minute latency before reflecting the latest updates. See [Real-Time Monitoring Overview](https://docs.uipath.com/insights/automation-cloud/latest/user-guide/real-time-monitoring-overview) for details.

## Methods

### close()

> **close**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Close/Cancel a case instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to cancel
- `folderKey`: `string` — Required folder key
- `options?`: `CaseInstanceOperationOptions` — Optional close options with comment

#### Returns

`Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

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

### getActionTasks()

> **getActionTasks**\<`T`>(`caseInstanceId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskGetResponse`> : `NonPaginatedResponse`\<`TaskGetResponse`>>

Get human in the loop tasks associated with a case instance

The method returns either:

- An array of tasks (when no pagination parameters are provided)
- A paginated result with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `TaskGetAllOptions` = `TaskGetAllOptions`

#### Parameters

- `caseInstanceId`: `string` — The ID of the case instance
- `options?`: `T` — Optional filtering and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskGetResponse`> : `NonPaginatedResponse`\<`TaskGetResponse`>>

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

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseInstanceGetResponse`>>

Get all case instances with optional filtering and pagination

#### Type Parameters

- `T` *extends* `CaseInstanceGetAllWithPaginationOptions` = `CaseInstanceGetAllWithPaginationOptions`

#### Parameters

- `options?`: `T` — Query parameters for filtering instances and pagination

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseInstanceGetResponse`>>

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

### getById()

> **getById**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseInstanceGetResponse`>

Get a specific case instance by ID

#### Parameters

- `instanceId`: `string` — The case instance ID
- `folderKey`: `string` — Required folder key

#### Returns

`Promise`\<`CaseInstanceGetResponse`>

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

### getExecutionHistory()

> **getExecutionHistory**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseInstanceExecutionHistoryResponse`>

Get execution history for a case instance

#### Parameters

- `instanceId`: `string` — The ID of the case instance
- `folderKey`: `string` — Required folder key

#### Returns

`Promise`\<`CaseInstanceExecutionHistoryResponse`>

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

### getSlaSummary()

> **getSlaSummary**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`SlaSummaryResponse`> : `NonPaginatedResponse`\<`SlaSummaryResponse`>>

Get SLA summary for all case instances across folders.

Returns SLA status, due times, escalation info, and instance metadata for each case instance. The default page size is 50, so only the top 50 items are returned when no pagination options are provided.

#### Type Parameters

- `T` *extends* `CaseInstanceSlaSummaryOptions` = `CaseInstanceSlaSummaryOptions`

#### Parameters

- `options?`: `T` — Optional filtering and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`SlaSummaryResponse`> : `NonPaginatedResponse`\<`SlaSummaryResponse`>>

Promise resolving to [SlaSummaryResponse](../SlaSummaryResponse/), paginated or non-paginated based on options

#### Example

```
// Non-paginated (returns top 50 items by default)
const summary = await caseInstances.getSlaSummary();
console.log(`Found ${summary.totalCount} cases`);

// Filter by case instance ID
const filtered = await caseInstances.getSlaSummary({
  caseInstanceId: '<caseInstanceId>'
});

// Filter by time range
const timeFiltered = await caseInstances.getSlaSummary({
  startTimeUtc: new Date('2026-01-01'),
  endTimeUtc: new Date('2026-01-31')
});

// With pagination
const page1 = await caseInstances.getSlaSummary({ pageSize: 25 });
if (page1.hasNextPage) {
  const page2 = await caseInstances.getSlaSummary({ cursor: page1.nextCursor });
}

// Jump to specific page
const page3 = await caseInstances.getSlaSummary({ jumpToPage: 3, pageSize: 25 });
```

### getStages()

> **getStages**(`caseInstanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseGetStageResponse`[]>

Get stages and its associated tasks information for a case instance

#### Parameters

- `caseInstanceId`: `string` — The ID of the case instance
- `folderKey`: `string` — Required folder key

#### Returns

`Promise`\<`CaseGetStageResponse`[]>

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

### getStagesSlaSummary()

> **getStagesSlaSummary**(`options?`: `CaseInstanceStageSLAOptions`): `Promise`\<`CaseInstanceStageSLAResponse`[]>

Get stages SLA summary for case instances across folders.

Returns stage-level SLA status and escalation information for each case instance, aggregated from Insights Real-Time Monitoring.

#### Parameters

- `options?`: `CaseInstanceStageSLAOptions` — Optional filtering options

#### Returns

`Promise`\<`CaseInstanceStageSLAResponse`[]>

Promise resolving to an array of [CaseInstanceStageSLAResponse](../CaseInstanceStageSLAResponse/)

#### Example

```
// Get stages SLA summary for all case instances
const stagesSla = await caseInstances.getStagesSlaSummary();
for (const item of stagesSla) {
  console.log(`Instance: ${item.caseInstanceId}`);
  for (const stage of item.stages) {
    console.log(`  Stage: ${stage.name} - SLA Status: ${stage.slaStatus}, Due: ${stage.slaDueTime}`);
  }
}

// Filter by case instance ID
const filtered = await caseInstances.getStagesSlaSummary({
  caseInstanceId: '<caseInstanceId>'
});

// Using bound method on a case instance
const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
const stagesSla = await instance.getStagesSlaSummary();
```

### pause()

> **pause**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Pause a case instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to pause
- `folderKey`: `string` — Required folder key
- `options?`: `CaseInstanceOperationOptions` — Optional pause options with comment

#### Returns

`Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Promise resolving to operation result with instance data

### reopen()

> **reopen**(`instanceId`: `string`, `folderKey`: `string`, `options`: `CaseInstanceReopenOptions`): `Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Reopen a case instance from a specified element

#### Parameters

- `instanceId`: `string` — The ID of the case instance
- `folderKey`: `string` — Required folder key
- `options`: `CaseInstanceReopenOptions` — Reopen options containing stageId (the stage ID to resume from) and an optional comment

#### Returns

`Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

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

### resume()

> **resume**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Resume a case instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to resume
- `folderKey`: `string` — Required folder key
- `options?`: `CaseInstanceOperationOptions` — Optional resume options with comment

#### Returns

`Promise`\<`OperationResponse`\<`CaseInstanceOperationResponse`>>

Promise resolving to operation result with instance data
