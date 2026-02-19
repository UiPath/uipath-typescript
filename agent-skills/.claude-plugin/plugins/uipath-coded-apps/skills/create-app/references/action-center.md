# Action Center Reference

## Import

```typescript
import { Tasks } from '@uipath/uipath-typescript/tasks';
```

## Scopes

- Read: `OR.Tasks` or `OR.Tasks.Read`
- Write: `OR.Tasks` or `OR.Tasks.Write`

## Types to Import

```typescript
import type {
  TaskGetResponse,
  RawTaskGetResponse,
  TaskCreateResponse,
  RawTaskCreateResponse,
  TaskMethods,
  TaskCreateOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskGetUsersOptions,
  TaskAssignOptions,
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TaskCompleteOptions,
  TaskCompletionOptions,
  UserLoginInfo,
  TaskSlaDetail,
  TaskAssignment,
  TaskActivity,
  Tag,
  TaskSource,
} from '@uipath/uipath-typescript/tasks';
```

## Enums

```typescript
import {
  TaskType,          // Form = 'FormTask', External = 'ExternalTask', App = 'AppTask'
  TaskPriority,      // Low, Medium, High, Critical
  TaskStatus,        // Unassigned, Pending, Completed
  TaskSlaStatus,     // OverdueLater, OverdueSoon, Overdue, CompletedInTime
  TaskSlaCriteria,   // TaskCreated, TaskAssigned, TaskCompleted
  TaskActivityType,  // Created, Assigned, Reassigned, Unassigned, Saved, Forwarded, Completed, Commented, Deleted, BulkSaved, BulkCompleted, FirstOpened
  TaskSourceName,    // Agent, Workflow, Maestro, Default
} from '@uipath/uipath-typescript/tasks';
```

## Tasks Service

### create(options: TaskCreateOptions, folderId: number)

Returns `Promise<TaskCreateResponse>` (task data with attached methods). Options: `{ title: string, data?: Record<string, unknown>, priority?: TaskPriority }`. The `folderId` is required.

### getAll(options?: TaskGetAllOptions)

Returns `NonPaginatedResponse<TaskGetResponse>` or `PaginatedResponse<TaskGetResponse>`. Options extend `RequestOptions & PaginationOptions & { folderId?: number, asTaskAdmin?: boolean }`. Supports `filter`, `orderby`, `expand`, `select`, pagination.

### getById(id: number, options?: TaskGetByIdOptions, folderId?: number)

Returns `Promise<TaskGetResponse>` with attached methods. For form tasks, `folderId` is required.

`TaskGetResponse` key fields: `id`, `title`, `status`, `type`, `priority`, `folderId`, `key`, `isDeleted`, `isCompleted`, `createdTime`, `assignedToUser`, `formLayout` (for form tasks), `taskAssignments`, `activities`, `tags`.

### getUsers(folderId: number, options?: TaskGetUsersOptions)

Returns `NonPaginatedResponse<UserLoginInfo>` or `PaginatedResponse<UserLoginInfo>`. Each user has: `name`, `surname`, `userName`, `emailAddress`, `displayName`, `id`.

### assign(options: TaskAssignmentOptions | TaskAssignmentOptions[])

Returns `Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>`. Each assignment requires `taskId` and either `userId` or `userNameOrEmail`.

### reassign(options: TaskAssignmentOptions | TaskAssignmentOptions[])

Same signature as assign. Reassigns tasks to new users.

### unassign(taskId: number | number[])

Returns `Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>>`. Accepts single ID or array.

### complete(options: TaskCompletionOptions, folderId: number)

Returns `Promise<OperationResponse<TaskCompletionOptions>>`. The `folderId` is required.

`TaskCompletionOptions` is a discriminated union:
- For `TaskType.External`: `{ type: TaskType.External, taskId: number, data?: any, action?: string }`
- For other types: `{ type: TaskType.Form | TaskType.App, taskId: number, data: any, action: string }`

## Task-Attached Methods (TaskMethods)

Returned by `getAll()`, `getById()`, and `create()` on each task:

- `task.assign(options: TaskAssignOptions)` -> requires `{ userId }` or `{ userNameOrEmail }`
- `task.reassign(options: TaskAssignOptions)` -> same options as assign
- `task.unassign()` -> no arguments needed, uses the task's own ID
- `task.complete(options: TaskCompleteOptions)` -> `{ type, data?, action? }` (no taskId needed, uses own ID)

`TaskAssignOptions` type: `{ userId: number } | { userNameOrEmail: string }` (mutually exclusive).

## Usage Example

```typescript
import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { TaskType, TaskPriority } from '@uipath/uipath-typescript/tasks';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';

function TaskInbox({ folderId }: { folderId: number }) {
  const { sdk } = useAuth();
  const tasks = useMemo(() => new Tasks(sdk), [sdk]);
  const [taskList, setTaskList] = useState<TaskGetResponse[]>([]);

  useEffect(() => {
    const load = async () => {
      const result = await tasks.getAll({ folderId, pageSize: 20 });
      setTaskList(result.items);
    };
    load();
  }, [tasks, folderId]);

  const handleComplete = async (task: TaskGetResponse) => {
    await task.complete({
      type: TaskType.External,
    });
  };

  const handleAssign = async (task: TaskGetResponse, userId: number) => {
    await task.assign({ userId });
  };

  const handleCreate = async () => {
    const newTask = await tasks.create({
      title: 'Review document',
      priority: TaskPriority.Medium,
    }, folderId);
  };
}
```
