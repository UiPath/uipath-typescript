# @uipath/coded-action-apps

An SDK enabling coded apps to be the UI for tasks within UiPath Action Center. SDK handles bi-directional communication between the coded app and UiPath Action Center host using window.postMessage events.

## Installation

```bash
npm install @uipath/coded-action-apps
```

## Overview

Action Center renders a coded action app within an iframe. @uipath/coded-action-apps provides service CodedActionAppsService which offers below capabilities:

- **Receive** - `getTask()` - On app load, UiPath Action Center provides the task details.
- **Notify** - `setTaskData()` - Notify Action Center when task data changes (e.g. to enable the Save button).
- **Complete** - `completeTask()` - Completes the task when user clicks on submit buttons (e.g. 'Approve' or 'Reject' buttons)
- **Display** - `showMessage()` - Displays toast messages inside Action Center.

## Usage

### Initialise the service

```ts
import { CodedActionAppsService } from '@uipath/coded-action-apps';

const service = new CodedActionAppsService();
```

The class is also exported under the alias `CodedActionApps` for convenience:

```ts
import { CodedActionApps } from '@uipath/coded-action-apps';

const service = new CodedActionApps();
```

---

### Get task details from Action Center

Call this once when the app loads. It sends an `AC.init` event to Action Center and waits for the task data to be posted back. (**Recommended**: Do not call it more than once in your app)

```ts
const taskData = await service.getTask();

console.log(taskData.taskId);     // number
console.log(taskData.title);      // string
console.log(taskData.status);     // TaskStatus enum
console.log(taskData.isReadOnly); // boolean
console.log(taskData.data);       // the task's form data
console.log(taskData.folderId);   // number
console.log(taskData.folderName); // string
console.log(taskData.theme);      // Theme enum — the UI theme Action Center is currently using
```

> **Note:** This call will reject with an error if Action Center does not respond within 3 seconds, or if the parent origin is not trusted.

---

### Notify Action Center of data changes

Call this whenever the user modifies the task form data. Action Center uses this signal to enable its Save button.

```ts
service.setTaskData({ field: 'updatedValue' });
```

---

### Complete a task

Call this when the user submits the form to mark the task as complete. Provide the action taken (e.g. `"Approve"` or `"Reject"`) and the final data payload. The call returns a `Promise<TaskCompleteResponse>` that resolves once Action Center confirms the completion.

```ts
const result = await service.completeTask('Approve', { approved: true, notes: 'Looks good' });

if (!result.success) {
  console.error(result.errorMessage);
}
```

> **Note:** Only one `completeTask` call may be in flight at a time. Calling it again before the previous call resolves will throw an error: `"A completeTask call is already in progress"`.

---

### Display a message in Action Center

Show a toast notification inside Action Center using one of the four severity levels.

```ts
import { MessageSeverity } from '@uipath/coded-action-apps';

service.showMessage('Validation successful', MessageSeverity.Success);
service.showMessage('Validation failed', MessageSeverity.Error);
service.showMessage('Please review the details', MessageSeverity.Warning);
service.showMessage('User information', MessageSeverity.Info);
```

---

## API Reference

### `CodedActionAppsService`

| Method | Description |
|---|---|
| `getTask()` | Returns a `Promise<Task>` with the current task's metadata and form data. |
| `setTaskData(data)` | Sends updated data to Action Center to signal that the form has changed. |
| `completeTask(actionTaken, data)` | Marks the task as complete with the given action label and final data. Returns `Promise<TaskCompleteResponse>`. Throws if a call is already in progress. |
| `showMessage(msg, type)` | Displays a toast message in Action Center with the given severity. |

---

### `Task`

```ts
type Task = {
  taskId: number;
  title: string;
  status: TaskStatus;
  isReadOnly: boolean;
  action: string | null;
  data: unknown;
  folderId: number;
  folderName: string;
  theme: Theme;
};
```

---

### `TaskStatus`

```ts
enum TaskStatus {
  Unassigned = 'Unassigned',
  Pending    = 'Pending',
  Completed  = 'Completed',
}
```

---

### `Theme`

The UI theme that Action Center is currently using, passed to the coded action app on load via `getTask`. Apply this to your app's styling so it matches the Action Center host.

```ts
enum Theme {
  AutoTheme         = 'autoTheme',
  Light             = 'light',
  Dark              = 'dark',
  LightHighContrast = 'light-hc',
  DarkHighContrast  = 'dark-hc',
}
```

---

### `TaskCompleteResponse`

Returned by `completeTask` when Action Center responds.

```ts
type TaskCompleteResponse = {
  success: boolean;
  errorCode: number | null;
  errorMessage: string | null;
};
```

---

### `MessageSeverity`

```ts
enum MessageSeverity {
  Info    = 'info',
  Success = 'success',
  Warning = 'warning',
  Error   = 'error',
}
```
