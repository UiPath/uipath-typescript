Service for bi-directional communication between coded action apps and Action Center

## Implements

- [`CodedActionAppsServiceModel`](../interfaces/CodedActionAppsServiceModel.md)

## Constructors

### Constructor

> **new CodedActionApps**(): `CodedActionAppsService`

#### Returns

`CodedActionAppsService`

## Methods

### completeTask()

> **completeTask**(`actionTaken`: `string`, `data`: `unknown`): `Promise`&lt;[`TaskCompleteResponse`](../type-aliases/TaskCompleteResponse.md)&gt;

Marks the current task as complete in Action Center.
Sends the final action and associated data to Action Center,
signalling that the user has finished interacting with the task.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `actionTaken` | `string` | A string identifying the action the user performed (e.g. `"Approve"`, `"Reject"`). |
| `data` | `unknown` | The final data payload to submit alongside the completion event. |

#### Returns

`Promise`&lt;[`TaskCompleteResponse`](../type-aliases/TaskCompleteResponse.md)&gt;

A promise that resolves with a [TaskCompleteResponse](../type-aliases/TaskCompleteResponse.md) object
  containing success and error message if any.

#### Throws

If called from an untrusted origin.

#### Throws

If a completeTask call is already in progress.

#### Implementation of

[`CodedActionAppsServiceModel`](../interfaces/CodedActionAppsServiceModel.md).[`completeTask`](../interfaces/CodedActionAppsServiceModel.md#completetask)

***

### getTask()

> **getTask**(): `Promise`&lt;[`Task`](../type-aliases/Task.md)&gt;

Fetches the current opened task's details from Action Center.

#### Returns

`Promise`&lt;[`Task`](../type-aliases/Task.md)&gt;

A promise that resolves with a [Task](../type-aliases/Task.md) object
  containing task metadata and data.

#### Throws

If called from an untrusted origin.

#### Throws

If Action Center does not respond within the allotted timeout.

#### Implementation of

[`CodedActionAppsServiceModel`](../interfaces/CodedActionAppsServiceModel.md).[`getTask`](../interfaces/CodedActionAppsServiceModel.md#gettask)

***

### setTaskData()

> **setTaskData**(`data`: `unknown`): `void`

Notifies Action Center that the task data has been changed by the user.
This is needed to enable the save button in Action Center when the task data has changed

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `unknown` | The updated data payload to send to Action Center. |

#### Returns

`void`

#### Implementation of

[`CodedActionAppsServiceModel`](../interfaces/CodedActionAppsServiceModel.md).[`setTaskData`](../interfaces/CodedActionAppsServiceModel.md#settaskdata)

***

### showMessage()

> **showMessage**(`msg`: `string`, `type`: [`MessageSeverity`](../enumerations/MessageSeverity.md)): `void`

Displays a toast message inside Action Center.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `msg` | `string` | The message text to display. |
| `type` | [`MessageSeverity`](../enumerations/MessageSeverity.md) | The severity/style of the message (`info`, `success`, `warning`, or `error`). |

#### Returns

`void`

#### Implementation of

[`CodedActionAppsServiceModel`](../interfaces/CodedActionAppsServiceModel.md).[`showMessage`](../interfaces/CodedActionAppsServiceModel.md#showmessage)
