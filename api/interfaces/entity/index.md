Service for managing UiPath Data Fabric Entities.

Entities are collections of records that can be used to store and manage data in the Data Fabric. [UiPath Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);
const allEntities = await entities.getAll();
```

## Methods

### deleteRecordsById()

> **deleteRecordsById**(`id`: `string`, `recordIds`: `string`[], `options?`: [`EntityDeleteOptions`](../EntityDeleteOptions/)): `Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Deletes data from an entity by entity ID

#### Parameters

| Parameter   | Type                                             | Description                     |
| ----------- | ------------------------------------------------ | ------------------------------- |
| `id`        | `string`                                         | UUID of the entity              |
| `recordIds` | `string`[]                                       | Array of record UUIDs to delete |
| `options?`  | [`EntityDeleteOptions`](../EntityDeleteOptions/) | Delete options                  |

#### Returns

`Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Promise resolving to delete response [EntityDeleteResponse](../../type-aliases/EntityDeleteResponse/)

#### Example

```
// Basic usage
const result = await entities.deleteRecordsById(<entityId>, [
  <recordId-1>, <recordId-2>
]);
```

______________________________________________________________________

### downloadAttachment()

> **downloadAttachment**(`options`: [`EntityDownloadAttachmentOptions`](../EntityDownloadAttachmentOptions/)): `Promise`\<`Blob`>

Downloads an attachment stored in a File-type field of an entity record.

#### Parameters

| Parameter | Type                                                                     | Description                                            |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `options` | [`EntityDownloadAttachmentOptions`](../EntityDownloadAttachmentOptions/) | Options containing entityName, recordId, and fieldName |

#### Returns

`Promise`\<`Blob`>

Promise resolving to Blob containing the file content

#### Example

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);

// First, get records to obtain the record ID
const records = await entities.getAllRecords("<entityId>");
// Get the recordId for the record that contains the attachment
const recordId = records.items[0].id;

// Download attachment using service method
const response = await entities.downloadAttachment({
  entityName: 'Invoice',
  recordId: recordId,
  fieldName: 'Documents'
});

// Or download using entity method
const entity = await entities.getById("<entityId>");
const blob = await entity.downloadAttachment(recordId, 'Documents');

// Browser: Display Image
const url = URL.createObjectURL(response);
document.getElementById('image').src = url;
// Call URL.revokeObjectURL(url) when done

// Browser: Display PDF in iframe
const url = URL.createObjectURL(response);
document.getElementById('pdf-viewer').src = url;
// Call URL.revokeObjectURL(url) when done

// Browser: Render PDF with PDF.js
const arrayBuffer = await response.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// Node.js: Save to file
const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync('attachment.pdf', buffer);
```

______________________________________________________________________

### getAll()

> **getAll**(): `Promise`\<[`EntityGetResponse`](../../type-aliases/EntityGetResponse/)[]>

Gets all entities in the system

#### Returns

`Promise`\<[`EntityGetResponse`](../../type-aliases/EntityGetResponse/)[]>

Promise resolving to either an array of entities NonPaginatedResponse or a PaginatedResponse when pagination options are used. [EntityGetResponse](../../type-aliases/EntityGetResponse/)

#### Example

```
// Get all entities
const allEntities = await entities.getAll();

// Iterate through entities
allEntities.forEach(entity => {
  console.log(`Entity: ${entity.displayName} (${entity.name})`);
  console.log(`Type: ${entity.entityType}`);
});

// Find a specific entity by name
const customerEntity = allEntities.find(e => e.name === 'Customer');

// Use entity methods directly
if (customerEntity) {
  const records = await customerEntity.getAllRecords();
  console.log(`Customer records: ${records.items.length}`);

  // Insert a single record
  const insertResult = await customerEntity.insertRecord({ name: "John", age: 30 });

  // Or batch insert multiple records
  const batchResult = await customerEntity.insertRecords([
    { name: "Jane", age: 25 },
    { name: "Bob", age: 35 }
  ]);
}
```

