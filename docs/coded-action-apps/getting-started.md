# Getting Started

An SDK enabling coded apps to be the UI for tasks within UiPath Action Center. SDK handles bi-directional communication between the coded app and UiPath Action Center host using `window.postMessage` events.

## Prerequisites

- **Node.js** 20.x or higher (for development tooling)
- **npm** 8.x or higher (or yarn/pnpm)
- **TypeScript** 4.5+ (recommended)

## Install the SDK

=== "npm"

    <!-- termynal -->

    ```bash
    $ npm install @uipath/uipath-ts-coded-action-apps

    found 0 vulnerabilities
    ```

=== "yarn"

    <!-- termynal -->

    ```bash
    $ yarn add @uipath/uipath-ts-coded-action-apps
    ✨ Done in 1.85s.
    ```

=== "pnpm"

    <!-- termynal -->

    ```bash
    $ pnpm add @uipath/uipath-ts-coded-action-apps
    ```

## Project Setup

A coded action app is a standard browser-based web application that runs in UiPath Action Center. Set up your project as you normally would, then install the `@uipath/uipath-ts-coded-action-apps` SDK.

=== "TypeScript Project"

    <!-- termynal -->

    ```bash
    $ mkdir my-uipath-project && cd my-uipath-project
    $ npm init -y
    Wrote to package.json
    $ npm install typescript @types/node ts-node --save-dev

    added x packages in 1s
    $ npx tsc --init
    Created a new tsconfig.json
    $ npm install @uipath/uipath-ts-coded-action-apps

    added x packages in 1s
    ```

=== "JavaScript Project"

    <!-- termynal -->

    ```bash
    $ mkdir my-uipath-project && cd my-uipath-project
    $ npm init -y
    Wrote to package.json
    $ npm install @uipath/uipath-ts-coded-action-apps

    added x packages in 1s
    ```

## Overview

Action Center renders a coded action app within an iframe. `@uipath/uipath-ts-coded-action-apps` provides `CodedActionAppsService` which offers the following capabilities:

- **Receive** — `getTask()` — On app load, UiPath Action Center provides the task details along with task data.
- **Notify** — `setTaskData()` — Notify Action Center when task data changes (e.g. to enable the Save button).
- **Complete** — `completeTask()` — Completes the task when user clicks on submit buttons (e.g. `'Approve'` or `'Reject'` buttons).
- **Display** — `showMessage()` — Displays toast messages inside Action Center.

## Import & Initialize

```typescript
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

const service = new CodedActionAppsService();
```

The class is also exported under the alias `CodedActionApps` for convenience:

```typescript
import { CodedActionApps } from '@uipath/uipath-ts-coded-action-apps';

const service = new CodedActionApps();
```

## Usage

### Get task details from Action Center

Call this once when the app loads. It sends an event to Action Center and waits for the task details and data to be posted back. (**Recommended**: Do not call it more than once in your app)

```typescript
const taskData = await service.getTask();

console.log(taskData.taskId); // number
console.log(taskData.title); // string
console.log(taskData.status); // TaskStatus enum
console.log(taskData.isReadOnly); // boolean
console.log(taskData.data); // the task's form data
console.log(taskData.folderId); // number
console.log(taskData.folderName); // string
console.log(taskData.theme); // Theme enum — the UI theme Action Center is currently using
```

!!! note
This call will reject with an error if Action Center does not respond within 3 seconds, or if the parent origin is not trusted.

### Notify Action Center of data changes

Call this whenever the user modifies the task form data. Action Center uses this signal to enable its Save button. Make sure to pass the full current task data.

```typescript
service.setTaskData({ field: 'updatedValue' });
```

### Complete a task

Call this when the user submits the form to mark the task as complete. Provide the action taken (e.g. `"Approve"` or `"Reject"`) and the final data payload. The call returns a `Promise<TaskCompleteResponse>` that resolves once Action Center confirms the completion.

```typescript
const result = await service.completeTask('Approve', { approved: true, notes: 'Looks good' });

if (!result.success) {
  console.error(result.errorMessage);
}
```

!!! note
Only one `completeTask` call may be in flight at a time. Calling it again before the previous call resolves will throw an error: `"A completeTask call is already in progress"`.

### Display a message in Action Center

Show a toast notification inside Action Center using one of the four severity levels.

```typescript
import { MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';

service.showMessage('Validation successful', MessageSeverity.Success);
service.showMessage('Validation failed', MessageSeverity.Error);
service.showMessage('Please review the details', MessageSeverity.Warning);
service.showMessage('User information', MessageSeverity.Info);
```

## **Vibe Coding**

The SDK is designed for rapid prototyping and development, making it perfect for vibe coding. Here are two ways to get started:

### **Option 1: AI IDE Integration**

After installing the SDK, supercharge your development with AI IDEs:

1. **Install the SDK**: `npm install @uipath/uipath-ts-coded-action-apps`
2. **Drag & Drop**: From your `node_modules/@uipath/uipath-ts-coded-action-apps` folder, drag the entire package into your AI IDE
3. **Start Prompting**: Your AI assistant now has full context of the SDK!

**Works with:**

- **GitHub Copilot**
- **Cursor**
- **Claude**
- **Any AI coding assistant**

### **Option 2: Copy Documentation for LLMs**

Give your AI assistant complete context by copying our documentation:

=== "Copy Full Documentation"

    **For Maximum Context:**

    1. **Download Complete Documentation**: [llms-full-content.txt](/uipath-typescript/coded-action-apps/llms.txt)

    2. **Copy and Paste**: Copy the entire content and paste it into your AI chat

    3. **Start Prompting**: Your AI now has complete SDK knowledge!

=== "Copy Individual Pages"

    **For Specific Features:**

    1. **Use the copy button** (📋) on any documentation page
    2. **Paste into your AI chat**
    3. **Ask specific questions** about that feature
