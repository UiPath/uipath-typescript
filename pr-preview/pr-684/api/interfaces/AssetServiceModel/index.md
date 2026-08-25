Service for managing UiPath Assets.

Assets are key-value pairs that can be used to store configuration data, credentials, and other settings used by automation processes. [UiPath Assets Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-assets)

### Usage

```
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);
const allAssets = await assets.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AssetGetResponse`> : `NonPaginatedResponse`\<`AssetGetResponse`>>

Gets all assets across folders with optional filtering

#### Type Parameters

- `T` *extends* `AssetGetAllOptions` = `AssetGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AssetGetResponse`> : `NonPaginatedResponse`\<`AssetGetResponse`>>

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

### getById()

> **getById**(`id`: `number`, `folderId`: `number`, `options?`: `AssetGetByIdOptions`): `Promise`\<`AssetGetResponse`>

Gets a single asset by ID

#### Parameters

- `id`: `number` — Asset ID
- `folderId`: `number` — Required folder ID
- `options?`: `AssetGetByIdOptions` — Optional query parameters (expand, select)

#### Returns

`Promise`\<`AssetGetResponse`>

Promise resolving to a single asset [AssetGetResponse](../AssetGetResponse/)

#### Example

```
// Get asset by ID
const asset = await assets.getById(<assetId>, <folderId>);
```

### getByKey()

> **getByKey**(`key`: `string`, `options?`: `AssetGetByKeyOptions`): `Promise`\<`AssetGetResponse`>

Retrieves a single asset by key (GUID).

#### Parameters

- `key`: `string` — Asset key (GUID)
- `options?`: `AssetGetByKeyOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)

#### Returns

`Promise`\<`AssetGetResponse`>

Promise resolving to a single [AssetGetResponse](../AssetGetResponse/)

#### Example

```
// By folder path
await assets.getByKey('5f6dadf1-3677-49dc-8aca-c2999dd4b3ba', { folderPath: 'Shared/Finance' });
```

### getByName()

> **getByName**(`name`: `string`, `options?`: `AssetGetByNameOptions`): `Promise`\<`AssetGetResponse`>

Retrieves a single asset by name.

#### Parameters

- `name`: `string` — Asset name to search for
- `options?`: `AssetGetByNameOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)

#### Returns

`Promise`\<`AssetGetResponse`>

Promise resolving to a single asset [AssetGetResponse](../AssetGetResponse/)

#### Example

```
// By folder ID
await assets.getByName('ApiKey', { folderId: 123 });

// By folder key (GUID)
await assets.getByName('ApiKey', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });

// By folder path
await assets.getByName('ApiKey', { folderPath: 'Shared/Finance' });

// With expand
await assets.getByName('ApiKey', { folderPath: 'Shared/Finance', expand: 'keyValueList' });
```

### updateValue()

> **updateValue**(`ref`: `AssetRef`, `newValue`: `AssetNewValue`, `options?`: `AssetUpdateValueOptions`): `Promise`\<`void`>

Updates the value of an existing asset, identified by ref (`{ id }`, `{ name }`, or `{ key }` (GUID)).

Fetches the asset internally to determine its type, then updates only the value while preserving the asset's name, scope, and description. Folder scoping in `options` drives both the ref's name/key lookup and the update itself — the same folder options apply to both calls.

**Supported value types:** `Text`, `Integer`, and `Bool` only. Other types (`Credential`, `Secret`) throw a `ValidationError`.

The `newValue` runtime type must match the asset's `valueType`:

- `Text` → `string`
- `Integer` → `number` (integer)
- `Bool` → `boolean`

#### Parameters

- `ref`: `AssetRef` — Asset ref (`{ id }`, `{ name }`, or `{ key }` (GUID))
- `newValue`: `AssetNewValue` — New value to apply
- `options?`: `AssetUpdateValueOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`void`>

Promise resolving when the asset has been updated

#### Example

```
// Update by id
await assets.updateValue({ id: <assetId> }, 'new-value', { folderId: <folderId> });

// Update by name (folder options drive the name lookup)
await assets.updateValue({ name: 'ApiKey' }, 42, { folderPath: 'Shared/Finance' });

// Update by GUID key
await assets.updateValue({ key: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' }, true, { folderPath: 'Shared/Finance' });
```

### ~~updateValueById()~~

> **updateValueById**(`id`: `number`, `newValue`: `AssetNewValue`, `options?`: `AssetUpdateValueByIdOptions`): `Promise`\<`void`>

Updates the value of an existing asset by ID.

#### Parameters

- `id`: `number` — Asset ID
- `newValue`: `AssetNewValue` — New value to apply
- `options?`: `AssetUpdateValueByIdOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`void`>

#### Deprecated

Use [AssetServiceModel.updateValue](#updatevalue) with `{ id }`, `{ name }`, or `{ key }` instead. This method will be removed in the next major version.
