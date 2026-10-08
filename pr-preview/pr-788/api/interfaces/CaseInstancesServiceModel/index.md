Service model for managing Maestro Case Instances

Maestro case instances are the running instances of Maestro cases.

### Usage

```
import { CaseInstances } from '@uipath/uipath-typescript/cases';

const caseInstances = new CaseInstances(sdk);
const allInstances = await caseInstances.getAll();
```

### Case App routes (experimental)

Case App routes authorize by the caller's Case persona grants instead of Orchestrator folder permissions. Use them to build apps for case workers who hold Case persona grants. Grant users roles inside Maestro Case Instances.

**Requirements**

- `folderKey` on `getAll`, since Case App routes list one folder at a time.

**Enable** by creating the service with `{ useCaseAppRoutes: true }`:

```
import { CaseInstances } from '@uipath/uipath-typescript/cases';

const caseApp = new CaseInstances(sdk, { useCaseAppRoutes: true });
const { items } = await caseApp.getAll({ folderKey: '<folderKey>' });

// Bound methods on returned instances keep using Case App routes
await items[0].close({ comment: 'Resolved' });
```

**Method behavior with `useCaseAppRoutes: true`**

| Methods                                                                        | Behavior                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `getAll`, `getStages`, `close`, `reopen`, `sendMessage`, `getExecutionHistory` | Call the Case App routes                             |
| `getById`, `pause`, `resume`, `getVariables`                                   | Throw a `ValidationError` — no Case App route exists |
| Methods ending in `ForCaseApp`                                                 | Always call the Case App routes, whatever the option |

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

Promise resolving to operation result with instance data. With Case App routes, a case that has already completed is rejected, and the result reports `isCompleted`.

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

### getAdhocTasksForCaseApp()

> **getAdhocTasksForCaseApp**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppAdhocTaskStage`[]>

**`Experimental`**

Gets the ad-hoc tasks the caller can trigger on a running case instance, grouped by stage.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Only stages the caller holds `Cases.RunAdhocTasks` on are returned, so every task listed can be passed to `triggerAdhocTaskForCaseApp`. A caller whose grants cover no ad-hoc task gets an empty array.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`CaseAppAdhocTaskStage`[]>

Promise resolving to an array of [CaseAppAdhocTaskStage](../CaseAppAdhocTaskStage/)

#### Example

```
const stages = await caseInstances.getAdhocTasksForCaseApp('<instanceId>', '<folderKey>');
stages.forEach(stage => stage.tasks.forEach(task => console.log(stage.stageLabel, task.taskName)));
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseInstanceGetResponse`>>

Get all case instances with optional filtering and pagination

With Case App routes, `folderKey` is required and instances the caller's `Cases.View` grants don't cover are dropped after each page is fetched, so a page can hold fewer items than `pageSize` — or none — while `hasNextPage` is still `true`.

#### Type Parameters

- `T` *extends* `CaseInstanceGetAllWithPaginationOptions` = `CaseInstanceGetAllWithPaginationOptions`

#### Parameters

- `options?`: `T` — Query parameters for filtering instances and pagination

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseInstanceGetResponse`>>

Promise resolving to either an array of case instances NonPaginatedResponse or a PaginatedResponse when pagination options are used. [CaseInstanceGetResponse](../../type-aliases/CaseInstanceGetResponse/)

#### Example

```
import { CaseInstanceSortBy, CaseInstanceSortOrder, InstanceStatus } from '@uipath/uipath-typescript/cases';

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

// Filter by status and start time, newest first
const running = await caseInstances.getAll({
  statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
  startedTimeStart: new Date('2026-01-01'),
  sortBy: CaseInstanceSortBy.StartedTime,
  order: CaseInstanceSortOrder.Desc
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

### getCaseJsonForCaseApp()

> **getCaseJsonForCaseApp**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`Record`\<`string`, `unknown`>>

**`Experimental`**

Gets the case plan of a case instance — the JSON document the case was designed with.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Returned exactly as stored in the package, so its shape follows the case designer's schema. Requires `Cases.ViewSummary` on the case.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`Record`\<`string`, `unknown`>>

Promise resolving to the case plan as a `Record<string, unknown>`

#### Example

```
const casePlan = await caseInstances.getCaseJsonForCaseApp('<instanceId>', '<folderKey>');
```

### getExecutionHistory()

> **getExecutionHistory**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseInstanceGetExecutionHistoryOptions`): `Promise`\<`CaseInstanceExecutionHistoryResponse`>

