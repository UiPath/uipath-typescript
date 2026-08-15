**`Experimental`**

Warning

Preview: This service is experimental and may change or be removed in future releases.

Public surface of the Business Apps service. JSDoc on this interface drives the generated API reference documentation.

A business app is the tenant-level definition behind a workspace in Maestro — its name, description, icon, color, and the Orchestrator processes it surfaces. Definitions are scoped to the tenant, so no folder is involved.

Reads require the tenant-level `APPS.View` permission; `create` requires `APPS.Create`, and both `updateById` and `deleteById` require `APPS.Edit`.

## Methods

### create()

> **create**(`name`: `string`, `description`: `string`, `processKeys`: `string`[], `options?`: `BusinessAppCreateOptions`): `Promise`\<`BusinessAppGetResponse`>

**`Experimental`**

Creates a business app.

Warning

Preview: This method is experimental and may change or be removed in future releases.

The name must be unique within the tenant, compared case-insensitively — creating a second app whose name differs only by case is rejected as a conflict. Returns the stored app including its generated `id` and audit fields.

#### Parameters

- `name`: `string` — Display name, unique within the tenant
- `description`: `string` — Human description of what the app is for
- `processKeys`: `string`[] — Orchestrator process (release) keys the app surfaces; at least one
- `options?`: `BusinessAppCreateOptions` — Optional icon and color

#### Returns

`Promise`\<`BusinessAppGetResponse`>

The created app as a [BusinessAppGetResponse](../../type-aliases/BusinessAppGetResponse/), with `update` and `delete` attached

#### Examples

```
import { UiPath } from '@uipath/uipath-typescript/core';
import { BusinessApps } from '@uipath/uipath-typescript/business-apps';

const sdk = new UiPath(config);
await sdk.initialize();

const businessApps = new BusinessApps(sdk);
const app = await businessApps.create('Claims Intake', 'Handles inbound claims', [
  '<processKey>',
]);
```

```
const app = await businessApps.create(
  'Claims Intake',
  'Handles inbound claims',
  ['<processKey>'],
  { icon: 'claims-icon', color: '#1F6FEB' }
);
```

### deleteById()

> **deleteById**(`businessAppId`: `string`): `Promise`\<`void`>

**`Experimental`**

Deletes a business app.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Only the definition is removed — the processes it referenced are left untouched.

#### Parameters

- `businessAppId`: `string` — GUID of the business app

#### Returns

`Promise`\<`void`>

#### Example

```
await businessApps.deleteById('<businessAppId>');
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BusinessAppGetResponse`> : `NonPaginatedResponse`\<`BusinessAppGetResponse`>>

**`Experimental`**

Gets the tenant's business apps, ordered by name.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Apps are visible to anyone who can read them — there is no per-caller filtering. The results are paged: calling without options returns the first page at the service's default page size, so pass `pageSize` and follow `nextCursor` to walk a tenant that has more apps than one page holds.

#### Type Parameters

- `T` *extends* `PaginationOptions` = `PaginationOptions`

#### Parameters

- `options?`: `T` — Pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`BusinessAppGetResponse`> : `NonPaginatedResponse`\<`BusinessAppGetResponse`>>

The tenant's apps as [BusinessAppGetResponse](../../type-aliases/BusinessAppGetResponse/) items, each with `update` and `delete` attached

#### Examples

```
const result = await businessApps.getAll();
result.items.forEach(app => console.log(app.name, app.processKeys));
```

```
let page = await businessApps.getAll({ pageSize: 50 });
const allApps = [...page.items];

while (page.hasNextPage && page.nextCursor) {
  page = await businessApps.getAll({ cursor: page.nextCursor });
  allApps.push(...page.items);
}
```

### getById()

> **getById**(`businessAppId`: `string`): `Promise`\<`BusinessAppGetResponse`>

**`Experimental`**

Gets a business app by id.

Warning

Preview: This method is experimental and may change or be removed in future releases.

Apps are addressable by id only — names are mutable, so resolve a name through `getAll()` first if that is all you have.

#### Parameters

- `businessAppId`: `string` — GUID of the business app

#### Returns

`Promise`\<`BusinessAppGetResponse`>

The app as a [BusinessAppGetResponse](../../type-aliases/BusinessAppGetResponse/), with `update` and `delete` attached

#### Example

```
const app = await businessApps.getById('<businessAppId>');
```

### updateById()

> **updateById**(`businessAppId`: `string`, `name`: `string`, `description`: `string`, `processKeys`: `string`[], `options?`: `BusinessAppUpdateOptions`): `Promise`\<`BusinessAppGetResponse`>

**`Experimental`**

Replaces a business app.

Warning

Preview: This method is experimental and may change or be removed in future releases.

This is a full replace, not a partial update: every editable field is overwritten, so an omitted `icon` or `color` is cleared rather than left alone. The name must stay unique within the tenant. Writes are last-write-wins — concurrent updates do not conflict, the later one simply survives.

#### Parameters

- `businessAppId`: `string` — GUID of the business app
- `name`: `string` — New display name, unique within the tenant
- `description`: `string` — New description
- `processKeys`: `string`[] — The full set of Orchestrator process (release) keys the app surfaces
- `options?`: `BusinessAppUpdateOptions` — Optional icon and color; omitting one clears it

#### Returns

`Promise`\<`BusinessAppGetResponse`>

The app as stored after the write, as a [BusinessAppGetResponse](../../type-aliases/BusinessAppGetResponse/)

#### Examples

```
const updated = await businessApps.updateById(
  '<businessAppId>',
  'Claims Intake',
  'Handles inbound and renewal claims',
  ['<processKey>']
);
```

```
const app = await businessApps.getById('<businessAppId>');

const updated = await businessApps.updateById(
  app.id,
  app.name,
  'An updated description',
  app.processKeys,
  { icon: app.icon ?? undefined, color: app.color ?? undefined }
);
```
