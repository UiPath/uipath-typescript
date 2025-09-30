Service for managing UiPath storage Buckets.

Buckets are cloud storage containers that can be used to store and manage files used by automation processes. [UiPath Buckets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-storage-buckets)

## Methods

### getAll()

```
getAll<T>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<BucketGetResponse> : NonPaginatedResponse<BucketGetResponse>>;
```

Gets all buckets across folders with optional filtering

The method returns either:

- A NonPaginatedResponse with data and totalCount (when no pagination parameters are provided)
- A paginated result with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

| Type Parameter                                                                 | Default type                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `T` *extends* [`BucketGetAllOptions`](../../type-aliases/BucketGetAllOptions/) | [`BucketGetAllOptions`](../../type-aliases/BucketGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`BucketGetResponse`](../BucketGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`BucketGetResponse`](../BucketGetResponse/)>>

Promise resolving to either an array of buckets NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BucketGetResponse](../BucketGetResponse/)

#### Example

```
// Get all buckets across folders
const buckets = await sdk.buckets.getAll();

// Get buckets within a specific folder
const buckets = await sdk.buckets.getAll({ 
  folderId: <folderId>
});

// Get buckets with filtering
const buckets = await sdk.buckets.getAll({ 
  filter: "name eq 'MyBucket'"
});

// First page with pagination
const page1 = await sdk.buckets.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await sdk.buckets.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await sdk.buckets.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

______________________________________________________________________

### getById()

```
getById(
   bucketId: number, 
   folderId: number, 
   options?: BaseOptions): Promise<BucketGetResponse>;
```

Gets a single bucket by ID

#### Parameters

| Parameter  | Type                             | Description               |
| ---------- | -------------------------------- | ------------------------- |
| `bucketId` | `number`                         | Bucket ID                 |
| `folderId` | `number`                         | Required folder ID        |
| `options?` | [`BaseOptions`](../BaseOptions/) | Optional query parameters |

#### Returns

`Promise`\<[`BucketGetResponse`](../BucketGetResponse/)>

Promise resolving to a bucket definition [BucketGetResponse](../BucketGetResponse/)

#### Example

```
// Get bucket by ID
const bucket = await sdk.buckets.getById(<bucketId>, <folderId>);
```

______________________________________________________________________

### getFileMetaData()

```
getFileMetaData<T>(
   bucketId: number, 
   folderId: number, 
   options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<BlobItem> : NonPaginatedResponse<BlobItem>>;
```

Gets metadata for files in a bucket with optional filtering and pagination

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

| Type Parameter                                                                                                               | Default type                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `T` *extends* [`BucketGetFileMetaDataWithPaginationOptions`](../../type-aliases/BucketGetFileMetaDataWithPaginationOptions/) | [`BucketGetFileMetaDataWithPaginationOptions`](../../type-aliases/BucketGetFileMetaDataWithPaginationOptions/) |

#### Parameters

| Parameter  | Type     | Description                                                             |
| ---------- | -------- | ----------------------------------------------------------------------- |
| `bucketId` | `number` | The ID of the bucket to get file metadata from                          |
| `folderId` | `number` | Required folder ID for organization unit context                        |
| `options?` | `T`      | Optional parameters for filtering, pagination and access URL generation |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`BlobItem`](../BlobItem/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`BlobItem`](../BlobItem/)>>

Promise resolving to either an array of files metadata NonPaginatedResponse or a PaginatedResponse when pagination options are used. [BlobItem](../BlobItem/)

#### Example

```
// Get metadata for all files in a bucket
const fileMetadata = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>);

// Get file metadata with a specific prefix
const fileMetadata = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, {
  prefix: '/folder1'
});

// First page with pagination
const page1 = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, { pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await sdk.buckets.getFileMetaData(<bucketId>, <folderId>, { cursor: page1.nextCursor });
}
```

______________________________________________________________________

### getReadUri()

```
getReadUri(options: BucketGetUriOptions): Promise<BucketGetUriResponse>;
```

Gets a direct download URL for a file in the bucket

#### Parameters

| Parameter | Type                                             | Description                                                     |
| --------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `options` | [`BucketGetUriOptions`](../BucketGetUriOptions/) | Contains bucketId, folderId, file path and optional expiry time |

#### Returns

`Promise`\<[`BucketGetUriResponse`](../BucketGetUriResponse/)>

Promise resolving to blob file access information [BucketGetUriResponse](../BucketGetUriResponse/)

#### Example

```
// Get download URL for a file
const fileAccess = await sdk.buckets.getReadUri({
  bucketId: <bucketId>, 
  folderId: <folderId>,
  path: '/folder/file.pdf'
});
```

______________________________________________________________________

### uploadFile()

```
uploadFile(options: BucketUploadFileOptions): Promise<BucketUploadResponse>;
```

Uploads a file to a bucket

#### Parameters

| Parameter | Type                                                     | Description                                                                                    |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `options` | [`BucketUploadFileOptions`](../BucketUploadFileOptions/) | Options for file upload including bucket ID, folder ID, path, content, and optional parameters |

#### Returns

`Promise`\<[`BucketUploadResponse`](../BucketUploadResponse/)>

Promise resolving bucket upload response [BucketUploadResponse](../BucketUploadResponse/)

#### Example

```
// Upload a file from browser
const file = new File(['file content'], 'example.txt');
const result = await sdk.buckets.uploadFile({
  bucketId: <bucketId>,
  folderId: <folderId>, 
  path: '/folder/example.txt',
  content: file
});

// In Node env with explicit content type
const buffer = Buffer.from('file content');
const result = await sdk.buckets.uploadFile({
  bucketId: <bucketId>,
  folderId: <folderId>,
  path: '/folder/example.txt',
  content: buffer,
  contentType: 'text/plain'
});
```
