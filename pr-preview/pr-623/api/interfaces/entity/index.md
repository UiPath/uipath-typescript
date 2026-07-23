Service for managing UiPath Data Fabric Entities.

Entities are collections of records that can be used to store and manage data in the Data Fabric. [UiPath Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)

### Usage

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);
const allEntities = await entities.getAll();
```

## Methods

### deleteAttachment()

> **deleteAttachment**(`entityId`: `string`, `recordId`: `string`, `fieldName`: `string`, `options?`: `EntityDeleteAttachmentOptions`): `Promise`\<`EntityDeleteAttachmentResponse`>

Removes an attachment from a File-type field of an entity record.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record containing the attachment
- `fieldName`: `string` — Name of the File-type field containing the attachment
- `options?`: `EntityDeleteAttachmentOptions` — Optional [EntityDeleteAttachmentOptions](../EntityDeleteAttachmentOptions/) (e.g. `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityDeleteAttachmentResponse`>

Promise resolving to [EntityDeleteAttachmentResponse](../../type-aliases/EntityDeleteAttachmentResponse/)

#### Example

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);

// Get the entityId from getAll()
const allEntities = await entities.getAll();
const entityId = allEntities[0].id;

// Get the recordId from getAllRecords()
const records = await entities.getAllRecords(entityId);
const recordId = records[0].Id;

// Delete attachment for a specific record and field
await entities.deleteAttachment(entityId, recordId, 'Documents');

// Or delete using entity method (entityId is already known)
const entity = await entities.getById(entityId);
await entity.deleteAttachment(recordId, 'Documents');
```

### deleteRecordById()

> **deleteRecordById**(`entityId`: `string`, `recordId`: `string`, `options?`: `EntityDeleteRecordByIdOptions`): `Promise`\<`void`>

Deletes a single record from an entity by entity ID and record ID