Get execution history for a case instance

With Case App routes the response also carries the case id, the case summary and the details sections configured on the case app.

#### Parameters

- `instanceId`: `string` — The ID of the case instance
- `folderKey`: `string` — Required folder key
- `options?`: `CaseInstanceGetExecutionHistoryOptions` — Optional element-type filter

#### Returns

`Promise`\<`CaseInstanceExecutionHistoryResponse`>

Promise resolving to instance execution history [CaseInstanceExecutionHistoryResponse](../CaseInstanceExecutionHistoryResponse/)

#### Example

```
import { CaseInstanceElementType } from '@uipath/uipath-typescript/cases';

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

// Only human-in-the-loop and agent elements
const tasks = await caseInstances.getExecutionHistory(<instanceId>, <folderKey>, {
  elementTypes: [CaseInstanceElementType.Hitl, CaseInstanceElementType.Agent]
});
```

### getIncidentsForCaseApp()

> **getIncidentsForCaseApp**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppIncidentGetResponse`[]>

**`Experimental`**

Gets the incidents raised on a case instance, across all of its runs.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Requires `Cases.ViewSummary` on the case.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`CaseAppIncidentGetResponse`[]>

Promise resolving to an array of [CaseAppIncidentGetResponse](../CaseAppIncidentGetResponse/)

#### Example

```
const incidents = await caseInstances.getIncidentsForCaseApp('<instanceId>', '<folderKey>');
incidents.forEach(incident => console.log(incident.errorCode, incident.errorMessage));
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

### getSlaSummaryForCaseApp()

> **getSlaSummaryForCaseApp**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppGetSlaSummaryResponse`>

**`Experimental`**

Gets the case-level SLA summary of a case instance: its due time, SLA status and escalation state.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Requires `Cases.ViewSummary` on the case; a grant on a single stage is not enough.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`CaseAppGetSlaSummaryResponse`>

Promise resolving to [CaseAppGetSlaSummaryResponse](../CaseAppGetSlaSummaryResponse/)

#### Example

```
const summary = await caseInstances.getSlaSummaryForCaseApp('<instanceId>', '<folderKey>');
console.log(summary.slaStatus, summary.slaDueTime);
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

### getStagesForCaseApp()

> **getStagesForCaseApp**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppGetStagesResponse`>

**`Experimental`**

Gets each stage of a case instance with its latest status and runtime SLA.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Requires `Cases.View`.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`CaseAppGetStagesResponse`>

Promise resolving to [CaseAppGetStagesResponse](../CaseAppGetStagesResponse/)

#### Example

```
// First, get case instances with caseInstances.getAll({ folderKey: '<folderKey>' })
const { stages } = await caseInstances.getStagesForCaseApp('<instanceId>', '<folderKey>');
stages.forEach(stage => console.log(stage.name, stage.latestStatus, stage.slaStatus));
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

### getVariables()

> **getVariables**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseInstanceGetVariablesOptions`): `Promise`\<`CaseInstanceGetVariablesResponse`>

Get global variables for a case instance

Returns the case instance's elements with their inputs/outputs and the global variables enriched with metadata (name, type, source element) parsed from the case's BPMN definition.

#### Parameters

- `instanceId`: `string` — The ID of the case instance to get variables for
- `folderKey`: `string` — The folder key for authorization
- `options?`: `CaseInstanceGetVariablesOptions` — Optional options including parentElementId to filter by parent element

#### Returns

`Promise`\<`CaseInstanceGetVariablesResponse`>

Promise resolving to [CaseInstanceGetVariablesResponse](../CaseInstanceGetVariablesResponse/) with elements and enriched global variables

#### Example

```
// Get all variables for a case instance
const variables = await caseInstances.getVariables(
  '<instanceId>',
  '<folderKey>'
);

// Iterate through global variables with metadata
variables.globalVariables.forEach(variable => {
  console.log(`Variable: ${variable.name} (${variable.id})`);
  console.log(`  Type: ${variable.type}`);
  console.log(`  Value: ${variable.value}`);
});

// Get variables scoped to a specific parent element (e.g. a stage)
const stageVariables = await caseInstances.getVariables(
  '<instanceId>',
  '<folderKey>',
  { parentElementId: '<parentElementId>' }
);