______________________________________________________________________

### getAllRecords()

> **getAllRecords**\<`T`>(`entityId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`EntityRecord`](../EntityRecord/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`EntityRecord`](../EntityRecord/)>>

Gets entity records by entity ID

#### Type Parameters

| Type Parameter                                                                                 | Default type                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `T` *extends* [`EntityGetRecordsByIdOptions`](../../type-aliases/EntityGetRecordsByIdOptions/) | [`EntityGetRecordsByIdOptions`](../../type-aliases/EntityGetRecordsByIdOptions/) |

#### Parameters

| Parameter  | Type     | Description        |
| ---------- | -------- | ------------------ |
| `entityId` | `string` | UUID of the entity |
| `options?` | `T`      | Query options      |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`EntityRecord`](../EntityRecord/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`EntityRecord`](../EntityRecord/)>>

Promise resolving to either an array of entity records NonPaginatedResponse or a PaginatedResponse when pagination options are used. [EntityRecord](../EntityRecord/)

#### Example

```
// Basic usage (non-paginated)
const records = await entities.getAllRecords(<entityId>);

// With expansion level
const records = await entities.getAllRecords(<entityId>, {
  expansionLevel: 1
});

// With pagination
const paginatedResponse = await entities.getAllRecords(<entityId>, {
  pageSize: 50,
  expansionLevel: 1
});

// Navigate to next page
const nextPage = await entities.getAllRecords(<entityId>, {
  cursor: paginatedResponse.nextCursor,
  expansionLevel: 1
});
```

______________________________________________________________________

### getById()

> **getById**(`id`: `string`): `Promise`\<[`EntityGetResponse`](../../type-aliases/EntityGetResponse/)>

Gets entity metadata by entity ID with attached operation methods

#### Parameters

| Parameter | Type     | Description        |
| --------- | -------- | ------------------ |
| `id`      | `string` | UUID of the entity |

#### Returns

`Promise`\<[`EntityGetResponse`](../../type-aliases/EntityGetResponse/)>

Promise resolving to entity metadata with operation methods [EntityGetResponse](../../type-aliases/EntityGetResponse/)

#### Example

```
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);
const choicesets = new ChoiceSets(sdk);

// Get entity metadata with methods
const entity = await entities.getById(<entityId>);

// Call operations directly on the entity
const records = await entity.getAllRecords();

// If a field references a ChoiceSet, get the choiceSetId from records.fields
const choiceSetId = records.fields[0].referenceChoiceSet?.id;
if (choiceSetId) {
  const choiceSetValues = await choicesets.getById(choiceSetId);
}

// Insert a single record
const insertResult = await entity.insertRecord({ name: "John", age: 30 });

// Or batch insert multiple records
const batchResult = await entity.insertRecords([
    { name: "Jane", age: 25 },
    { name: "Bob", age: 35 }
]);
```

______________________________________________________________________

### getRecordById()

> **getRecordById**(`entityId`: `string`, `recordId`: `string`, `options?`: [`EntityGetRecordByIdOptions`](../EntityGetRecordByIdOptions/)): `Promise`\<[`EntityRecord`](../EntityRecord/)>

Gets a single entity record by entity ID and record ID

#### Parameters

| Parameter  | Type                                                           | Description        |
| ---------- | -------------------------------------------------------------- | ------------------ |
| `entityId` | `string`                                                       | UUID of the entity |
| `recordId` | `string`                                                       | UUID of the record |
| `options?` | [`EntityGetRecordByIdOptions`](../EntityGetRecordByIdOptions/) | Query options      |

#### Returns

`Promise`\<[`EntityRecord`](../EntityRecord/)>

Promise resolving to a single entity record [EntityRecord](../EntityRecord/)

#### Example

```
// First, get records to obtain the record ID
const records = await entities.getAllRecords(<entityId>);
// Get the recordId for the record
const recordId = records.items[0].id;
// Get the record
const record = await entities.getRecordById(<entityId>, recordId);

