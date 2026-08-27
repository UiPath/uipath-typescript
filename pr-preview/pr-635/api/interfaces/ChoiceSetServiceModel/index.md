Service for managing UiPath Data Fabric Choice Sets

Choice Sets are enumerated lists of values that can be used as field types in entities. They enable single-select or multi-select fields, such as expense types, categories, or status values. [UiPath Choice Sets Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets)

### Usage

```
import { ChoiceSets } from '@uipath/uipath-typescript/entities';

const choicesets = new ChoiceSets(sdk);
const allChoiceSets = await choicesets.getAll();
```

## Methods

### create()

> **create**(`name`: `string`, `options?`: `ChoiceSetCreateOptions`): `Promise`\<`string`>

**`Experimental`**

Creates a new Data Fabric choice set

#### Parameters

- `name`: `string` — Choice set name. Must start with a letter, may contain only letters, numbers, and underscores, length 3–100 characters (e.g., `"expenseTypes"`).
- `options?`: `ChoiceSetCreateOptions` — Optional choice-set-level settings ([ChoiceSetCreateOptions](../ChoiceSetCreateOptions/)) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`string`>

Promise resolving to the UUID of the created choice set

#### Example

```
// Minimal create
const expenseTypesId = await choicesets.create("expense_types");

// With display name and description
const priorityLevelsId = await choicesets.create("priority_levels", {
  displayName: "Priority Levels",
  description: "Ticket priority categories",
});
```

### deleteById()

> **deleteById**(`choiceSetId`: `string`, `options?`: `ChoiceSetDeleteByIdOptions`): `Promise`\<`void`>

**`Experimental`**

Deletes a Data Fabric choice set and all its values.

#### Parameters

- `choiceSetId`: `string` — UUID of the choice set to delete
- `options?`: `ChoiceSetDeleteByIdOptions` — Optional [ChoiceSetDeleteByIdOptions](../ChoiceSetDeleteByIdOptions/) — pass `folderKey` for folder-scoped choice sets; omit for tenant-level The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`void`>

Promise resolving when the choice set is deleted

#### Example

```
// First, get the choice set ID using getAll()
const allChoiceSets = await choicesets.getAll();
const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');

await choicesets.deleteById(expenseTypes.id);

// Folder-scoped choice set
await choicesets.deleteById(expenseTypes.id, { folderKey: "<folderKey>" });
```

### deleteValuesById()

> **deleteValuesById**(`choiceSetId`: `string`, `valueIds`: `string`[], `options?`: `ChoiceSetValueDeleteOptions`): `Promise`\<`void`>

**`Experimental`**

Deletes one or more values from a choice set.

#### Parameters

- `choiceSetId`: `string` — UUID of the parent choice set
- `valueIds`: `string`[] — Array of value UUIDs to delete
- `options?`: `ChoiceSetValueDeleteOptions` — Optional [ChoiceSetValueDeleteOptions](../ChoiceSetValueDeleteOptions/) — pass `folderKey` for folder-scoped choice sets; omit for tenant-level The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`void`>

Promise resolving when the values are deleted

#### Example

```
// Get the value IDs from getById()
const values = await choicesets.getById('<choiceSetId>');
const idsToDelete = values.items.slice(0, 2).map(v => v.id);

await choicesets.deleteValuesById('<choiceSetId>', idsToDelete);

// Folder-scoped choice set
await choicesets.deleteValuesById('<choiceSetId>', idsToDelete, { folderKey: "<folderKey>" });
```

### getAll()

> **getAll**(`options?`: `ChoiceSetGetAllOptions`): `Promise`\<`ChoiceSetGetAllResponse`[]>

Gets choice sets in the tenant.

Three call modes:

- `getAll()` — default. Returns only tenant-level choice sets.
- `getAll({ folderKey: "<uuid>" })` — preferred for folder-scoped data. Returns only choice sets in that folder.
- `getAll({ includeFolderChoiceSets: true })` — returns tenant-level **and** folder-level choice sets together. `folderKey` is preferred over `includeFolderChoiceSets` when both are set.

#### Parameters

