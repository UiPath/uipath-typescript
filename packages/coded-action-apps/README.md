# @uipath/coded-action-apps

A package for viewing coded action apps inside UiPath Action Center. It handles bi-directional communication between the coded action app (running in an iframe) and the Action Center host using `window.postMessage` events.

## Installation

```bash
npm install @uipath/coded-action-apps
```

## Overview

When Action Center opens a coded action app, it renders it inside an iframe. This package provides a service — `CodedActionAppsService` — that the app uses to:

- **Receive** task details from Action Center on load.
- **Notify** Action Center when task data changes (e.g. to enable the Save button).
- **Complete** a task with a chosen action and final data payload.
- **Display** toast messages inside Action Center.

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
const taskData = await service.getTaskDetailsFromActionCenter();

console.log(taskData.taskId);     // number
console.log(taskData.title);      // string
console.log(taskData.status);     // TaskStatus enum
console.log(taskData.isReadOnly); // boolean
console.log(taskData.data);       // the task's form data
console.log(taskData.folderId);   // number
console.log(taskData.folderName); // string
```

> **Note:** This call will reject with an error if Action Center does not respond within 3 seconds, or if the parent origin is not trusted.

---

### Notify Action Center of data changes

Call this whenever the user modifies the task form data. Action Center uses this signal to enable its Save button.

```ts
service.notifyDataChangedToActionCenter({ field: 'updatedValue' });
```

---

### Complete a task

Call this when the user submits the form to mark the task as complete. Provide the action taken (e.g. `"Approve"` or `"Reject"`) and the final data payload.

```ts
service.completeTaskInActionCenter('Approve', { approved: true, notes: 'Looks good' });
```

---

### Display a message in Action Center

Show a toast notification inside Action Center using one of the four severity levels.

```ts
import { MessageTypes } from '@uipath/coded-action-apps';

service.displayMessageInActionCenter('Validation successful', MessageTypes.Success);
service.displayMessageInActionCenter('Validation failed', MessageTypes.Error);
service.displayMessageInActionCenter('Please review the details', MessageTypes.Warning);
service.displayMessageInActionCenter('User information', MessageTypes.Info);
```

---

## API Reference

### `CodedActionAppsService`

| Method | Description |
|---|---|
| `getTaskDetailsFromActionCenter()` | Returns a `Promise<ActionCenterData>` with the current task's metadata and form data. |
| `notifyDataChangedToActionCenter(data)` | Sends updated data to Action Center to signal that the form has changed. |
| `completeTaskInActionCenter(actionTaken, data)` | Marks the task as complete with the given action label and final data. |
| `displayMessageInActionCenter(msg, type)` | Displays a toast message in Action Center with the given severity. |

---

### `ActionCenterData`

```ts
type ActionCenterData = {
  taskId: number;
  title: string;
  status: TaskStatus;
  isReadOnly: boolean;
  action: string | null;
  data: unknown;
  folderId: number;
  folderName: string;
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

### `MessageTypes`

```ts
enum MessageTypes {
  Info    = 'info',
  Success = 'success',
  Warning = 'warning',
  Error   = 'error',
}
```

---

## Security

The service reads the trusted parent origin from the `basedomain` query parameter in the iframe URL. All outbound `postMessage` calls are targeted exclusively at that origin. Incoming messages are validated against the same origin before being processed. Allowed origins are:

- `https://cloud.uipath.com`
- `https://staging.uipath.com`
- `https://alpha.uipath.com`
- `http://localhost` / `https://localhost` (for local development)

Any message from an origin outside this list is silently discarded.
