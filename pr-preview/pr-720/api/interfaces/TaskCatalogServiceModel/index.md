Service for managing UiPath Action Center task catalogs.

A task catalog is a reusable, folder-scoped definition that groups related tasks and configures how they behave: data retention (delete or archive the tasks after a retention period), encryption of task data, and tags. A task is linked to a catalog through its metadata (see `editMetadata`) to inherit that configuration. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)

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

Promise resolving to either a [NonPaginatedResponse](../NonPaginatedResponse/) or [PaginatedResponse](../PaginatedResponse/) of [TaskCatalogGetResponse](../TaskCatalogGetResponse/) items, paginated when pagination options are used.

#### Example

```
const catalogs = await taskCatalogs.getAll({ folderId: <folderId> });

// Paginated
const page1 = await taskCatalogs.getAll({ folderId: <folderId>, pageSize: 20 });
if (page1.hasNextPage) {
  const page2 = await taskCatalogs.getAll({ folderId: <folderId>, cursor: page1.nextCursor });
}
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

> **updateById**(`id`: `number`, `options?`: `TaskCatalogUpdateOptions`): `Promise`\<`void`>

Updates a task catalog by id. Name, description and retention are preserved when not passed; tags are replaced only when provided (the catalog is not returned with its tags, so they cannot be auto preserved).

#### Parameters

- `id`: `number` — The task catalog id
- `options?`: `TaskCatalogUpdateOptions` — Fields to change (including an optional new name) plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the update completes

#### Example

```
// Change only the description, keep everything else
await taskCatalogs.updateById(<catalogId>, { description: "Updated", folderId: <folderId> });

// Rename the catalog
await taskCatalogs.updateById(<catalogId>, { name: "Invoices 2025", folderId: <folderId> });
```

### updateByName()

> **updateByName**(`name`: `string`, `options?`: `TaskCatalogUpdateOptions`): `Promise`\<`void`>

Updates a task catalog by name, resolving the id internally. Name, description and retention are preserved when not passed; tags are replaced only when provided.

#### Parameters

- `name`: `string` — The current name of the task catalog to update
- `options?`: `TaskCatalogUpdateOptions` — Fields to change (including an optional new name) plus folder scope (folderId, folderKey, or folderPath)

#### Returns

`Promise`\<`void`>

Promise resolving once the update completes

#### Example

```
// Change only the description
await taskCatalogs.updateByName("Invoices", { description: "Updated", folderId: <folderId> });

// Rename the catalog
await taskCatalogs.updateByName("Invoices", { name: "Invoices 2025", folderId: <folderId> });
```