- `options?`: `ChoiceSetGetAllOptions` — Optional [ChoiceSetGetAllOptions](../ChoiceSetGetAllOptions/) (`folderKey` to list a single folder's choice sets — preferred when scoping to a folder; `includeFolderChoiceSets: true` to list tenant + folder choice sets together) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`ChoiceSetGetAllResponse`[]>

Promise resolving to an array of choice set metadata [ChoiceSetGetAllResponse](../ChoiceSetGetAllResponse/)

#### Example

```
// Tenant-only (default)
const tenantChoiceSets = await choicesets.getAll();

// A single folder's choice sets (preferred when targeting a specific folder)
const folderChoiceSets = await choicesets.getAll({ folderKey: "<folderKey>" });

// Tenant + folder choice sets together
const allChoiceSets = await choicesets.getAll({ includeFolderChoiceSets: true });

// Find a specific choice set by name
const expenseTypes = tenantChoiceSets.find(cs => cs.name === 'ExpenseTypes');
```

### getById()

> **getById**\<`T`>(`choiceSetId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ChoiceSetGetResponse`> : `NonPaginatedResponse`\<`ChoiceSetGetResponse`>>

Gets choice set values by choice set ID with optional pagination

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

- `T` *extends* `ChoiceSetGetByIdOptions` = `ChoiceSetGetByIdOptions`

#### Parameters

- `choiceSetId`: `string` — UUID of the choice set
- `options?`: `T` — Pagination options and optional `folderKey` (omit for tenant-level choice sets) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ChoiceSetGetResponse`> : `NonPaginatedResponse`\<`ChoiceSetGetResponse`>>

Promise resolving to choice set values or paginated result [ChoiceSetGetResponse](../ChoiceSetGetResponse/)

#### Example

```
// First, get the choice set ID using getAll()
const allChoiceSets = await choicesets.getAll();
const expenseTypes = allChoiceSets.find(cs => cs.name === 'ExpenseTypes');
const choiceSetId = expenseTypes.id;

// Get all values (non-paginated)
const values = await choicesets.getById(choiceSetId);

// Iterate through choice set values
for (const value of values.items) {
  console.log(`Value: ${value.displayName}`);
}

// First page with pagination
const page1 = await choicesets.getById(choiceSetId, { pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await choicesets.getById(choiceSetId, { cursor: page1.nextCursor });
}

// Folder-scoped choice set
const folderValues = await choicesets.getById(choiceSetId, { folderKey: "<folderKey>" });
```

### insertValueById()

> **insertValueById**(`choiceSetId`: `string`, `name`: `string`, `options?`: `ChoiceSetValueInsertOptions`): `Promise`\<`ChoiceSetValueInsertResponse`>

**`Experimental`**

Inserts a single value into a choice set.

#### Parameters

- `choiceSetId`: `string` — UUID of the parent choice set
- `name`: `string` — Identifier name of the new value (e.g., `"TRAVEL"`)
- `options?`: `ChoiceSetValueInsertOptions` — Optional fields ([ChoiceSetValueInsertOptions](../ChoiceSetValueInsertOptions/)) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`ChoiceSetValueInsertResponse`>

Promise resolving to the inserted value ([ChoiceSetValueInsertResponse](../ChoiceSetValueInsertResponse/))

#### Example

```
// First, get the choice set ID using getAll()
const allChoiceSets = await choicesets.getAll();
const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');

const inserted = await choicesets.insertValueById(expenseTypes.id, 'TRAVEL', {
  displayName: 'Travel',
});
console.log(inserted.id);

// Folder-scoped choice set: folderKey is required on the wire
await choicesets.insertValueById(expenseTypes.id, 'TRAVEL', {
  displayName: 'Travel',
  folderKey: "<folderKey>",
});
```

### updateById()

> **updateById**(`choiceSetId`: `string`, `options`: `ChoiceSetUpdateOptions`): `Promise`\<`void`>

**`Experimental`**

Updates an existing choice set's metadata (display name and/or description).

**At least one of `displayName` or `description` must be provided** — the call throws `ValidationError` if both are omitted.

#### Parameters

- `choiceSetId`: `string` — UUID of the choice set to update
- `options`: `ChoiceSetUpdateOptions` — Metadata fields to change ([ChoiceSetUpdateOptions](../ChoiceSetUpdateOptions/)) The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`void`>

Promise resolving when the update is complete

#### Example

```
// First, get the choice set ID using getAll()
const allChoiceSets = await choicesets.getAll();
const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');

await choicesets.updateById(expenseTypes.id, {
  displayName: "Expense Categories",
  description: "Updated description",
});
```

### updateValueById()

> **updateValueById**(`choiceSetId`: `string`, `valueId`: `string`, `displayName`: `string`, `options?`: `ChoiceSetValueUpdateOptions`): `Promise`\<`ChoiceSetValueUpdateResponse`>

**`Experimental`**

Updates an existing choice-set value's display name.

Only `displayName` is mutable; the value's `name` (identifier) is fixed at insert time and cannot be changed.

#### Parameters

- `choiceSetId`: `string` — UUID of the parent choice set
- `valueId`: `string` — UUID of the value to update
- `displayName`: `string` — New human-readable display name for the value
- `options?`: `ChoiceSetValueUpdateOptions` — Optional [ChoiceSetValueUpdateOptions](../ChoiceSetValueUpdateOptions/) — pass `folderKey` for folder-scoped choice sets; omit for tenant-level. The `folderKey` property is **experimental**.

#### Returns

`Promise`\<`ChoiceSetValueUpdateResponse`>

Promise resolving to the updated value ([ChoiceSetValueUpdateResponse](../ChoiceSetValueUpdateResponse/))

#### Example

```
// Get the choice set ID from getAll() and the value ID from getById()
const allChoiceSets = await choicesets.getAll();
const expenseTypes = allChoiceSets.find(cs => cs.name === 'expense_types');
const values = await choicesets.getById(expenseTypes.id);
const travel = values.items.find(v => v.name === 'TRAVEL');

await choicesets.updateValueById(expenseTypes.id, travel.id, 'Business Travel');

// Folder-scoped choice set: folderKey is required on the wire
await choicesets.updateValueById(expenseTypes.id, travel.id, 'Business Travel', {
  folderKey: "<folderKey>",
});
```
