Service for managing UiPath storage Buckets.

Buckets are cloud storage containers that can be used to store and manage files used by automation processes. [UiPath Buckets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-storage-buckets)

### Usage

```
import { Buckets } from '@uipath/uipath-typescript/buckets';

const buckets = new Buckets(sdk);
const allBuckets = await buckets.getAll();
```

## Methods

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

### getFileMetaData()

> **getFileMetaData**\<`T`>(`bucketId`: `number`, `folderId`: `number`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Gets metadata for files in a bucket with optional filtering and pagination

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `BucketGetFileMetaDataWithPaginationOptions` = `BucketGetFileMetaDataWithPaginationOptions`

#### Parameters

- `bucketId`: `number` — The ID of the bucket to get file metadata from
- `folderId`: `number` — Required folder ID for organization unit context
- `options?`: `T` — Optional parameters for filtering, pagination and access URL generation

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BlobItem`> : `NonPaginatedResponse`\<`BlobItem`>>

Promise resolving to either an array of files metadata NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BlobItem](../BlobItem/)

#### Example

```
// Get metadata for all files in a bucket
const fileMetadata = await buckets.getFileMetaData(<bucketId>, <folderId>);

// Get file metadata with a specific prefix
const prefixMetadata = await buckets.getFileMetaData(<bucketId>, <folderId>, {
  prefix: '/folder1'
});

// First page with pagination
const page1 = await buckets.getFileMetaData(<bucketId>, <folderId>, { pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await buckets.getFileMetaData(<bucketId>, <folderId>, { cursor: page1.nextCursor });
}
```

### getReadUri()

> **getReadUri**(`options`: `BucketGetReadUriOptions`): `Promise`\<`BucketGetUriResponse`>

Gets a direct download URL for a file in the bucket

#### Parameters

- `options`: `BucketGetReadUriOptions` — Contains bucketId, folderId, file path and optional expiry time

#### Returns

`Promise`\<`BucketGetUriResponse`>

Promise resolving to blob file access information [BucketGetUriResponse](../BucketGetUriResponse/)

#### Example

```
// Get download URL for a file
const fileAccess = await buckets.getReadUri({
  bucketId: <bucketId>,
  folderId: <folderId>,
  path: '/folder/file.pdf'
});
```

### uploadFile()

> **uploadFile**(`options`: `BucketUploadFileOptions`): `Promise`\<`BucketUploadResponse`>

Uploads a file to a bucket

#### Parameters

- `options`: `BucketUploadFileOptions` — Options for file upload including bucket ID, folder ID, path, content, and optional parameters

#### Returns

`Promise`\<`BucketUploadResponse`>

Promise resolving bucket upload response [BucketUploadResponse](../BucketUploadResponse/)

#### Example

```
// Upload a file from browser
const file = new File(['file content'], 'example.txt');
const result = await buckets.uploadFile({
  bucketId: <bucketId>,
  folderId: <folderId>,
  path: '/folder/example.txt',
  content: file
});

// In Node env with Uint8Array or Buffer
const content = new TextEncoder().encode('file content');
const result = await buckets.uploadFile({
  bucketId: <bucketId>,
  folderId: <folderId>,
  path: '/folder/example.txt',
  content,
});
```