// With expansion level
const record = await entities.getRecordById(<entityId>, recordId, {
  expansionLevel: 1
});
```

______________________________________________________________________

### insertRecordById()

> **insertRecordById**(`id`: `string`, `data`: `Record`\<`string`, `any`>, `options?`: [`EntityInsertOptions`](../EntityInsertOptions/)): `Promise`\<[`EntityRecord`](../EntityRecord/)>

Inserts a single record into an entity by entity ID

Note: Data Fabric supports trigger events only on individual inserts, not on inserting multiple records. Use this method if you need trigger events to fire for the inserted record.

#### Parameters

| Parameter  | Type                                             | Description        |
| ---------- | ------------------------------------------------ | ------------------ |
| `id`       | `string`                                         | UUID of the entity |
| `data`     | `Record`\<`string`, `any`>                       | Record to insert   |
| `options?` | [`EntityInsertOptions`](../EntityInsertOptions/) | Insert options     |

#### Returns

`Promise`\<[`EntityRecord`](../EntityRecord/)>

Promise resolving to the inserted record with generated record ID [EntityInsertResponse](../../type-aliases/EntityInsertResponse/)

#### Example

```
// Basic usage
const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 });

// With options
const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 }, {
  expansionLevel: 1
});
```

______________________________________________________________________

### insertRecordsById()

> **insertRecordsById**(`id`: `string`, `data`: `Record`\<`string`, `any`>[], `options?`: [`EntityOperationOptions`](../EntityOperationOptions/)): `Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Inserts one or more records into an entity by entity ID

Note: Records inserted using insertRecordsById will not trigger Data Fabric trigger events. Use [insertRecordById](#insertrecordbyid) if you need trigger events to fire for each inserted record.

#### Parameters

| Parameter  | Type                                                   | Description                |
| ---------- | ------------------------------------------------------ | -------------------------- |
| `id`       | `string`                                               | UUID of the entity         |
| `data`     | `Record`\<`string`, `any`>[]                           | Array of records to insert |
| `options?` | [`EntityOperationOptions`](../EntityOperationOptions/) | Insert options             |

#### Returns

`Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Promise resolving to insert response [EntityBatchInsertResponse](../../type-aliases/EntityBatchInsertResponse/)

#### Example

```
// Basic usage
const result = await entities.insertRecordsById(<entityId>, [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
]);

// With options
const result = await entities.insertRecordsById(<entityId>, [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
], {
  expansionLevel: 1,
  failOnFirst: true
});
```

______________________________________________________________________

### updateRecordsById()

> **updateRecordsById**(`id`: `string`, `data`: [`EntityRecord`](../EntityRecord/)[], `options?`: [`EntityOperationOptions`](../EntityOperationOptions/)): `Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Updates data in an entity by entity ID

#### Parameters

| Parameter  | Type                                                   | Description                                                         |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `id`       | `string`                                               | UUID of the entity                                                  |
| `data`     | [`EntityRecord`](../EntityRecord/)[]                   | Array of records to update. Each record MUST contain the record Id. |
| `options?` | [`EntityOperationOptions`](../EntityOperationOptions/) | Update options                                                      |

#### Returns

`Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Promise resolving to update response [EntityUpdateResponse](../../type-aliases/EntityUpdateResponse/)

#### Example

```
// Basic usage
const result = await entities.updateRecordsById(<entityId>, [
  { Id: "123", name: "John Updated", age: 31 },
  { Id: "456", name: "Jane Updated", age: 26 }
]);

// With options
const result = await entities.updateRecordsById(<entityId>, [
  { Id: "123", name: "John Updated", age: 31 },
  { Id: "456", name: "Jane Updated", age: 26 }
], {
  expansionLevel: 1,
  failOnFirst: true
});
```
