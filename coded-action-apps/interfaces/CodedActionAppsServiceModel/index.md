Service for bi-directional communication between coded action apps and Action Center

### Usage

```
import { CodedActionApps } from '@uipath/uipath-ts-coded-action-apps';

const service = new CodedActionApps();
```

## Methods

### completeTask()

> **completeTask**(`actionTaken`: `string`, `data`: `unknown`): `Promise`\<[`TaskCompleteResponse`](../../type-aliases/TaskCompleteResponse/)>

Marks the current task as complete in Action Center. Sends the final action and associated data to Action Center, signalling that the user has finished interacting with the task.

#### Parameters

| Parameter     | Type      | Description                                                                        |
| ------------- | --------- | ---------------------------------------------------------------------------------- |
| `actionTaken` | `string`  | A string identifying the action the user performed (e.g. `"Approve"`, `"Reject"`). |
| `data`        | `unknown` | The final data payload to submit alongside the completion event.                   |

#### Returns

`Promise`\<[`TaskCompleteResponse`](../../type-aliases/TaskCompleteResponse/)>

A promise that resolves with a [TaskCompleteResponse](../../type-aliases/TaskCompleteResponse/) object containing success and error message if any.

#### Throws

If called from an untrusted origin.

#### Throws

If a completeTask call is already in progress.

#### Example

```
// Approve a task
const result = await service.completeTask('Approve', { approved: true, notes: 'Looks good' });

if (!result.success) {
  console.error(`Failed (code ${result.errorCode}): ${result.errorMessage}`);
}

// Reject a task
const result = await service.completeTask('Reject', { approved: false, reason: 'Missing info' });

if (!result.success) {
  console.error(`Failed (code ${result.errorCode}): ${result.errorMessage}`);
}
```

______________________________________________________________________

### getTask()

> **getTask**(): `Promise`\<[`Task`](../../type-aliases/Task/)>

Fetches the current opened task's details from Action Center.

#### Returns

`Promise`\<[`Task`](../../type-aliases/Task/)>

A promise that resolves with a [Task](../../type-aliases/Task/) object containing task metadata and data.

#### Throws

If called from an untrusted origin.

#### Throws

If Action Center does not respond within the allotted timeout.

#### Example

```
// Call once when the app loads
const task = await service.getTask();

console.log(task.taskId);     // number
console.log(task.title);      // string
console.log(task.status);     // TaskStatus enum
console.log(task.isReadOnly); // boolean — disable editing if true
console.log(task.data);       // the task's form data
console.log(task.folderId);   // number
console.log(task.folderName); // string
console.log(task.theme);      // Theme enum — current Action Center UI theme

// Disable the form when task is read-only
if (task.isReadOnly) {
  disableForm();
}
```

______________________________________________________________________

### setTaskData()

> **setTaskData**(`data`: `unknown`): `void`

Notifies Action Center that the task data has been changed by the user. This is needed to enable the save button in Action Center when the task data has changed

#### Parameters

| Parameter | Type      | Description                                        |
| --------- | --------- | -------------------------------------------------- |
| `data`    | `unknown` | The updated data payload to send to Action Center. |

#### Returns

`void`

#### Example

```
// Call whenever the user modifies the form. Make sure to pass the full current task data
service.setTaskData({ name: 'John', approved: true, notes: 'Looks good' });
```

______________________________________________________________________

### showMessage()

> **showMessage**(`msg`: `string`, `type`: [`MessageSeverity`](../../enumerations/MessageSeverity/)): `void`

Displays a toast message inside Action Center.

#### Parameters

| Parameter | Type                                                     | Description                                                                   |
| --------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `msg`     | `string`                                                 | The message text to display.                                                  |
| `type`    | [`MessageSeverity`](../../enumerations/MessageSeverity/) | The severity/style of the message (`info`, `success`, `warning`, or `error`). |

#### Returns

`void`

#### Example

```
import { MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';

service.showMessage('Submitted successfully', MessageSeverity.Success);
service.showMessage('Submission failed', MessageSeverity.Error);
service.showMessage('Please review the details', MessageSeverity.Warning);
service.showMessage('Auto-saved', MessageSeverity.Info);
```
