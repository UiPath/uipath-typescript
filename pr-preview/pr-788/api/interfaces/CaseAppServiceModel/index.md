**`Experimental`**

Warning

Preview: This service is experimental and may change or be removed in future releases.

Service for working with Maestro case instances as a case app user.

Every method is authorized by the caller's Case persona grants (e.g. `Cases.View`, `Cases.RunAdhocTasks`, `Cases.Close`) rather than Orchestrator folder permissions, and every method is scoped to a single folder: pass the folder the case instance lives in.

### Usage

```
import { CaseApp } from '@uipath/uipath-typescript/case-app';

const caseApp = new CaseApp(sdk);
const cases = await caseApp.getAll('<folderKey>');
```

## Methods

### close()

> **close**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseAppCloseOptions`): `Promise`\<`CaseAppCloseResponse`>

**`Experimental`**

Closes a case instance.

Warning

Preview: This method is experimental and may change or be removed in future releases.

A running case reports `Canceling` and finishes cancelling asynchronously; an already-terminal case returns its status unchanged. A case that has already `Completed` is rejected, since closing it would prevent reopening it. Requires `Cases.Close`.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `options?`: `CaseAppCloseOptions` — Optional comment and operation id

#### Returns

`Promise`\<`CaseAppCloseResponse`>

Promise resolving to [CaseAppCloseResponse](../CaseAppCloseResponse/)

#### Examples

```
const result = await caseApp.close('<instanceId>', '<folderKey>');
console.log(result.status);
```

```
await caseApp.close('<instanceId>', '<folderKey>', { comment: 'Duplicate case' });
```

### getAdhocTasks()

> **getAdhocTasks**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppAdhocTaskStage`[]>

**`Experimental`**

Gets the ad-hoc tasks the caller can trigger on a running case instance, grouped by stage.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Only stages the caller holds `Cases.RunAdhocTasks` on are returned, so every task listed can be passed to `triggerAdhocTask`. A caller whose grants cover no ad-hoc task gets an empty array.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in

#### Returns

`Promise`\<`CaseAppAdhocTaskStage`[]>

Promise resolving to an array of [CaseAppAdhocTaskStage](../CaseAppAdhocTaskStage/)

#### Example

```
const stages = await caseApp.getAdhocTasks('<instanceId>', '<folderKey>');
stages.forEach(stage => stage.tasks.forEach(task => console.log(stage.stageLabel, task.taskName)));
```

### getAll()

