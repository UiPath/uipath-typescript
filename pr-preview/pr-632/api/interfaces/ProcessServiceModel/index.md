Service for managing and executing UiPath Automation Processes.

Processes (also known as automations or workflows) are the core units of automation in UiPath, representing sequences of activities that perform specific business tasks. [UiPath Processes Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-processes)

### Usage

```
import { Processes } from '@uipath/uipath-typescript/processes';

const processes = new Processes(sdk);
const allProcesses = await processes.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ProcessGetResponse`> : `NonPaginatedResponse`\<`ProcessGetResponse`>>

Gets all processes across folders with optional filtering Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided, or a PaginatedResponse when any pagination parameter is provided

#### Type Parameters

- `T` *extends* `ProcessGetAllOptions` = `ProcessGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ProcessGetResponse`> : `NonPaginatedResponse`\<`ProcessGetResponse`>>

Promise resolving to either an array of processes NonPaginatedResponse or a PaginatedResponse when pagination options are used. [ProcessGetResponse](../ProcessGetResponse/)

#### Example

```
// Standard array return
const allProcesses = await processes.getAll();

// Get processes within a specific folder
const folderProcesses = await processes.getAll({
  folderId: <folderId>
});

// Get processes with filtering
const filteredProcesses = await processes.getAll({
  filter: "name eq 'MyProcess'"
});

// First page with pagination
const page1 = await processes.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await processes.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await processes.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: `ProcessGetByIdOptions`): `Promise`\<`ProcessGetResponse`>

Gets a single process by ID

#### Parameters

- `id`: `number` — Process ID
- `folderId`: `number` — Required folder ID
- `options?`: `ProcessGetByIdOptions` — Optional query parameters

#### Returns

`Promise`\<`ProcessGetResponse`>

Promise resolving to a single process [ProcessGetResponse](../ProcessGetResponse/)

#### Example

```
// Get process by ID
const process = await processes.getById(<processId>, <folderId>);
```

### getByName()

> **getByName**(`name`: `string`, `options?`: `ProcessGetByNameOptions`): `Promise`\<`ProcessGetResponse`>

Retrieves a single process by name.

#### Parameters

- `name`: `string` — Process name to search for
- `options?`: `ProcessGetByNameOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)

#### Returns

`Promise`\<`ProcessGetResponse`>

Promise resolving to a single process [ProcessGetResponse](../ProcessGetResponse/)

#### Example

```
// By folder ID
await processes.getByName('MyProcess', { folderId: 123 });

// By folder key (GUID)
await processes.getByName('MyProcess', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });

// With expand
await processes.getByName('MyProcess', { folderPath: 'Shared/Finance', expand: 'entryPoints' });
```

### start()

#### Call Signature

> **start**(`request`: `ProcessStartRequest`, `options?`: `ProcessStartOptions`): `Promise`\<`ProcessStartResponse`[]>

Starts a process with the specified configuration.

Folder context can be supplied as `folderId`, `folderKey`, or `folderPath` inside the options.

##### Parameters

| Parameter  | Type                  | Description                                                                                                                      |
| ---------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `request`  | `ProcessStartRequest` | Process start configuration                                                                                                      |
| `options?` | `ProcessStartOptions` | Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`, `filter`, `orderby`) |

##### Returns

`Promise`\<`ProcessStartResponse`[]>

Promise resolving to array of started process instances [ProcessStartResponse](../ProcessStartResponse/)

##### Example

```
// By folder ID
await processes.start({ processKey: '<processKey>' }, { folderId: <folderId> });

// By folder key (GUID)
await processes.start({ processKey: '<processKey>' }, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await processes.start({ processKey: '<processKey>' }, { folderPath: 'Shared/Finance' });

// Start by process name (instead of processKey)
await processes.start({ processName: 'MyProcess' }, { folderId: <folderId> });

// With additional options
await processes.start({ processKey: '<processKey>' }, { folderId: <folderId>, expand: 'Robot' });
```

#### Call Signature

> **start**(`request`: `ProcessStartRequest`, `folderId`: `number`, `options?`: `RequestOptions`): `Promise`\<`ProcessStartResponse`[]>

Starts a process — positional `folderId` form.

##### Parameters

| Parameter  | Type                  | Description                  |
| ---------- | --------------------- | ---------------------------- |
| `request`  | `ProcessStartRequest` | Process start configuration  |
| `folderId` | `number`              | Required folder ID (numeric) |
| `options?` | `RequestOptions`      | Optional request options     |

##### Returns

`Promise`\<`ProcessStartResponse`[]>

Promise resolving to array of started process instances [ProcessStartResponse](../ProcessStartResponse/)

##### Deprecated

Use the options-object form: `start(request, { folderId })`. See [ProcessStartOptions](../ProcessStartOptions/) for the supported options.
