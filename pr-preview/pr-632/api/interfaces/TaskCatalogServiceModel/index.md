Service for managing UiPath Action Center task catalogs.

Task catalogs group and configure tasks (retention, encryption, tags) and can be associated with a task's metadata. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)

### Usage

```
import { TaskCatalogs } from '@uipath/uipath-typescript/tasks';

const taskCatalogs = new TaskCatalogs(sdk);
const catalogs = await taskCatalogs.getAll({ folderId: <folderId> });
```

## Methods

### create()

> **create**(`name`: `string`, `options?`: `TaskCatalogCreateOptions`): `Promise`\<`TaskCatalogGetResponse`>

Creates a task catalog.

#### Parameters

- `name`: `string` — Name of the task catalog (max 50 characters)
- `options?`: `TaskCatalogCreateOptions` — Optional fields (description, tags, retention, ...) plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`TaskCatalogGetResponse`>

Promise resolving to the created task catalog [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Examples

```
const catalog = await taskCatalogs.create("Invoices", { description: "Invoice tasks", folderId: <folderId> });
```

```
import { TaskCatalogRetentionAction } from '@uipath/uipath-typescript/tasks';
const catalog = await taskCatalogs.create("Invoices", {
  retentionAction: TaskCatalogRetentionAction.Delete,
  retentionPeriod: 30,
  folderId: <folderId>
});
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskCatalogGetResponse`> : `NonPaginatedResponse`\<`TaskCatalogGetResponse`>>

Gets task catalogs in a folder.

#### Type Parameters

- `T` *extends* `TaskCatalogGetAllOptions` = `TaskCatalogGetAllOptions`

#### Parameters

- `options?`: `T` — Folder scope (folderId, folderKey, or folderPath) plus query and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`TaskCatalogGetResponse`> : `NonPaginatedResponse`\<`TaskCatalogGetResponse`>>

Promise resolving to either an array of task catalogs NonPaginatedResponse or a PaginatedResponse when pagination options are used.

#### Example

```
const catalogs = await taskCatalogs.getAll({ folderId: <folderId> });
```

### getById()

> **getById**(`id`: `number`, `options?`: `TaskCatalogGetByIdOptions`): `Promise`\<`TaskCatalogGetResponse`>

Gets a task catalog by id.

#### Parameters

- `id`: `number` — The task catalog id
- `options?`: `TaskCatalogGetByIdOptions` — Folder scope (folderId, folderKey, or folderPath) plus expand/select

#### Returns

`Promise`\<`TaskCatalogGetResponse`>

Promise resolving to the task catalog [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Example

```
const catalog = await taskCatalogs.getById(<catalogId>, { folderId: <folderId> });
```

### getByName()

> **getByName**(`name`: `string`, `options?`: `TaskCatalogGetByNameOptions`): `Promise`\<`TaskCatalogGetResponse`>

Gets a task catalog by name within a folder.

#### Parameters

- `name`: `string` — The task catalog name
- `options?`: `TaskCatalogGetByNameOptions` — Folder scope (folderId, folderKey, or folderPath) plus expand/select

#### Returns

`Promise`\<`TaskCatalogGetResponse`>

Promise resolving to the matching task catalog [TaskCatalogGetResponse](../TaskCatalogGetResponse/)

#### Example

```
const catalog = await taskCatalogs.getByName("Invoices", { folderId: <folderId> });
```

### updateById()

> **updateById**(`id`: `number`, `name`: `string`, `options?`: `TaskCatalogUpdateOptions`): `Promise`\<`void`>

Updates a task catalog by id.

#### Parameters

- `id`: `number` — The task catalog id
- `name`: `string` — Name of the task catalog (max 50 characters)
- `options?`: `TaskCatalogUpdateOptions` — Optional fields (description, tags, retention, ...) plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the update completes

#### Example

```
await taskCatalogs.updateById(<catalogId>, "Invoices", { description: "Updated", folderId: <folderId> });
```

### updateByName()

> **updateByName**(`name`: `string`, `newName`: `string`, `options?`: `TaskCatalogUpdateOptions`): `Promise`\<`void`>

Updates a task catalog by name, resolving the id internally.

#### Parameters

- `name`: `string` — The current name of the task catalog to update
- `newName`: `string` — Name to set on the task catalog (max 50 characters)
- `options?`: `TaskCatalogUpdateOptions` — Optional fields (description, tags, retention, ...) plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the update completes

#### Example

```
await taskCatalogs.updateByName("Invoices", "Updated Invoices", { description: "Updated", folderId: <folderId> });
```
