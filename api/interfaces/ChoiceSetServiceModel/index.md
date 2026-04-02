Service for managing UiPath Data Fabric Choice Sets

Choice Sets are enumerated lists of values that can be used as field types in entities. They enable single-select or multi-select fields, such as expense types, categories, or status values. [UiPath Choice Sets Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/choice-sets)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { ChoiceSets } from '@uipath/uipath-typescript/entities';

const choicesets = new ChoiceSets(sdk);
const allChoiceSets = await choicesets.getAll();
```

## Methods

### getAll()

> **getAll**(): `Promise`\<[`ChoiceSetGetAllResponse`](../ChoiceSetGetAllResponse/)[]>

Gets all choice sets in the org

#### Returns

`Promise`\<[`ChoiceSetGetAllResponse`](../ChoiceSetGetAllResponse/)[]>

Promise resolving to an array of choice set metadata [ChoiceSetGetAllResponse](../ChoiceSetGetAllResponse/)

#### Example

```
// Get all choice sets
const allChoiceSets = await choicesets.getAll();

// Iterate through choice sets
allChoiceSets.forEach(choiceSet => {
  console.log(`ChoiceSet: ${choiceSet.displayName} (${choiceSet.name})`);
  console.log(`Description: ${choiceSet.description}`);
  console.log(`Created by: ${choiceSet.createdBy}`);
});

// Find a specific choice set by name
const expenseTypes = allChoiceSets.find(cs => cs.name === 'ExpenseTypes');

// Check choice set details
if (expenseTypes) {
  console.log(`Last updated: ${expenseTypes.updatedTime}`);
  console.log(`Updated by: ${expenseTypes.updatedBy}`);
}
```

______________________________________________________________________

### getById()

> **getById**\<`T`>(`choiceSetId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ChoiceSetGetResponse`](../ChoiceSetGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ChoiceSetGetResponse`](../ChoiceSetGetResponse/)>>

Gets choice set values by choice set ID with optional pagination

The method returns either:

- A NonPaginatedResponse with items array (when no pagination parameters are provided)
- A PaginatedResponse with navigation cursors (when any pagination parameter is provided)

#### Type Parameters

| Type Parameter                                                             | Default type                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `T` *extends* [`PaginationOptions`](../../type-aliases/PaginationOptions/) | [`PaginationOptions`](../../type-aliases/PaginationOptions/) |

#### Parameters

| Parameter     | Type     | Description            |
| ------------- | -------- | ---------------------- |
| `choiceSetId` | `string` | UUID of the choice set |
| `options?`    | `T`      | Pagination options     |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ChoiceSetGetResponse`](../ChoiceSetGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ChoiceSetGetResponse`](../ChoiceSetGetResponse/)>>

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
```
