Service for managing UiPath Data Fabric Entities.

Entities are collections of records that can be used to store and manage data in the Data Fabric. [UiPath Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)

## Methods

### getAll()

```
getAll(): Promise<EntityGetResponse[]>;
```

Gets all entities in the system

#### Returns

`Promise`\<[`EntityGetResponse`](../../type-aliases/EntityGetResponse/)[]>

Promise resolving to either an array of entities NonPaginatedResponse or a PaginatedResponse when pagination options are used. [EntityGetResponse](../../type-aliases/EntityGetResponse/)

#### Example

```
// Get all entities
const entities = await sdk.entities.getAll();

// Iterate through entities
entities.forEach(entity => {
  console.log(`Entity: ${entity.displayName} (${entity.name})`);
  console.log(`Type: ${entity.entityType}`);
});

// Find a specific entity by name
const customerEntity = entities.find(e => e.name === 'Customer');

// Use entity methods directly
if (customerEntity) {
  const records = await customerEntity.getRecords();
  console.log(`Customer records: ${records.items.length}`);

  const insertResult = await customerEntity.insert([
    { name: "John", age: 30 }
  ]);
}
```

______________________________________________________________________

### getById()

```
getById(id: string): Promise<EntityGetResponse>;
```

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
// Get entity metadata with methods
const entity = await sdk.entities.getById(<entityId>);

// Call operations directly on the entity
const records = await entity.getRecords();

const insertResult = await entity.insert([
  { name: "John", age: 30 }
]);
```

______________________________________________________________________

### getRecordsById()

```
getRecordsById<T>(entityId: string, options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityRecord> : NonPaginatedResponse<EntityRecord>>;
```

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
const records = await sdk.entities.getRecordsById(<entityId>);

// With expansion level
const records = await sdk.entities.getRecordsById(<entityId>, {
  expansionLevel: 1
});

// With pagination
const paginatedResponse = await sdk.entities.getRecordsById(<entityId>, {
  pageSize: 50,
  expansionLevel: 1
});

// Navigate to next page
const nextPage = await sdk.entities.getRecordsById(<entityId>, {
  cursor: paginatedResponse.nextCursor,
  expansionLevel: 1
});
```

______________________________________________________________________

### insertById()

```
insertById(
   id: string, 
   data: Record<string, any>[], 
   options?: EntityOperationOptions): Promise<EntityOperationResponse>;
```

Inserts data into an entity by entity ID

#### Parameters

| Parameter  | Type                                                   | Description                |
| ---------- | ------------------------------------------------------ | -------------------------- |
| `id`       | `string`                                               | UUID of the entity         |
| `data`     | `Record`\<`string`, `any`>[]                           | Array of records to insert |
| `options?` | [`EntityOperationOptions`](../EntityOperationOptions/) | Insert options             |

#### Returns

`Promise`\<[`EntityOperationResponse`](../EntityOperationResponse/)>

Promise resolving to insert response [EntityInsertResponse](../../type-aliases/EntityInsertResponse/)

#### Example

```
// Basic usage
const result = await sdk.entities.insertById(<entityId>, [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
]);

// With options
const result = await sdk.entities.insertById(<entityId>, [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
], {
  expansionLevel: 1,
  failOnFirst: true
});
```

______________________________________________________________________

### updateById()

```
updateById(
   id: string, 
   data: EntityRecord[], 
   options?: EntityOperationOptions): Promise<EntityOperationResponse>;
```

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
const result = await sdk.entities.updateById(<entityId>, [
  { Id: "123", name: "John Updated", age: 31 },
  { Id: "456", name: "Jane Updated", age: 26 }
]);

// With options
const result = await sdk.entities.updateById(<entityId>, [
  { Id: "123", name: "John Updated", age: 31 },
  { Id: "456", name: "Jane Updated", age: 26 }
], {
  expansionLevel: 1,
  failOnFirst: true
});
```

______________________________________________________________________

### deleteById()

```
deleteById(
   id: string, 
   recordIds: string[], 
   options?: EntityDeleteOptions): Promise<EntityOperationResponse>;
```

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
const result = await sdk.entities.deleteById(<entityId>, [
  <recordId-1>, <recordId-2>
]);
```

______________________________________________________________________

### downloadAttachment()

```
downloadAttachment(options: EntityDownloadAttachmentOptions): Promise<Blob>;
```

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
// First, get records to obtain the record ID
const records = await sdk.entities.getRecordsById(<entityId>);
// Get the recordId for the record that contains the attachment
const recordId = records.items[0].id;

// Download attachment using SDK method
const response = await sdk.entities.downloadAttachment({
  entityName: 'Invoice',
  recordId: recordId,
  fieldName: 'Documents'
});

// Or download using entity method
const entity = await sdk.entities.getById(<entityId>);
const response = await entity.downloadAttachment(recordId, 'Documents');

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