Note: Data Fabric supports trigger events only on individual deletes, not on deleting multiple records. Use this method if you need trigger events to fire for the deleted record.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record to delete
- `options?`: `EntityDeleteRecordByIdOptions` — Optional [EntityDeleteRecordByIdOptions](../EntityDeleteRecordByIdOptions/) (e.g. `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`void`>

Promise resolving to void on success

#### Example

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);

await entities.deleteRecordById("<entityId>", "<recordId>");

// Folder-scoped: pass the entity's folder key
await entities.deleteRecordById("<entityId>", "<recordId>", { folderKey: "<folderKey>" });
```

### deleteRecordsById()

> **deleteRecordsById**(`id`: `string`, `recordIds`: `string`[], `options?`: `EntityDeleteRecordsOptions`): `Promise`\<`EntityDeleteResponse`>

Deletes data from an entity by entity ID

Note: Records deleted using deleteRecordsById will not trigger Data Fabric trigger events. Use [deleteRecordById](#deleterecordbyid) if you need trigger events to fire for the deleted record.

#### Parameters

- `id`: `string` — UUID of the entity
- `recordIds`: `string`[] — Array of record UUIDs to delete
- `options?`: `EntityDeleteRecordsOptions` — Delete options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityDeleteResponse`>

Promise resolving to delete response [EntityDeleteResponse](../EntityDeleteResponse/)

#### Example

```
// Basic usage
const result = await entities.deleteRecordsById(<entityId>, [
  <recordId-1>, <recordId-2>
]);

// Folder-scoped entity: pass the entity's folder key
await entities.deleteRecordsById(<entityId>, [
  <recordId-1>, <recordId-2>
], { folderKey: "<folderKey>" });
```

### downloadAttachment()

> **downloadAttachment**(`entityId`: `string`, `recordId`: `string`, `fieldName`: `string`, `options?`: `EntityDownloadAttachmentOptions`): `Promise`\<`Blob`>

Downloads an attachment stored in a File-type field of an entity record.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record containing the attachment
- `fieldName`: `string` — Name of the File-type field containing the attachment
- `options?`: `EntityDownloadAttachmentOptions` — Optional [EntityDownloadAttachmentOptions](../EntityDownloadAttachmentOptions/) (e.g. `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

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
const recordId = records.items[0].Id;

// Get the entityId from getAll()
const allEntities = await entities.getAll();
const entityId = allEntities[0].id;

// Get the recordId from getAllRecords()
const records = await entities.getAllRecords(entityId);
const recordId = records[0].Id;

// Download attachment using service method
const response = await entities.downloadAttachment(entityId, recordId, 'Documents');

// Or download using entity method (entityId is already known)
const entity = await entities.getById(entityId);
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

### getAll()

> **getAll**(`options?`: `EntityGetAllOptions`): `Promise`\<`EntityGetResponse`[]>

Gets entities in the tenant.

Three call modes:

- `getAll()` — default. Returns only tenant-level entities.
- `getAll({ folderKey: "<uuid>" })` — preferred for folder-scoped data. Returns only entities in that folder.
- `getAll({ includeFolderEntities: true })` — returns tenant-level **and** folder-level entities together. `folderKey` is preferred over `includeFolderEntities` when both are set.

#### Parameters

- `options?`: `EntityGetAllOptions` — Optional [EntityGetAllOptions](../EntityGetAllOptions/) (`folderKey` to list a single folder's entities — preferred when scoping to a folder; `includeFolderEntities: true` to list tenant + folder entities together) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityGetResponse`[]>

Promise resolving to an array of entity metadata [EntityGetResponse](../../type-aliases/EntityGetResponse/)

#### Example

```
// Tenant-only (default)
const tenantEntities = await entities.getAll();

// A single folder's entities (preferred when targeting a specific folder)
const folderEntities = await entities.getAll({ folderKey: "<folderKey>" });

// Tenant + folder entities together
const allEntities = await entities.getAll({ includeFolderEntities: true });

// Iterate through entities
tenantEntities.forEach(entity => {
  console.log(`Entity: ${entity.displayName} (${entity.name})`);
  console.log(`Type: ${entity.entityType}`);
});

// Find a specific entity by name
const customerEntity = tenantEntities.find(e => e.name === 'Customer');

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

### getAllRecords()

> **getAllRecords**\<`T`>(`entityId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`EntityRecord`> : `NonPaginatedResponse`\<`EntityRecord`>>

Gets entity records by entity ID

`MULTILINE_MAX` fields are returned as a size marker (e.g. `"HasValue=true Length=512"`) instead of the full content — use [getRecordById](#getrecordbyid) to retrieve the full value.

#### Type Parameters

- `T` *extends* `EntityGetRecordsByIdOptions` = `EntityGetRecordsByIdOptions`

#### Parameters

- `entityId`: `string` — UUID of the entity
- `options?`: `T` — Query options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`EntityRecord`> : `NonPaginatedResponse`\<`EntityRecord`>>

Promise resolving to either an array of entity records NonPaginatedResponse or a PaginatedResponse when pagination options are used. [EntityRecord](../EntityRecord/)

#### Example

```
// Basic usage (non-paginated)
const records = await entities.getAllRecords("<entityId>");

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

// Folder-scoped entity: pass the entity's folder key
const records = await entities.getAllRecords("<entityId>", { folderKey: "<folderKey>" });
```

### getById()

> **getById**(`id`: `string`, `options?`: `EntityGetByIdOptions`): `Promise`\<`EntityGetResponse`>

Gets entity metadata by entity ID with attached operation methods

#### Parameters

- `id`: `string` — UUID of the entity
- `options?`: `EntityGetByIdOptions` — Optional [EntityGetByIdOptions](../EntityGetByIdOptions/) (e.g. `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityGetResponse`>

Promise resolving to entity metadata with operation methods [EntityGetResponse](../../type-aliases/EntityGetResponse/)

#### Example

```
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);
const choicesets = new ChoiceSets(sdk);

// Get entity metadata with methods
const entity = await entities.getById("<entityId>");

// Folder-scoped: pass the entity's folder key
const folderEntity = await entities.getById("<entityId>", { folderKey: "<folderKey>" });

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

### getRecordById()

> **getRecordById**(`entityId`: `string`, `recordId`: `string`, `options?`: `EntityGetRecordByIdOptions`): `Promise`\<`EntityRecord`>

Gets a single entity record by entity ID and record ID

Returns the full record, including the complete content of `MULTILINE_MAX` fields.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record
- `options?`: `EntityGetRecordByIdOptions` — Query options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityRecord`>

Promise resolving to a single entity record [EntityRecord](../EntityRecord/)

#### Example

```
// First, get records to obtain the record ID
const records = await entities.getAllRecords("<entityId>");
// Get the recordId for the record
const recordId = records.items[0].Id;
// Get the record
const record = await entities.getRecordById(<entityId>, recordId);

// With expansion level
const record = await entities.getRecordById(<entityId>, recordId, {
  expansionLevel: 1
});

// Folder-scoped entity: pass the entity's folder key
const record = await entities.getRecordById(<entityId>, recordId, {
  folderKey: "<folderKey>"
});
```

### importRecordsById()

> **importRecordsById**(`id`: `string`, `file`: `EntityFileType`, `options?`: `EntityImportRecordsByIdOptions`): `Promise`\<`EntityImportRecordsResponse`>

Imports records from a CSV file into an entity

#### Parameters

- `id`: `string` — UUID of the entity
- `file`: `EntityFileType` — CSV file to import as a Blob or File or Uint8Array
- `options?`: `EntityImportRecordsByIdOptions` — Optional [EntityImportRecordsByIdOptions](../EntityImportRecordsByIdOptions/) (e.g. `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityImportRecordsResponse`>

Promise resolving to [EntityImportRecordsResponse](../EntityImportRecordsResponse/) with record counts

#### Example

```
// Browser: upload from file input
const fileInput = document.getElementById('csv-input') as HTMLInputElement;
const result = await entities.importRecordsById(<id>, fileInput.files[0]);
console.log(`Inserted ${result.insertedRecords} of ${result.totalRecords} records`);

// Folder-scoped entity: pass the entity's folder key
await entities.importRecordsById(<id>, fileInput.files[0], { folderKey: "<folderKey>" });
```

### insertRecordById()

> **insertRecordById**(`id`: `string`, `data`: `Record`\<`string`, `any`>, `options?`: `EntityInsertRecordOptions`): `Promise`\<`EntityInsertResponse`>

Inserts a single record into an entity by entity ID

Note: Data Fabric supports trigger events only on individual inserts, not on inserting multiple records. Use this method if you need trigger events to fire for the inserted record.

#### Parameters

- `id`: `string` — UUID of the entity
- `data`: `Record`\<`string`, `any`> — Record to insert
- `options?`: `EntityInsertRecordOptions` — Insert options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityInsertResponse`>

Promise resolving to the inserted record with generated record ID [EntityInsertResponse](../EntityInsertResponse/)

#### Example

```
// Basic usage
const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 });

// With options
const result = await entities.insertRecordById(<entityId>, { name: "John", age: 30 }, {
  expansionLevel: 1
});

// Folder-scoped entity: pass the entity's folder key
await entities.insertRecordById(<entityId>, { name: "John", age: 30 }, {
  folderKey: "<folderKey>"
});
```

### insertRecordsById()

> **insertRecordsById**(`id`: `string`, `data`: `Record`\<`string`, `any`>[], `options?`: `EntityInsertRecordsOptions`): `Promise`\<`EntityBatchInsertResponse`>

Inserts one or more records into an entity by entity ID

Note: Records inserted using insertRecordsById will not trigger Data Fabric trigger events. Use [insertRecordById](#insertrecordbyid) if you need trigger events to fire for each inserted record.

#### Parameters

- `id`: `string` — UUID of the entity
- `data`: `Record`\<`string`, `any`>[] — Array of records to insert
- `options?`: `EntityInsertRecordsOptions` — Insert options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityBatchInsertResponse`>

Promise resolving to insert response [EntityBatchInsertResponse](../EntityBatchInsertResponse/)

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

// Folder-scoped entity: pass the entity's folder key
await entities.insertRecordsById(<entityId>, [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
], { folderKey: "<folderKey>" });
```

### queryRecordsById()

> **queryRecordsById**\<`T`>(`id`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`EntityRecord`> : `NonPaginatedResponse`\<`EntityRecord`>>

Queries entity records with filters, sorting, aggregates, and SDK-managed pagination

`MULTILINE_MAX` fields are returned as a size marker (e.g. `"HasValue=true Length=512"`) instead of the full content — use [getRecordById](#getrecordbyid) to retrieve the full value.

Cross-entity joins are supported via the `joins` option — see [EntityJoin](../EntityJoin/) for constraints and the result-row key format.

#### Type Parameters

- `T` *extends* `EntityQueryRecordsOptions` = `EntityQueryRecordsOptions`

#### Parameters

- `id`: `string` — UUID of the entity
- `options?`: `T` — Query options including filterGroup, selectedFields, sortOptions, aggregates, groupBy, joins, and pagination The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`EntityRecord`> : `NonPaginatedResponse`\<`EntityRecord`>>

Promise resolving to [NonPaginatedResponse](../NonPaginatedResponse/) without pagination options, or [PaginatedResponse](../PaginatedResponse/) when `pageSize`, `cursor`, or `jumpToPage` are provided

#### Example

```
import { Entities, LogicalOperator, QueryFilterOperator, EntityAggregateFunction, JoinType } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);

// Non-paginated query with a filter
const result = await entities.queryRecordsById(<id>, {
  filterGroup: {
    logicalOperator: LogicalOperator.And,
    queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }]
  },
  sortOptions: [{ fieldName: "createdTime", isDescending: true }],
});
console.log(`Found ${result.totalCount} records`);

// With pagination
const page1 = await entities.queryRecordsById(<id>, { pageSize: 25 });
if (page1.hasNextPage) {
  const page2 = await entities.queryRecordsById(<id>, { cursor: page1.nextCursor });
}

// Aggregate: count of records per status
await entities.queryRecordsById(<id>, {
  selectedFields: ["status"],
  groupBy: ["status"],
  aggregates: [
    { function: EntityAggregateFunction.Count, field: "Id", alias: "total" },
  ],
});

// Folder-scoped entity: pass the entity's folder key
await entities.queryRecordsById(<id>, {
  filterGroup: { queryFilters: [{ fieldName: "status", operator: QueryFilterOperator.Equals, value: "active" }] },
  folderKey: "<folderKey>",
});

// Aggregate: total sum and average across all records (no grouping)
await entities.queryRecordsById(<id>, {
  aggregates: [
    { function: EntityAggregateFunction.Sum, field: "amount", alias: "totalAmount" },
    { function: EntityAggregateFunction.Avg, field: "amount", alias: "avgAmount" },
  ],
});

// Multi-join: pull fields from related entities into the query
// (result rows use entity-qualified keys).
await entities.queryRecordsById(<id>, {
  selectedFields: ["Order.amount", "Customer.name", "Region.name"],
  joins: [
    {
      entityName: "Order",
      joinType: JoinType.LeftJoin,
      joinFieldName: "customerId",
      relatedEntityName: "Customer",
      relatedFieldName: "Id",
    },
    {
      entityName: "Customer",
      joinType: JoinType.LeftJoin,
      joinFieldName: "regionId",
      relatedEntityName: "Region",
      relatedFieldName: "Id",
    },
  ],
});
```

### updateRecordById()

> **updateRecordById**(`entityId`: `string`, `recordId`: `string`, `data`: `Record`\<`string`, `any`>, `options?`: `EntityUpdateRecordOptions`): `Promise`\<`EntityUpdateRecordResponse`>

Updates a single record in an entity by entity ID

Note: Data Fabric supports trigger events only on individual updates, not on updating multiple records. Use this method if you need trigger events to fire for the updated record.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record to update
- `data`: `Record`\<`string`, `any`> — Key-value pairs of fields to update
- `options?`: `EntityUpdateRecordOptions` — Update options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityUpdateRecordResponse`>

Promise resolving to the updated record [EntityUpdateRecordResponse](../EntityUpdateRecordResponse/)

#### Example

```
// Basic usage
const result = await entities.updateRecordById(<entityId>, <recordId>, { name: "John Updated", age: 31 });

// With options
const result = await entities.updateRecordById(<entityId>, <recordId>, { name: "John Updated", age: 31 }, {
  expansionLevel: 1
});

// Folder-scoped entity: pass the entity's folder key
await entities.updateRecordById(<entityId>, <recordId>, { name: "John Updated" }, {
  folderKey: "<folderKey>"
});
```

### updateRecordsById()

> **updateRecordsById**(`id`: `string`, `data`: `EntityRecord`[], `options?`: `EntityUpdateRecordsOptions`): `Promise`\<`EntityUpdateResponse`>

Updates data in an entity by entity ID

Note: Records updated using updateRecordsById will not trigger Data Fabric trigger events. Use [updateRecordById](#updaterecordbyid) if you need trigger events to fire for each updated record.

#### Parameters

- `id`: `string` — UUID of the entity
- `data`: `EntityRecord`[] — Array of records to update. Each record MUST contain the record id.
- `options?`: `EntityUpdateRecordsOptions` — Update options The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityUpdateResponse`>

Promise resolving to update response [EntityUpdateResponse](../EntityUpdateResponse/)

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

// Folder-scoped entity: pass the entity's folder key
await entities.updateRecordsById(<entityId>, [
  { Id: "123", name: "John Updated" }
], { folderKey: "<folderKey>" });
```

### uploadAttachment()

> **uploadAttachment**(`entityId`: `string`, `recordId`: `string`, `fieldName`: `string`, `file`: `EntityFileType`, `options?`: `EntityUploadAttachmentOptions`): `Promise`\<`EntityUploadAttachmentResponse`>

Uploads an attachment to a File-type field of an entity record.

Uses multipart/form-data to upload the file content to the specified field.

#### Parameters

- `entityId`: `string` — UUID of the entity
- `recordId`: `string` — UUID of the record to upload the attachment to
- `fieldName`: `string` — Name of the File-type field
- `file`: `EntityFileType` — File to upload (Blob, File, or Uint8Array)
- `options?`: `EntityUploadAttachmentOptions` — Optional [EntityUploadAttachmentOptions](../EntityUploadAttachmentOptions/) (e.g. `expansionLevel`, `folderKey` for folder-scoped entities) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`EntityUploadAttachmentResponse`>

Promise resolving to [EntityUploadAttachmentResponse](../../type-aliases/EntityUploadAttachmentResponse/)

#### Example

```
import { Entities } from '@uipath/uipath-typescript/entities';

const entities = new Entities(sdk);

// Get the entityId from getAll()
const allEntities = await entities.getAll();
const entityId = allEntities[0].id;

// Get the recordId from getAllRecords()
const records = await entities.getAllRecords(entityId);
const recordId = records[0].Id;

// Browser: Upload a file from an input element
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];
const response = await entities.uploadAttachment(entityId, recordId, 'Documents', file);

// Folder-scoped entity: pass the entity's folder key
await entities.uploadAttachment(entityId, recordId, 'Documents', file, { folderKey: "<folderKey>" });

// Node.js: Upload a file from disk
const fileBuffer = fs.readFileSync('document.pdf');
const blob = new Blob([fileBuffer], { type: 'application/pdf' });
const response = await entities.uploadAttachment(entityId, recordId, 'Documents', blob);
```
