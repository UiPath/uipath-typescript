Service for managing UiPath Queues

Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)

### Usage

```
import { Queues } from '@uipath/uipath-typescript/queues';

const queues = new Queues(sdk);
const allQueues = await queues.getAllWithMethods();
```

## Methods

### ~~getAll()~~

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetResponse`> : `NonPaginatedResponse`\<`QueueGetResponse`>>

Gets all queues across folders with optional filtering and folder scoping

#### Type Parameters

- `T` *extends* `QueueGetAllOptions` = `QueueGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetResponse`> : `NonPaginatedResponse`\<`QueueGetResponse`>>

Promise resolving to either a [QueueGetResponse](../QueueGetResponse/) array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetResponse>` when pagination options are used.

#### Deprecated

Use [getAllWithMethods](#getallwithmethods) — it additionally attaches the operational methods to each queue and supports folder scoping via `folderKey` / `folderPath`. This method keeps returning plain queue data.

#### Example

```
// Standard array return
const allQueues = await queues.getAll();

// Get queues within a specific folder
const folderQueues = await queues.getAll({
  folderId: <folderId>
});
```

### getAllItems()

> **getAllItems**\<`T`>(`queueId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItem`> : `NonPaginatedResponse`\<`QueueItem`>>

Gets the items of a queue with optional filtering and pagination

Returns the queue's work items including their status, business payload (`specificData`), output, timing fields, and failure details.

#### Type Parameters

- `T` *extends* `QueueGetAllItemsOptions` = `QueueGetAllItemsOptions`

#### Parameters

- `queueId`: `number` — Queue ID
- `options?`: `T` — Query options including filtering, pagination, and folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItem`> : `NonPaginatedResponse`\<`QueueItem`>>

Promise resolving to either a [QueueItem](../QueueItem/) array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueItem>` when pagination options are used.

#### Examples

```
const items = await queues.getAllItems(<queueId>, { folderId: <folderId> });

// Failed items only, newest first — folder scoping also accepts a
// folder key or path
const failed = await queues.getAllItems(<queueId>, {
  folderPath: 'Shared/Finance',
  filter: "status eq 'Failed'",
  orderby: 'createdTime desc',
  pageSize: 25
});
```

```
// Or operate on a queue returned by getById/getAll
const queue = await queues.getByIdWithMethods(<queueId>, { folderId: <folderId> });
const items = await queue.getAllItems();
```

### getAllWithMethods()

> **getAllWithMethods**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetWithMethodsResponse`> : `NonPaginatedResponse`\<`QueueGetWithMethodsResponse`>>

Gets all queues with the operational methods attached, with optional filtering and folder scoping

#### Type Parameters

- `T` *extends* `QueueGetAllWithMethodsOptions` = `QueueGetAllWithMethodsOptions`

#### Parameters

- `options?`: `T` — Query options including folder scoping (`folderId` / `folderKey` / `folderPath`) and pagination options; without folder scoping, queues across all folders are returned

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetWithMethodsResponse`> : `NonPaginatedResponse`\<`QueueGetWithMethodsResponse`>>

Promise resolving to either a [QueueGetWithMethodsResponse](../../type-aliases/QueueGetWithMethodsResponse/) array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetWithMethodsResponse>` when pagination options are used. Each queue has methods attached for operating on its items.

#### Example

```
// Standard array return
const allQueues = await queues.getAllWithMethods();

// Get queues within a specific folder — also accepts folderKey / folderPath
const folderQueues = await queues.getAllWithMethods({
  folderId: <folderId>
});

// Get queues with filtering
const filteredQueues = await queues.getAllWithMethods({
  filter: "name eq 'MyQueue'"
});

// First page with pagination
const page1 = await queues.getAllWithMethods({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await queues.getAllWithMethods({ cursor: page1.nextCursor });
}

// Operate on a result directly via the attached methods
const item = await page1.items[0].insertItem({ invoiceId: 'INV-1001' });
```

### ~~getById()~~

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: `QueueGetByIdOptions`): `Promise`\<`QueueGetResponse`>

Gets a single queue by ID

#### Parameters

- `id`: `number` — Queue ID
- `folderId`: `number` — Required folder ID
- `options?`: `QueueGetByIdOptions` — -

#### Returns

`Promise`\<`QueueGetResponse`>

Promise resolving to a [QueueGetResponse](../QueueGetResponse/) — the queue definition

#### Deprecated

Use [getByIdWithMethods](#getbyidwithmethods) — it additionally attaches the operational methods to the queue and supports folder scoping via `folderKey` / `folderPath`. This method keeps returning plain queue data.

#### Example

```
const queue = await queues.getById(<queueId>, <folderId>);
```

### getByIdWithMethods()

> **getByIdWithMethods**(`id`: `number`, `options?`: `QueueGetByIdWithMethodsOptions`): `Promise`\<`QueueGetWithMethodsResponse`>

Gets a single queue by ID with the operational methods attached

#### Parameters

- `id`: `number` — Queue ID
- `options?`: `QueueGetByIdWithMethodsOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options

#### Returns

`Promise`\<`QueueGetWithMethodsResponse`>

Promise resolving to a [QueueGetWithMethodsResponse](../../type-aliases/QueueGetWithMethodsResponse/) — the queue definition with methods attached for operating on its items

#### Example

```
// Get queue by ID
const queue = await queues.getByIdWithMethods(<queueId>, { folderId: <folderId> });

// Folder scoping also accepts a folder key or path
const byPath = await queues.getByIdWithMethods(<queueId>, { folderPath: 'Shared/Finance' });

// Operate on the queue directly via the attached methods
const items = await queue.getAllItems();
const item = await queue.insertItem({
  invoiceId: 'INV-1001',
  amount: 1520
});
```

### getByKey()

> **getByKey**(`key`: `string`, `options?`: `QueueGetByKeyOptions`): `Promise`\<`QueueGetWithMethodsResponse`>

Gets a single queue by key (the queue's GUID identifier)

#### Parameters

- `key`: `string` — Queue key (GUID)
- `options?`: `QueueGetByKeyOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options

#### Returns

`Promise`\<`QueueGetWithMethodsResponse`>

Promise resolving to a [QueueGetWithMethodsResponse](../../type-aliases/QueueGetWithMethodsResponse/) — the queue definition with methods attached for operating on its items

#### Example

```
const queue = await queues.getByKey('<queueKey>', { folderId: <folderId> });
```

### getByName()

> **getByName**(`name`: `string`, `options?`: `QueueGetByNameOptions`): `Promise`\<`QueueGetWithMethodsResponse`>

Gets a single queue by name

#### Parameters

- `name`: `string` — Queue name (exact match)
- `options?`: `QueueGetByNameOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options

#### Returns

`Promise`\<`QueueGetWithMethodsResponse`>

Promise resolving to a [QueueGetWithMethodsResponse](../../type-aliases/QueueGetWithMethodsResponse/) — the queue definition with methods attached for operating on its items

#### Example

```
const queue = await queues.getByName('<queueName>', { folderId: <folderId> });

// Folder scoping also accepts a folder key or path
const byKey = await queues.getByName('<queueName>', { folderKey: '<folderKey>' });
```

### insertItemByName()

> **insertItemByName**(`queueName`: `string`, `specificData`: `Record`\<`string`, `QueueItemValue`>, `options?`: `QueueInsertItemOptions`): `Promise`\<`QueueItem`>

Inserts a new item into a queue by queue name

Returns the created queue item including its id, status, and the stored payload. Payload keys keep their original casing — the SDK performs no case conversion on them, while method options and response fields still use the SDK's usual camelCase; `Date` values in the payload are serialized to ISO-8601 strings.

The payload must be flat — values are simple scalars (see [QueueItemValue](../../type-aliases/QueueItemValue/)); nested objects and arrays are rejected.

#### Parameters

- `queueName`: `string` — Name of the queue to insert into
- `specificData`: `Record`\<`string`, `QueueItemValue`> — The item's business payload (stored as the queue item's specific content)
- `options?`: `QueueInsertItemOptions` — Item metadata (priority, reference, defer/due dates) and folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`QueueItem`>

Promise resolving to the created [QueueItem](../QueueItem/)

#### Example

```
import { QueuePriority } from '@uipath/uipath-typescript/queues';

// Minimal insert
const item = await queues.insertItemByName('<queueName>', {
  invoiceId: 'INV-1001',
  amount: 1520
}, { folderId: <folderId> });

// With metadata — folder scoping also accepts a folder key or path
const rushItem = await queues.insertItemByName('<queueName>', {
  invoiceId: 'INV-1002'
}, {
  folderKey: '<folderKey>',
  priority: QueuePriority.High,
  reference: 'INV-1002',
  dueDate: new Date('2026-08-15')
});
```
