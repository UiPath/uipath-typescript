Service for managing UiPath Action Center

Tasks are task-based automation components that can be integrated into applications and processes. They represent discrete units of work that can be triggered and monitored through the UiPath API. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)

## Methods

### getAll()

```
getAll<T>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<TaskGetResponse> : NonPaginatedResponse<TaskGetResponse>>;
```

Gets all tasks across folders with optional filtering

#### Type Parameters

| Type Parameter                                                             | Default type                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `T` *extends* [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) | [`TaskGetAllOptions`](../../type-aliases/TaskGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>>

Promise resolving to either an array of tasks NonPaginatedResponse or a PaginatedResponse when pagination options are used. [TaskGetResponse](../../type-aliases/TaskGetResponse/)

______________________________________________________________________

### getById()

```
getById(
   id: number, 
   options?: BaseOptions, 
   folderId?: number): Promise<TaskGetResponse>;
```

#### Parameters

| Parameter   | Type                             |
| ----------- | -------------------------------- |
| `id`        | `number`                         |
| `options?`  | [`BaseOptions`](../BaseOptions/) |
| `folderId?` | `number`                         |

#### Returns

`Promise`\<[`TaskGetResponse`](../../type-aliases/TaskGetResponse/)>

______________________________________________________________________

### create()

```
create(options: TaskCreateOptions, folderId: number): Promise<TaskCreateResponse>;
```

#### Parameters

| Parameter  | Type                                         |
| ---------- | -------------------------------------------- |
| `options`  | [`TaskCreateOptions`](../TaskCreateOptions/) |
| `folderId` | `number`                                     |

#### Returns

`Promise`\<[`TaskCreateResponse`](../../type-aliases/TaskCreateResponse/)>

______________________________________________________________________

### assign()

```
assign(options: 
  | TaskAssignmentOptions
  | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<
  | TaskAssignmentOptions[]
  | TaskAssignmentResponse[]>>;
```

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `options`   |          |
| `folderId?` | `number` |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)< | [`TaskAssignmentOptions`](../TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

______________________________________________________________________

### reassign()

```
reassign(options: 
  | TaskAssignmentOptions
  | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<
  | TaskAssignmentOptions[]
  | TaskAssignmentResponse[]>>;
```

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `options`   |          |
| `folderId?` | `number` |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)< | [`TaskAssignmentOptions`](../TaskAssignmentOptions/)[] | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[]>>

______________________________________________________________________

### unassign()

```
unassign(taskId: number | number[], folderId?: number): Promise<OperationResponse<
  | TaskAssignmentResponse[]
  | {
  taskId: number;
}[]>>;
```

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `taskId`    | `number` |
| `folderId?` | `number` |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)< | [`TaskAssignmentResponse`](../TaskAssignmentResponse/)[] | { `taskId`: `number`; }[]>>

______________________________________________________________________

### complete()

```
complete(
   taskType: TaskType, 
   options: TaskCompletionOptions, 
   folderId: number): Promise<OperationResponse<TaskCompletionOptions>>;
```

#### Parameters

| Parameter  | Type                                                 |
| ---------- | ---------------------------------------------------- |
| `taskType` | [`TaskType`](../../enumerations/TaskType/)           |
| `options`  | [`TaskCompletionOptions`](../TaskCompletionOptions/) |
| `folderId` | `number`                                             |

#### Returns

`Promise`\<[`OperationResponse`](../OperationResponse/)\<[`TaskCompletionOptions`](../TaskCompletionOptions/)>>

______________________________________________________________________

### getUsers()

```
getUsers<T>(folderId: number, options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<UserLoginInfo> : NonPaginatedResponse<UserLoginInfo>>;
```

Gets users in the given folder who have Tasks.View and Tasks.Edit permissions Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided, or a PaginatedResponse when any pagination parameter is provided

#### Type Parameters

| Type Parameter                                                                 | Default type                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `T` *extends* [`TaskGetUsersOptions`](../../type-aliases/TaskGetUsersOptions/) | [`TaskGetUsersOptions`](../../type-aliases/TaskGetUsersOptions/) |

#### Parameters

| Parameter  | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `folderId` | `number` | The folder ID to get users from          |
| `options?` | `T`      | Optional query and pagination parameters |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`UserLoginInfo`](../UserLoginInfo/)>>

Promise resolving to NonPaginatedResponse or a paginated result
