Service for managing UiPath Queues

Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Queues } from '@uipath/uipath-typescript/queues';

const queues = new Queues(sdk);
const allQueues = await queues.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`QueueGetResponse`](../QueueGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`QueueGetResponse`](../QueueGetResponse/)>>

Gets all queues across folders with optional filtering and folder scoping

#### Type Parameters

| Type Parameter                                                               | Default type                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `T` *extends* [`QueueGetAllOptions`](../../type-aliases/QueueGetAllOptions/) | [`QueueGetAllOptions`](../../type-aliases/QueueGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`QueueGetResponse`](../QueueGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`QueueGetResponse`](../QueueGetResponse/)>>

Promise resolving to either an array of queues NonPaginatedResponse or a PaginatedResponse when pagination options are used. [QueueGetResponse](../QueueGetResponse/)

#### Signature

getAll(options?) → Promise\<QueueGetResponse[]>

#### Example

```
// Standard array return
const allQueues = await queues.getAll();

// Get queues within a specific folder
const folderQueues = await queues.getAll({
  folderId: <folderId>
});

// Get queues with filtering
const filteredQueues = await queues.getAll({
  filter: "name eq 'MyQueue'"
});

// First page with pagination
const page1 = await queues.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await queues.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await queues.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

______________________________________________________________________

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: [`BaseOptions`](../BaseOptions/)): `Promise`\<[`QueueGetResponse`](../QueueGetResponse/)>

Gets a single queue by ID

#### Parameters

| Parameter  | Type                             | Description        |
| ---------- | -------------------------------- | ------------------ |
| `id`       | `number`                         | Queue ID           |
| `folderId` | `number`                         | Required folder ID |
| `options?` | [`BaseOptions`](../BaseOptions/) | -                  |

#### Returns

`Promise`\<[`QueueGetResponse`](../QueueGetResponse/)>

Promise resolving to a queue definition

#### Example

```
// Get queue by ID
const queue = await queues.getById(<queueId>, <folderId>);
```
