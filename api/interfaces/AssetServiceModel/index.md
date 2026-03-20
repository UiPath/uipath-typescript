Service for managing UiPath Assets.

Assets are key-value pairs that can be used to store configuration data, credentials, and other settings used by automation processes. [UiPath Assets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-assets)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);
const allAssets = await assets.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`AssetGetResponse`](../AssetGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`AssetGetResponse`](../AssetGetResponse/)>>

Gets all assets across folders with optional filtering

#### Type Parameters

| Type Parameter                                                               | Default type                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `T` *extends* [`AssetGetAllOptions`](../../type-aliases/AssetGetAllOptions/) | [`AssetGetAllOptions`](../../type-aliases/AssetGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`AssetGetResponse`](../AssetGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`AssetGetResponse`](../AssetGetResponse/)>>

Promise resolving to either an array of assets NonPaginatedResponse or a PaginatedResponse when pagination options are used. [AssetGetResponse](../AssetGetResponse/)

#### Example

```
// Standard array return
// With folder
const folderAssets = await assets.getAll({ folderId: <folderId> });

// First page with pagination
const page1 = await assets.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await assets.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await assets.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

______________________________________________________________________

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: [`BaseOptions`](../BaseOptions/)): `Promise`\<[`AssetGetResponse`](../AssetGetResponse/)>

Gets a single asset by ID

#### Parameters

| Parameter  | Type                             | Description                                |
| ---------- | -------------------------------- | ------------------------------------------ |
| `id`       | `number`                         | Asset ID                                   |
| `folderId` | `number`                         | Required folder ID                         |
| `options?` | [`BaseOptions`](../BaseOptions/) | Optional query parameters (expand, select) |

#### Returns

`Promise`\<[`AssetGetResponse`](../AssetGetResponse/)>

Promise resolving to a single asset [AssetGetResponse](../AssetGetResponse/)

#### Example

```
// Get asset by ID
const asset = await assets.getById(<assetId>, <folderId>);
```
