Service for managing UiPath storage Buckets.

Buckets are cloud storage containers that can be used to store and manage files used by automation processes. [UiPath Buckets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-storage-buckets)

### Usage

```
import { Buckets } from '@uipath/uipath-typescript/buckets';

const buckets = new Buckets(sdk);
const allBuckets = await buckets.getAll();
```

## Methods

### deleteFile()

> **deleteFile**(`bucketId`: `number`, `path`: `string`, `options?`: `BucketDeleteFileOptions`): `Promise`\<`void`>

Deletes a file from a bucket

#### Parameters

- `bucketId`: `number` — The ID of the bucket
- `path`: `string` — The full path to the file to delete
- `options?`: `BucketDeleteFileOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`void`>

Promise resolving when the file is deleted

#### Example

```
// Delete a file from a bucket
await buckets.deleteFile(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BucketGetResponse`> : `NonPaginatedResponse`\<`BucketGetResponse`>>

Gets all buckets across folders with optional filtering

The method returns either:

- A NonPaginatedResponse with data and totalCount (when no pagination parameters are provided)
- A paginated result with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `BucketGetAllOptions` = `BucketGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BucketGetResponse`> : `NonPaginatedResponse`\<`BucketGetResponse`>>

Promise resolving to either an array of buckets NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BucketGetResponse](../BucketGetResponse/)

#### Example

```
// Get all buckets across folders
const allBuckets = await buckets.getAll();

// Get buckets within a specific folder
const folderBuckets = await buckets.getAll({
  folderId: <folderId>
});

// Get buckets with filtering
const filteredBuckets = await buckets.getAll({
  filter: "name eq 'MyBucket'"
});

// First page with pagination
const page1 = await buckets.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await buckets.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await buckets.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

### getById()

> **getById**(`bucketId`: `number`, `folderId`: `number`, `options?`: `BucketGetByIdOptions`): `Promise`\<`BucketGetResponse`>

Gets a single bucket by ID

#### Parameters

- `bucketId`: `number` — Bucket ID
- `folderId`: `number` — Required folder ID
- `options?`: `BucketGetByIdOptions` — Optional query parameters

#### Returns

`Promise`\<`BucketGetResponse`>

Promise resolving to a bucket definition [BucketGetResponse](../BucketGetResponse/)

#### Example

```
// Get bucket by ID
const bucket = await buckets.getById(<bucketId>, <folderId>);
```

### getByName()

> **getByName**(`name`: `string`, `options?`: `BucketGetByNameOptions`): `Promise`\<`BucketGetResponse`>

Retrieves a single orchestrator storage bucket by name.

#### Parameters

- `name`: `string` — Bucket name to search for
- `options?`: `BucketGetByNameOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)

#### Returns

`Promise`\<`BucketGetResponse`>

Promise resolving to a single bucket [BucketGetResponse](../BucketGetResponse/)

#### Example

```
// By folder ID
await buckets.getByName('MyBucket', { folderId: <folderId> });

// By folder key (GUID)
await buckets.getByName('MyBucket', { folderKey: '<folderKey>' });

// By folder path
await buckets.getByName('MyBucket', { folderPath: '<folderPath>' });
```

### getFileMetaData()

#### Call Signature

> **getFileMetaData**\<`T`>(`bucketId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Gets metadata for files in a bucket with optional filtering and pagination.

Folder context can be supplied as `folderId`, `folderKey`, or `folderPath` inside the options.

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

##### Type Parameters

| Type Parameter                                             | Default type                                 |
| ---------------------------------------------------------- | -------------------------------------------- |
| `T` *extends* `BucketGetFileMetaDataWithPaginationOptions` | `BucketGetFileMetaDataWithPaginationOptions` |

##### Parameters

| Parameter  | Type     | Description                                                                                                   |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `bucketId` | `number` | The ID of the bucket to get file metadata from                                                                |
| `options?` | `T`      | Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for filtering and pagination |

##### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Promise resolving to either an array of files metadata NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BlobItem](../BlobItem/)

##### Example

```
// By folder ID
const fileMetadata = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId> });

// By folder key (GUID)
await buckets.getFileMetaData(<bucketId>, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await buckets.getFileMetaData(<bucketId>, { folderPath: 'Shared/Finance' });

// Filter by prefix
await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, prefix: '/folder1' });

// First page with pagination
const page1 = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await buckets.getFileMetaData(<bucketId>, { folderId: <folderId>, cursor: page1.nextCursor });
}
```

#### Call Signature

> **getFileMetaData**\<`T`>(`bucketId`: `number`, `folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Gets metadata for files in a bucket — positional `folderId` form.

##### Type Parameters

| Type Parameter                                             | Default type                                 |
| ---------------------------------------------------------- | -------------------------------------------- |
| `T` *extends* `BucketGetFileMetaDataWithPaginationOptions` | `BucketGetFileMetaDataWithPaginationOptions` |

##### Parameters

| Parameter  | Type     | Description                                      |
| ---------- | -------- | ------------------------------------------------ |
| `bucketId` | `number` | The ID of the bucket to get file metadata from   |
| `folderId` | `number` | Required folder ID (numeric)                     |
| `options?` | `T`      | Optional parameters for filtering and pagination |

##### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Promise resolving to either an array of files metadata NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BlobItem](../BlobItem/)

##### Deprecated

Use the options-object form: `getFileMetaData(bucketId, { folderId })`. See [BucketGetFileMetaDataWithPaginationOptions](../../type-aliases/BucketGetFileMetaDataWithPaginationOptions/) for the supported options.

### getFiles()

> **getFiles**\<`T`>(`bucketId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BucketFile`> : `NonPaginatedResponse`\<`BucketFile`>>

Lists all files in a bucket.

Returns a flat, recursive listing of all files in the bucket. Supports regex filtering and filter / orderby / select / expand. [BucketFile](../BucketFile/) entries include `isDirectory` so callers can distinguish folders from files.

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `BucketGetFilesOptions` = `BucketGetFilesOptions`

#### Parameters

- `bucketId`: `number` — The ID of the bucket
- `options?`: `T` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional parameters for regex filtering, query options, and pagination [BucketGetFilesOptions](../../type-aliases/BucketGetFilesOptions/)

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BucketFile`> : `NonPaginatedResponse`\<`BucketFile`>>

Promise resolving to either an array of files NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BucketFile](../BucketFile/)

#### Example

```
// List all files in the bucket
const files = await buckets.getFiles(<bucketId>, { folderId: <folderId> });

// Filter by regex pattern
const pdfs = await buckets.getFiles(<bucketId>, {
  folderId: <folderId>,
  fileNameRegex: '.*\\.pdf$'
});

// First page with pagination
const page1 = await buckets.getFiles(<bucketId>, { folderId: <folderId>, pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await buckets.getFiles(<bucketId>, { folderId: <folderId>, cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await buckets.getFiles(<bucketId>, {
  folderId: <folderId>,
  jumpToPage: 5,
  pageSize: 10
});
```

### getReadUri()

#### Call Signature

> **getReadUri**(`bucketId`: `number`, `path`: `string`, `options?`: `BucketGetReadUriRequestOptions`): `Promise`\<`BucketGetUriResponse`>

Gets a direct download URL for a file in the bucket.

Folder context can be supplied as `folderId`, `folderKey`, or `folderPath` in the options.

##### Parameters

| Parameter  | Type                             | Description                                                                             |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `bucketId` | `number`                         | The ID of the bucket                                                                    |
| `path`     | `string`                         | The full path to the file                                                               |
| `options?` | `BucketGetReadUriRequestOptions` | Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional `expiryInMinutes` |

##### Returns

`Promise`\<`BucketGetUriResponse`>

Promise resolving to blob file access information [BucketGetUriResponse](../BucketGetUriResponse/)

##### Example

```
// By folder ID
await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderId: <folderId> });

// By folder key (GUID)
await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await buckets.getReadUri(<bucketId>, '/folder/file.pdf', { folderPath: 'Shared/Finance' });
```

#### Call Signature

> **getReadUri**(`options`: `BucketGetReadUriOptions`): `Promise`\<`BucketGetUriResponse`>

Gets a direct download URL for a file in the bucket — options-only form.

##### Parameters

| Parameter | Type                      | Description                                                                                                     |
| --------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `options` | `BucketGetReadUriOptions` | Contains bucketId, folder scoping (`folderId` / `folderKey` / `folderPath`), file path and optional expiry time |

##### Returns

`Promise`\<`BucketGetUriResponse`>

Promise resolving to blob file access information [BucketGetUriResponse](../BucketGetUriResponse/)

##### Deprecated

Use the positional form: `getReadUri(bucketId, path, options?)`. See [BucketGetReadUriRequestOptions](../BucketGetReadUriRequestOptions/) for the supported options.

### uploadFile()

#### Call Signature

> **uploadFile**(`bucketId`: `number`, `path`: `string`, `content`: `Uint8Array`\<`ArrayBuffer`> | `Blob` | `File`, `options?`: `BucketUploadFileRequestOptions`): `Promise`\<`BucketUploadResponse`>

Uploads a file to a bucket.

Folder context can be supplied as `folderId`, `folderKey`, or `folderPath` in the options.

##### Parameters

| Parameter  | Type                             | Description                                              |
| ---------- | -------------------------------- | -------------------------------------------------------- |
| `bucketId` | `number`                         | The ID of the bucket to upload to                        |
| `path`     | `string`                         | Path where the file should be stored in the bucket       |
| `content`  | `Uint8Array`\<`ArrayBuffer`>     | `Blob`                                                   |
| `options?` | `BucketUploadFileRequestOptions` | Folder scoping (`folderId` / `folderKey` / `folderPath`) |

##### Returns

`Promise`\<`BucketUploadResponse`>

Promise resolving bucket upload response [BucketUploadResponse](../BucketUploadResponse/)

##### Example

```
// By folder ID
const file = new File(['file content'], 'example.txt');
await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderId: <folderId> });

// By folder key (GUID)
await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await buckets.uploadFile(<bucketId>, '/folder/example.txt', file, { folderPath: 'Shared/Finance' });

// In Node env with Uint8Array or Buffer
const content = new TextEncoder().encode('file content');
await buckets.uploadFile(<bucketId>, '/folder/example.txt', content, { folderId: <folderId> });
```

#### Call Signature

> **uploadFile**(`options`: `BucketUploadFileOptions`): `Promise`\<`BucketUploadResponse`>

Uploads a file to a bucket — options-only form.

##### Parameters

| Parameter | Type                      | Description                                                                                                              |
| --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `options` | `BucketUploadFileOptions` | Options for file upload including bucket ID, folder scoping (`folderId` / `folderKey` / `folderPath`), path, and content |

##### Returns

`Promise`\<`BucketUploadResponse`>

Promise resolving bucket upload response [BucketUploadResponse](../BucketUploadResponse/)

##### Deprecated

Use the positional form: `uploadFile(bucketId, path, content, options?)`. See [BucketUploadFileRequestOptions](../BucketUploadFileRequestOptions/) for the supported options.
