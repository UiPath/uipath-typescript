Service for managing UiPath Queues

Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)

### Usage

```
import { Queues } from '@uipath/uipath-typescript/queues';

const queues = new Queues(sdk);
const allQueues = await queues.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueWithMethods`> : `NonPaginatedResponse`\<`QueueWithMethods`>>

Gets all queues across folders with optional filtering and folder scoping

#### Type Parameters

- `T` *extends* `QueueGetAllOptions` = `QueueGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueWithMethods`> : `NonPaginatedResponse`\<`QueueWithMethods`>>

Promise resolving to either an array of queues NonPaginatedResponse or a PaginatedResponse when pagination options are used. Each queue has methods attached for operating on its items. [QueueWithMethods](../../type-aliases/QueueWithMethods/)

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

### getAllItems()

> **getAllItems**\<`T`>(`queueId`: `number`, `folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItemResponse`> : `NonPaginatedResponse`\<`QueueItemResponse`>>

Gets the items of a queue with optional filtering and pagination

Returns the queue's work items including their status, business payload (`specificData`), output, timing fields, and failure details.

#### Type Parameters

- `T` *extends* `QueueGetAllItemsOptions` = `QueueGetAllItemsOptions`

#### Parameters

- `queueId`: `number` — Queue ID
- `folderId`: `number` — Required folder ID
- `options?`: `T` — Query options including filtering and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItemResponse`> : `NonPaginatedResponse`\<`QueueItemResponse`>>

Promise resolving to either an array of queue items NonPaginatedResponse or a PaginatedResponse when pagination options are used. [QueueItemResponse](../QueueItemResponse/)

#### Example

```
// First, get queues with queues.getAll()
const items = await queues.getAllItems(<queueId>, <folderId>);

// Failed items only, newest first
const failed = await queues.getAllItems(<queueId>, <folderId>, {
  filter: "status eq 'Failed'",
  orderby: 'createdTime desc',
  pageSize: 25
});
```

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: `QueueGetByIdOptions`): `Promise`\<`QueueWithMethods`>

Gets a single queue by ID

#### Parameters

- `id`: `number` — Queue ID
- `folderId`: `number` — Required folder ID
- `options?`: `QueueGetByIdOptions` — -

#### Returns

`Promise`\<`QueueWithMethods`>

Promise resolving to a queue definition with methods attached for operating on its items [QueueWithMethods](../../type-aliases/QueueWithMethods/)

#### Example

```
// Get queue by ID
const queue = await queues.getById(<queueId>, <folderId>);

// Operate on the queue directly via the attached methods
const items = await queue.getAllItems();
```

### insertItemByName()

> **insertItemByName**(`queueName`: `string`, `folderId`: `number`, `specificData`: `Record`\<`string`, `unknown`>, `options?`: `QueueInsertItemOptions`): `Promise`\<`QueueItemResponse`>

Inserts a new item into a queue by queue name (producer operation)

Returns the created queue item including its id, status, and the stored payload. The payload keys are user-defined and are stored and returned exactly as provided.

The payload must be flat: values have to be simple scalars (string, number, boolean, date). Nested objects and arrays are rejected by Orchestrator.

#### Parameters

- `queueName`: `string` — Name of the queue to insert into
- `folderId`: `number` — Required folder ID
- `specificData`: `Record`\<`string`, `unknown`> — The item's business payload (stored as the queue item's specific content)
- `options?`: `QueueInsertItemOptions` — Optional item metadata (priority, reference, defer/due dates)

#### Returns

`Promise`\<`QueueItemResponse`>

Promise resolving to the created queue item [QueueItemResponse](../QueueItemResponse/)

#### Example

```
import { QueuePriority } from '@uipath/uipath-typescript/queues';

// Minimal insert
const item = await queues.insertItemByName('<queueName>', <folderId>, {
  invoiceId: 'INV-1001',
  amount: 1520
});

// With metadata
const rushItem = await queues.insertItemByName('<queueName>', <folderId>, {
  invoiceId: 'INV-1002'
}, {
  priority: QueuePriority.High,
  reference: 'INV-1002',
  dueDate: new Date('2026-08-15')
});
```