// Or using the bound method on a retrieved instance
const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
const instanceVariables = await instance.getVariables();
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

### selectStageForCaseApp()

> **selectStageForCaseApp**(`instanceId`: `string`, `folderKey`: `string`, `stageName`: `string`, `options?`: `CaseAppSelectStageOptions`): `Promise`\<`void`>

**`Experimental`**

Selects the next stage of a running case instance that is waiting for a user to choose one.

Warning

Preview: This method is experimental and may change or be removed in future releases.

`stageName` is matched case-sensitively against the case plan's stage labels; an unknown name, or a stage that is not user-selectable, is rejected as not found. Requires `Cases.SelectStage` on the case. Resolves once the selection is sent, not once the case has transitioned.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `stageName`: `string` — Label of the stage to select
- `options?`: `CaseAppSelectStageOptions` — Which waiting stage receives the selection, when several are waiting

#### Returns

`Promise`\<`void`>

Promise resolving when the selection is accepted

#### Examples

```
await caseInstances.selectStageForCaseApp('<instanceId>', '<folderKey>', 'Review');
```

```
await caseInstances.selectStageForCaseApp('<instanceId>', '<folderKey>', 'Review', { waitingStageId: '<stageId>' });
```

### sendMessage()

> **sendMessage**(`instanceId`: `string`, `folderKey`: `string`, `name`: `string`, `options?`: `CaseInstanceSendMessageOptions`): `Promise`\<`void`>

Send a message to a running case instance

Messages resolve wait points in the case — selecting the next stage when the case is waiting for a user to choose one, or starting a manually-triggered (ad-hoc) case task.

#### Parameters

- `instanceId`: `string` — The ID of the case instance to send the message to
- `folderKey`: `string` — Required folder key
- `name`: `string` — The message name — a well-known `CaseInstanceMessageName` or a custom message name defined in the case model
- `options?`: `CaseInstanceSendMessageOptions` — Optional message options with itemData payload and reference override

#### Returns

`Promise`\<`void`>

Promise that resolves when the message is accepted

#### Example

```
import { CaseInstances, CaseInstanceMessageName } from '@uipath/uipath-typescript/cases';

const caseInstances = new CaseInstances(sdk);

// Select the next stage when the case is waiting for a user to choose one
await caseInstances.sendMessage(
  '<instanceId>',
  '<folderKey>',
  CaseInstanceMessageName.UserSelectStage,
  { itemData: { stageName: 'Review' } }
);

// Start a manually-triggered (ad-hoc) case task
await caseInstances.sendMessage(
  '<instanceId>',
  '<folderKey>',
  CaseInstanceMessageName.UserAdhocTrigger,
  { itemData: { taskNames: ['Approve Invoice'] } }
);

// Or using instance method
const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
await instance.sendMessage(
  CaseInstanceMessageName.UserAdhocTrigger,
  { itemData: { taskNames: ['Approve Invoice'] } }
);
```

### triggerAdhocTaskForCaseApp()

> **triggerAdhocTaskForCaseApp**(`instanceId`: `string`, `folderKey`: `string`, `taskName`: `string`, `options?`: `CaseAppTriggerAdhocTaskOptions`): `Promise`\<`void`>

**`Experimental`**

Triggers one ad-hoc (manually-triggered) task on a running case instance.

Warning

Preview: This method is experimental and may change or be removed in future releases.

`taskName` is matched case-sensitively against the case plan; an unknown or non-ad-hoc name is rejected as not found. Requires `Cases.RunAdhocTasks` on the stage that owns the task. Resolves once the trigger is accepted, not once the task has run.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `taskName`: `string` — Case plan name of the task, as returned by `getAdhocTasksForCaseApp`
- `options?`: `CaseAppTriggerAdhocTaskOptions` — Optional input handed to the task

#### Returns

`Promise`\<`void`>

Promise resolving when the trigger is accepted

#### Examples

```
// First, list triggerable tasks with caseInstances.getAdhocTasksForCaseApp('<instanceId>', '<folderKey>')
await caseInstances.triggerAdhocTaskForCaseApp('<instanceId>', '<folderKey>', 'Request Documents');
```

```
await caseInstances.triggerAdhocTaskForCaseApp('<instanceId>', '<folderKey>', 'Request Documents', {
  taskInput: { reason: 'Missing proof of address' },
});
```
