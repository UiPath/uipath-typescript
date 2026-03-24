> **Task** = \{ `action`: `string` \| `null`; `data`: `unknown`; `folderId`: `number`; `folderName`: `string`; `isReadOnly`: `boolean`; `status`: [`TaskStatus`](../enumerations/TaskStatus.md); `taskId`: `number`; `theme`: [`Theme`](../enumerations/Theme.md); `title`: `string`; \}

Details of task opened in Action Center.

## Properties

### action

> **action**: `string` \| `null`

The action that was taken to complete the task, or `null` if not yet completed.

***

### data

> **data**: `unknown`

Data of the task.

***

### folderId

> **folderId**: `number`

ID of the folder the task belongs to.

***

### folderName

> **folderName**: `string`

Display name of the folder the task belongs to.

***

### isReadOnly

> **isReadOnly**: `boolean`

Whether the task is in read-only mode for the current user. Disable editing if this is true

***

### status

> **status**: [`TaskStatus`](../enumerations/TaskStatus.md)

Current status of the task.

***

### taskId

> **taskId**: `number`

Unique identifier of the task.

***

### theme

> **theme**: [`Theme`](../enumerations/Theme.md)

UI theme that Action Center is currently using.

***

### title

> **title**: `string`

Display title of the task.