> **getAll**\<`T`>(`folderKey`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseAppInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseAppInstanceGetResponse`>>

**`Experimental`**

Gets the case instances in a folder that the caller's `Cases.View` grants cover.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Instances are filtered after each page is fetched, so a page can hold fewer items than `pageSize` — or none — while `hasNextPage` is still `true`. Keep following `nextCursor` until `hasNextPage` is `false`. A caller with no grants gets an empty result.

#### Type Parameters

- `T` *extends* `CaseAppInstanceGetAllWithPaginationOptions` = `CaseAppInstanceGetAllWithPaginationOptions`

#### Parameters

- `folderKey`: `string` — Key of the folder to list case instances from
- `options?`: `T` — Optional filters, sorting and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`CaseAppInstanceGetResponse`> : `NonPaginatedResponse`\<`CaseAppInstanceGetResponse`>>

Promise resolving to [NonPaginatedResponse](../NonPaginatedResponse/) of [CaseAppInstanceGetResponse](../CaseAppInstanceGetResponse/) without pagination options, or [PaginatedResponse](../PaginatedResponse/) of [CaseAppInstanceGetResponse](../CaseAppInstanceGetResponse/) when pagination options are used.

#### Examples

```
const result = await caseApp.getAll('<folderKey>');
result.items.forEach(instance => console.log(instance.instanceId, instance.latestRunStatus));
```

```
import { CaseAppInstanceSortBy, CaseAppSortOrder, InstanceStatus } from '@uipath/uipath-typescript/case-app';

let page = await caseApp.getAll('<folderKey>', {
  processKey: '<processKey>',
  statuses: [InstanceStatus.RUNNING, InstanceStatus.FAULTED],
  startedTimeStart: new Date('2026-01-01'),
  sortBy: CaseAppInstanceSortBy.StartedTime,
  order: CaseAppSortOrder.Desc,
  pageSize: 50,
});

while (page.hasNextPage && page.nextCursor) {
  page = await caseApp.getAll('<folderKey>', { cursor: page.nextCursor });
}
```

### getCaseJson()

> **getCaseJson**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`Record`\<`string`, `unknown`>>

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
const casePlan = await caseApp.getCaseJson('<instanceId>', '<folderKey>');
```

### getElementExecutions()

> **getElementExecutions**(`instanceId`: `string`, `folderKey`: `string`, `options?`: `CaseAppGetElementExecutionsOptions`): `Promise`\<`CaseAppGetElementExecutionsResponse`>

**`Experimental`**

Gets the element-execution timeline of a case instance, across all of its stages.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Includes each element's runs, links and job keys, plus the case summary and the details sections configured on the case app. Requires `Cases.ViewSummary` on the case.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `options?`: `CaseAppGetElementExecutionsOptions` — Optional element-type filter

#### Returns

`Promise`\<`CaseAppGetElementExecutionsResponse`>

Promise resolving to [CaseAppGetElementExecutionsResponse](../CaseAppGetElementExecutionsResponse/)

#### Examples

```
const timeline = await caseApp.getElementExecutions('<instanceId>', '<folderKey>');
timeline.elementExecutions.forEach(element => console.log(element.elementName, element.status));
```

```
import { CaseAppElementType } from '@uipath/uipath-typescript/case-app';

const tasks = await caseApp.getElementExecutions('<instanceId>', '<folderKey>', {
  elementTypes: [CaseAppElementType.Hitl, CaseAppElementType.Agent],
});
```

### getIncidents()

> **getIncidents**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppIncidentGetResponse`[]>

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
const incidents = await caseApp.getIncidents('<instanceId>', '<folderKey>');
incidents.forEach(incident => console.log(incident.errorCode, incident.errorMessage));
```

### getSlaSummary()

> **getSlaSummary**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppGetSlaSummaryResponse`>

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
const summary = await caseApp.getSlaSummary('<instanceId>', '<folderKey>');
console.log(summary.slaStatus, summary.slaDueTime);
```

### getStages()

> **getStages**(`instanceId`: `string`, `folderKey`: `string`): `Promise`\<`CaseAppGetStagesResponse`>

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
// First, get case instances with caseApp.getAll('<folderKey>')
const { stages } = await caseApp.getStages('<instanceId>', '<folderKey>');
stages.forEach(stage => console.log(stage.name, stage.latestStatus, stage.slaStatus));
```

### reopen()

> **reopen**(`instanceId`: `string`, `folderKey`: `string`, `startElementId`: `string`, `options?`: `CaseInstanceOperationOptions`): `Promise`\<`CaseInstanceOperationResponse`>

**`Experimental`**

Reopens a completed case instance from a chosen case plan element.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Only `Completed` cases can be reopened. Requires `Cases.Reopen`.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `startElementId`: `string` — ID of the case plan element (e.g. a stage) to restart from
- `options?`: `CaseInstanceOperationOptions` — Optional comment

#### Returns

`Promise`\<`CaseInstanceOperationResponse`>

Promise resolving to [CaseInstanceOperationResponse](../CaseInstanceOperationResponse/)

#### Examples

```
// First, get stage IDs with caseApp.getStages('<instanceId>', '<folderKey>')
const result = await caseApp.reopen('<instanceId>', '<folderKey>', '<stageId>');
```

```
await caseApp.reopen('<instanceId>', '<folderKey>', '<stageId>', { comment: 'Customer replied' });
```

### selectStage()

> **selectStage**(`instanceId`: `string`, `folderKey`: `string`, `stageName`: `string`, `options?`: `CaseAppSelectStageOptions`): `Promise`\<`void`>

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
await caseApp.selectStage('<instanceId>', '<folderKey>', 'Review');
```

```
await caseApp.selectStage('<instanceId>', '<folderKey>', 'Review', { waitingStageId: '<stageId>' });
```

### sendMessage()

> **sendMessage**(`instanceId`: `string`, `folderKey`: `string`, `name`: `CaseInstanceMessageName`, `options?`: `CaseInstanceSendMessageOptions`): `Promise`\<`CaseAppSendMessageResponse`>

**`Experimental`**

Sends a case message (`UserAdhocTrigger` or `UserSelectStage`) to a running case instance.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Prefer `triggerAdhocTask` and `selectStage`, which build the message server-side. The caller must hold `Cases.RunAdhocTasks` or `Cases.SelectStage` on the targeted case.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `name`: `CaseInstanceMessageName` — Message to send
- `options?`: `CaseInstanceSendMessageOptions` — Message payload and an optional reference overriding the default target

#### Returns

`Promise`\<`CaseAppSendMessageResponse`>

Promise resolving to [CaseAppSendMessageResponse](../CaseAppSendMessageResponse/)

#### Example

```
import { CaseInstanceMessageName } from '@uipath/uipath-typescript/case-app';

await caseApp.sendMessage('<instanceId>', '<folderKey>', CaseInstanceMessageName.UserAdhocTrigger, {
  itemData: { taskNames: ['Request Documents'] },
});
```

### triggerAdhocTask()

> **triggerAdhocTask**(`instanceId`: `string`, `folderKey`: `string`, `taskName`: `string`, `options?`: `CaseAppTriggerAdhocTaskOptions`): `Promise`\<`void`>

**`Experimental`**

Triggers one ad-hoc (manually-triggered) task on a running case instance.

Warning

Preview: This method is experimental and may change or be removed in future releases.

`taskName` is matched case-sensitively against the case plan; an unknown or non-ad-hoc name is rejected as not found. Requires `Cases.RunAdhocTasks` on the stage that owns the task. Resolves once the trigger is accepted, not once the task has run.

#### Parameters

- `instanceId`: `string` — ID of the case instance
- `folderKey`: `string` — Key of the folder the case instance lives in
- `taskName`: `string` — Case plan name of the task, as returned by `getAdhocTasks`
- `options?`: `CaseAppTriggerAdhocTaskOptions` — Optional input handed to the task

#### Returns

`Promise`\<`void`>

Promise resolving when the trigger is accepted

#### Examples

```
// First, list triggerable tasks with caseApp.getAdhocTasks('<instanceId>', '<folderKey>')
await caseApp.triggerAdhocTask('<instanceId>', '<folderKey>', 'Request Documents');
```

```
await caseApp.triggerAdhocTask('<instanceId>', '<folderKey>', 'Request Documents', {
  taskInput: { reason: 'Missing proof of address' },
});
```
