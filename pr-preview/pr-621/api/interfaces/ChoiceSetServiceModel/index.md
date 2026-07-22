Service for managing UiPath Data Fabric Choice Sets

Choice Sets are enumerated lists of values that can be used as field types in entities. They enable single-select or multi-select fields, such as expense types, categories, or status values. [UiPath Choice Sets Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets)

### Usage

```
import { ChoiceSets } from '@uipath/uipath-typescript/entities';

const choicesets = new ChoiceSets(sdk);
const allChoiceSets = await choicesets.getAll();
```

## Methods

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
