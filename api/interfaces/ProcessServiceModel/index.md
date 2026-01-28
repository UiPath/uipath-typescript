Service for managing and executing UiPath Automation Processes.

Processes (also known as automations or workflows) are the core units of automation in UiPath, representing sequences of activities that perform specific business tasks. [UiPath Processes Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-processes)

## Methods

### getAll()

```
getAll<T>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<ProcessGetResponse> : NonPaginatedResponse<ProcessGetResponse>>;
```

Gets all processes across folders with optional filtering Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided, or a PaginatedResponse when any pagination parameter is provided

#### Type Parameters

| Type Parameter                                                                   | Default type                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `T` *extends* [`ProcessGetAllOptions`](../../type-aliases/ProcessGetAllOptions/) | [`ProcessGetAllOptions`](../../type-aliases/ProcessGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ProcessGetResponse`](../ProcessGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ProcessGetResponse`](../ProcessGetResponse/)>>

Promise resolving to either an array of processes NonPaginatedResponse or a PaginatedResponse when pagination options are used. [ProcessGetResponse](../ProcessGetResponse/)

#### Example

```
// Standard array return
const processes = await sdk.processes.getAll();

// Get processes within a specific folder
const processes = await sdk.processes.getAll({ 
  folderId: <folderId>
});

// Get processes with filtering
const processes = await sdk.processes.getAll({ 
  filter: "name eq 'MyProcess'"
});

// First page with pagination
const page1 = await sdk.processes.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await sdk.processes.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await sdk.processes.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

______________________________________________________________________

### getById()

```
getById(
   id: number, 
   folderId: number, 
   options?: BaseOptions): Promise<ProcessGetResponse>;
```

Gets a single process by ID

#### Parameters

| Parameter  | Type                             | Description               |
| ---------- | -------------------------------- | ------------------------- |
| `id`       | `number`                         | Process ID                |
| `folderId` | `number`                         | Required folder ID        |
| `options?` | [`BaseOptions`](../BaseOptions/) | Optional query parameters |

#### Returns

`Promise`\<[`ProcessGetResponse`](../ProcessGetResponse/)>

Promise resolving to a single process [ProcessGetResponse](../ProcessGetResponse/)

#### Example

```
// Get process by ID
const process = await sdk.processes.getById(<processId>, <folderId>);
```

______________________________________________________________________

### start()

```
start(
   request: ProcessStartRequest, 
   folderId: number, 
   options?: RequestOptions): Promise<ProcessStartResponse[]>;
```

Starts a process with the specified configuration

#### Parameters

| Parameter  | Type                                                             | Description                 |
| ---------- | ---------------------------------------------------------------- | --------------------------- |
| `request`  | [`ProcessStartRequest`](../../type-aliases/ProcessStartRequest/) | Process start configuration |
| `folderId` | `number`                                                         | Required folder ID          |
| `options?` | [`RequestOptions`](../RequestOptions/)                           | Optional request options    |

#### Returns

`Promise`\<[`ProcessStartResponse`](../ProcessStartResponse/)[]>

Promise resolving to array of started process instances [ProcessStartResponse](../ProcessStartResponse/)

#### Example

```
// Start a process by process key
const process = await sdk.processes.start({
  processKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}, <folderId>); // folderId is required

// Start a process by name with specific robots
const process = await sdk.processes.start({
  processName: "MyProcess"
}, <folderId>); // folderId is required
```
