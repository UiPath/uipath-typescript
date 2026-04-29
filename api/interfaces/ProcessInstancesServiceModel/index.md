Service for managing UiPath Maestro Process instances

Maestro process instances are the running instances of Maestro processes. [UiPath Maestro Process Instances Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/all-instances-view)

### Usage

```
import { ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';

const processInstances = new ProcessInstances(sdk);
const allInstances = await processInstances.getAll();
```

## Methods

### cancel()

> **cancel**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `ProcessInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Cancel a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to cancel
- `folderKey`: `string` — The folder key for authorization
- `options?`: `ProcessInstanceOperationOptions` — Optional cancellation options with comment

#### Returns

`Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Promise resolving to operation result with instance data

#### Example

```
// Cancel a process instance
const result = await processInstances.cancel(
  <instanceId>,
  <folderKey>
);

// Or using instance method
const instance = await processInstances.getById(
  <instanceId>,
  <folderKey>
);
const result = await instance.cancel();

console.log(`Cancelled: ${result.success}`);

// Cancel with a comment
const resultWithComment = await instance.cancel({
  comment: 'Cancelling due to invalid input data'
});

if (resultWithComment.success) {
  console.log(`Instance ${resultWithComment.data.instanceId} status: ${resultWithComment.data.status}`);
}
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ProcessInstanceGetResponse`> : `NonPaginatedResponse`\<`ProcessInstanceGetResponse`>>

Get all process instances with optional filtering and pagination

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `ProcessInstanceGetAllWithPaginationOptions` = `ProcessInstanceGetAllWithPaginationOptions`

#### Parameters

- `options?`: `T` — Query parameters for filtering instances and pagination

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ProcessInstanceGetResponse`> : `NonPaginatedResponse`\<`ProcessInstanceGetResponse`>>

Promise resolving to either an array of process instances NonPaginatedResponse or a PaginatedResponse when pagination options are used. [ProcessInstanceGetResponse](../../type-aliases/ProcessInstanceGetResponse/)

#### Example

```
// Get all instances (non-paginated)
const instances = await processInstances.getAll();

// Cancel faulted instances using methods directly on instances
for (const instance of instances.items) {
  if (instance.latestRunStatus === 'Faulted') {
    await instance.cancel({ comment: 'Cancelling faulted instance' });
  }
}

// With filtering
const filteredInstances = await processInstances.getAll({
  processKey: 'MyProcess'
});

// First page with pagination
const page1 = await processInstances.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await processInstances.getAll({ cursor: page1.nextCursor });
}
```

### getBpmn()

> **getBpmn**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`string`>

Get BPMN XML file for a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to get BPMN for
- `folderKey`: `string` — The folder key for authorization

#### Returns

`Promise`\<`string`>

Promise resolving to BPMN XML file [BpmnXmlString](../../type-aliases/BpmnXmlString/)

#### Example

```
// Get BPMN XML for a process instance
const bpmnXml = await processInstances.getBpmn(
  <instanceId>,
  <folderKey>
);

// Render BPMN diagram in frontend using bpmn-js
import BpmnViewer from 'bpmn-js/lib/Viewer';

const viewer = new BpmnViewer({
  container: '#bpmn-diagram'
});

await viewer.importXML(bpmnXml);

// Zoom to fit the diagram
viewer.get('canvas').zoom('fit-viewport');
```

### getById()

> **getById**(`id`: `string`, `folderKey`: `string`): `Promise`\<`ProcessInstanceGetResponse`>

Get a process instance by ID with operation methods (cancel, pause, resume)

#### Parameters

- `id`: `string` — The ID of the instance to retrieve
- `folderKey`: `string` — The folder key for authorization

#### Returns

`Promise`\<`ProcessInstanceGetResponse`>

Promise resolving to a process instance [ProcessInstanceGetResponse](../../type-aliases/ProcessInstanceGetResponse/)

#### Example

```
// Get a specific process instance
const instance = await processInstances.getById(
  <instanceId>,
  <folderKey>
);

// Access instance properties
console.log(`Status: ${instance.latestRunStatus}`);
```

### getExecutionHistory()

> **getExecutionHistory**(`instanceId`: `string`): `Promise`\<`ProcessInstanceExecutionHistoryResponse`[]>

Get execution history (spans) for a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to get history for

#### Returns

`Promise`\<`ProcessInstanceExecutionHistoryResponse`[]>

Promise resolving to execution history [ProcessInstanceExecutionHistoryResponse](../ProcessInstanceExecutionHistoryResponse/)

#### Example

```
// Get execution history for a process instance
const history = await processInstances.getExecutionHistory(
  <instanceId>
);

// Analyze execution timeline
history.forEach(span => {
  console.log(`Activity: ${span.name}`);
  console.log(`Start: ${span.startTime}`);
  console.log(`Duration: ${span.duration}ms`);
});
```

### getIncidents()

> **getIncidents**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`ProcessIncidentGetResponse`[]>

Get incidents for a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to get incidents for
- `folderKey`: `string` — The folder key for authorization

#### Returns

`Promise`\<`ProcessIncidentGetResponse`[]>

Promise resolving to array of incidents for the processinstance [ProcessIncidentGetResponse](../ProcessIncidentGetResponse/)

#### Example

```
// Get incidents for a specific instance
const incidents = await processInstances.getIncidents('<instanceId>', '<folderKey>');

// Access process incident details
for (const incident of incidents) {
  console.log(`Element: ${incident.incidentElementActivityName} (${incident.incidentElementActivityType})`);
  console.log(`Severity: ${incident.incidentSeverity}`);
  console.log(`Error: ${incident.errorMessage}`);
}
```

### getVariables()

> **getVariables**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `ProcessInstanceGetVariablesOptions`): `Promise`\<`ProcessInstanceGetVariablesResponse`>

Get global variables for a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to get variables for
- `folderKey`: `string` — The folder key for authorization
- `options?`: `ProcessInstanceGetVariablesOptions` — Optional options including parentElementId to filter by parent element

#### Returns

`Promise`\<`ProcessInstanceGetVariablesResponse`>

Promise resolving to variables response with elements and globals [ProcessInstanceGetVariablesResponse](../ProcessInstanceGetVariablesResponse/)

#### Example

```
// Get all variables for a process instance
const variables = await processInstances.getVariables(
  <instanceId>,
  <folderKey>
);

// Access global variables
console.log('Global variables:', variables.globalVariables);

// Iterate through global variables with metadata
variables.globalVariables?.forEach(variable => {
  console.log(`Variable: ${variable.name} (${variable.id})`);
  console.log(`  Type: ${variable.type}`);
  console.log(`  Element: ${variable.elementId}`);
  console.log(`  Value: ${variable.value}`);
});

// Get variables for a specific parent element
const elementVariables = await processInstances.getVariables(
  <instanceId>,
  <folderKey>,
  { parentElementId: <parentElementId> }
);
```

### pause()

> **pause**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `ProcessInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Pause a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to pause
- `folderKey`: `string` — The folder key for authorization
- `options?`: `ProcessInstanceOperationOptions` — Optional pause options with comment

#### Returns

`Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Promise resolving to operation result with instance data

### resume()

> **resume**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `ProcessInstanceOperationOptions`): `Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Resume a process instance

#### Parameters

- `instanceId`: `string` — The ID of the instance to resume
- `folderKey`: `string` — The folder key for authorization
- `options?`: `ProcessInstanceOperationOptions` — Optional resume options with comment

#### Returns

`Promise`\<`OperationResponse`\<`ProcessInstanceOperationResponse`>>

Promise resolving to operation result with instance data
