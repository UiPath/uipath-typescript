Service for managing UiPath Queues

Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)

### Usage

```
import { Queues } from '@uipath/uipath-typescript/queues';

const queues = new Queues(sdk);
const allQueues = await queues.getAll();
```

## Methods

### completeTransaction()

> **completeTransaction**(`itemId`: `number`, `folderId`: `number`, `isSuccessful`: `boolean`, `options?`: `TransactionCompletionOptions`): `Promise`\<`OperationResponse`\<`void`>>

Completes a transaction: reports the processing outcome of a queue item

Marks the item `Successful` or `Failed` (with the failure details from [TransactionCompletionOptions](../TransactionCompletionOptions/)), and can persist output data alongside the result.

Applies to items with an active transaction. Changing the outcome of an item that already reached a terminal status is rejected.

#### Parameters

- `itemId`: `number` — Queue item ID of the transaction to complete
- `folderId`: `number` — Required folder ID
- `isSuccessful`: `boolean` — True when the item was processed successfully; false records a failure (provide `processingError` in options)
- `options?`: `TransactionCompletionOptions` — Completion details (output data, failure details, new defer/due dates)

#### Returns

`Promise`\<`OperationResponse`\<`void`>>

Promise resolving to an operation response confirming the completion was applied

#### Example

```
import { QueueExceptionType } from '@uipath/uipath-typescript/queues';

// Report success with output data
await queues.completeTransaction(<itemId>, <folderId>, true, {
  outputData: { paymentId: 'P-778' }
});

// Report a business failure (not retried)
await queues.completeTransaction(<itemId>, <folderId>, false, {
  processingError: {
    reason: 'Vendor not found',
    type: QueueExceptionType.BusinessException
  }
});
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetResponse`> : `NonPaginatedResponse`\<`QueueGetResponse`>>

Gets all queues across folders with optional filtering and folder scoping

#### Type Parameters

- `T` *extends* `QueueGetAllOptions` = `QueueGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueGetResponse`> : `NonPaginatedResponse`\<`QueueGetResponse`>>

Promise resolving to either a [QueueGetResponse](../../type-aliases/QueueGetResponse/) array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetResponse>` when pagination options are used. Each queue has methods attached for operating on its items.

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

> **getAllItems**\<`T`>(`queueId`: `number`, `folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItem`> : `NonPaginatedResponse`\<`QueueItem`>>

Gets the items of a queue with optional filtering and pagination

Returns the queue's work items including their status, business payload (`specificData`), output, timing fields, and failure details.

#### Type Parameters

- `T` *extends* `QueueGetAllItemsOptions` = `QueueGetAllItemsOptions`

#### Parameters

- `queueId`: `number` — Queue ID
- `folderId`: `number` — Required folder ID
- `options?`: `T` — Query options including filtering and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`QueueItem`> : `NonPaginatedResponse`\<`QueueItem`>>

Promise resolving to either a [QueueItem](../QueueItem/) array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueItem>` when pagination options are used.

#### Examples

```
const items = await queues.getAllItems(<queueId>, <folderId>);

// Failed items only, newest first
const failed = await queues.getAllItems(<queueId>, <folderId>, {
  filter: "status eq 'Failed'",
  orderby: 'createdTime desc',
  pageSize: 25
});
```

```
// Or operate on a queue returned by getById/getAll
const queue = await queues.getById(<queueId>, <folderId>);
const items = await queue.getAllItems();
```

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: `QueueGetByIdOptions`): `Promise`\<`QueueGetResponse`>

Gets a single queue by ID

#### Parameters

- `id`: `number` — Queue ID
- `folderId`: `number` — Required folder ID
- `options?`: `QueueGetByIdOptions` — -

#### Returns

`Promise`\<`QueueGetResponse`>

Promise resolving to a [QueueGetResponse](../../type-aliases/QueueGetResponse/) — the queue definition with methods attached for operating on its items

#### Example

```
// Get queue by ID
const queue = await queues.getById(<queueId>, <folderId>);

// Operate on the queue directly via the attached methods
const items = await queue.getAllItems();
const item = await queue.insertItem({
  invoiceId: 'INV-1001',
  amount: 1520
});
```

### insertItemByName()

> **insertItemByName**(`queueName`: `string`, `folderId`: `number`, `specificData`: `Record`\<`string`, `QueueItemValue`>, `options?`: `QueueInsertItemOptions`): `Promise`\<`QueueItem`>

Inserts a new item into a queue by queue name

Returns the created queue item including its id, status, and the stored payload. Payload keys keep their original casing — the SDK performs no case conversion on them, while method options and response fields still use the SDK's usual camelCase; `Date` values in the payload are serialized to ISO-8601 strings.

The payload must be flat — values are simple scalars (see [QueueItemValue](../../type-aliases/QueueItemValue/)); nested objects and arrays are rejected.

#### Parameters

- `queueName`: `string` — Name of the queue to insert into
- `folderId`: `number` — Required folder ID
- `specificData`: `Record`\<`string`, `QueueItemValue`> — The item's business payload (stored as the queue item's specific content)
- `options?`: `QueueInsertItemOptions` — Optional item metadata (priority, reference, defer/due dates)

#### Returns

`Promise`\<`QueueItem`>

Promise resolving to the created [QueueItem](../QueueItem/)

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

### startTransactionByName()

> **startTransactionByName**(`queueName`: `string`, `folderId`: `number`): `Promise`\<`null` | `QueueItem`>

Starts a transaction: acquires the next available item from a queue and marks it `InProgress`

Requires a robot session. Orchestrator allocates the item to the robot that sent the request, so user and application identities always receive `null`, however many items are waiting. Queue items are normally consumed by a robot running a process — apps produce with `insertItemByName` and observe with `getAllItems`, leaving acquisition to the robot.

`null` covers both "no eligible items" and "no allocation target" — the two are not distinguishable.

#### Parameters

- `queueName`: `string` — Name of the queue to take the next item from
- `folderId`: `number` — Required folder ID

#### Returns

`Promise`\<`null` | `QueueItem`>

Promise resolving to the acquired [QueueItem](../QueueItem/) (in `InProgress` status with `processingStartTime` set), or `null` when no item is available

#### Example

```
const transaction = await queues.startTransactionByName('<queueName>', <folderId>);

if (transaction) {
  // Running under a robot session: the item is now locked to this caller
  console.log(transaction.status);        // 'InProgress'
  console.log(transaction.specificData);  // the item's business payload
} else {
  // No item was acquired. This happens when the queue has no eligible
  // items — and always for user/application identities (e.g. a coded app
  // signed in with OAuth), which have no robot session for Orchestrator
  // to allocate the item to.
  console.log('Nothing to process');
}
```
