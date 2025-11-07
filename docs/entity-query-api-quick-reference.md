# Entity Query API - Quick Reference

## Quick Start

```typescript
import { FilterLogicalOperator } from '@uipath/typescript-sdk';

// Basic query
const results = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  }
});
```

## Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal to | `{ fieldName: 'status', operator: '=', value: 'Active' }` |
| `!=` | Not equal to | `{ fieldName: 'status', operator: '!=', value: 'Deleted' }` |
| `>` | Greater than | `{ fieldName: 'age', operator: '>', value: 18 }` |
| `<` | Less than | `{ fieldName: 'price', operator: '<', value: 100 }` |
| `>=` | Greater than or equal | `{ fieldName: 'age', operator: '>=', value: 18 }` |
| `<=` | Less than or equal | `{ fieldName: 'price', operator: '<=', value: 1000 }` |
| `contains` | String contains | `{ fieldName: 'name', operator: 'contains', value: 'John' }` |
| `not contains` | String does not contain | `{ fieldName: 'description', operator: 'not contains', value: 'test' }` |
| `startswith` | String starts with | `{ fieldName: 'email', operator: 'startswith', value: 'admin@' }` |
| `endswith` | String ends with | `{ fieldName: 'email', operator: 'endswith', value: '.com' }` |
| `in` | Value in list | `{ fieldName: 'status', operator: 'in', value: ['Active', 'Pending'] }` |
| `not in` | Value not in list | `{ fieldName: 'category', operator: 'not in', value: ['Archived'] }` |

## Common Patterns

### AND Logic

```typescript
filterGroup: {
  logicalOperator: FilterLogicalOperator.AND,
  queryFilters: [
    { fieldName: 'status', operator: '=', value: 'Active' },
    { fieldName: 'age', operator: '>=', value: 18 }
  ]
}
```

### OR Logic

```typescript
filterGroup: {
  logicalOperator: FilterLogicalOperator.OR,
  queryFilters: [
    { fieldName: 'status', operator: '=', value: 'Active' },
    { fieldName: 'status', operator: '=', value: 'Pending' }
  ]
}
```

### Nested Logic (A AND (B OR C))

```typescript
filterGroup: {
  logicalOperator: FilterLogicalOperator.AND,
  queryFilters: [
    { fieldName: 'status', operator: '=', value: 'Active' }
  ],
  filterGroups: [
    {
      logicalOperator: FilterLogicalOperator.OR,
      queryFilters: [
        { fieldName: 'age', operator: '>=', value: 18 },
        { fieldName: 'isVerified', operator: '=', value: true }
      ]
    }
  ]
}
```

### Sorting

```typescript
sortOptions: [
  { fieldName: 'createdTime', isDescending: true },
  { fieldName: 'name', isDescending: false }
]
```

### Field Selection

```typescript
selectedFields: ['id', 'name', 'email', 'status']
```

### Pagination

```typescript
// First page
{ pageSize: 50 }

// Next page
{ cursor: previousResponse.nextCursor }

// Jump to page
{ jumpToPage: 3, pageSize: 50 }
```

### Entity Expansion

```typescript
expansions: [
  {
    expandedField: 'customer',
    selectedFields: ['id', 'name']
  }
]
```

## Complete Example Template

```typescript
const results = await sdk.entities.queryRecords(entityId, {
  // Field selection
  selectedFields: ['id', 'name', 'status'],
  
  // Filtering
  filterGroup: {
    logicalOperator: FilterLogicalOperator.AND,
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  
  // Sorting
  sortOptions: [
    { fieldName: 'createdTime', isDescending: true }
  ],
  
  // Expansion
  expansions: [
    { expandedField: 'relatedEntity' }
  ],
  
  // Pagination
  pageSize: 50
});
```

## Response Structure

### Paginated Response

```typescript
{
  items: EntityRecord[],
  totalCount?: number,
  hasNextPage: boolean,
  nextCursor?: PaginationCursor,
  previousCursor?: PaginationCursor,
  currentPage?: number,
  totalPages?: number,
  supportsPageJump: boolean
}
```

### Non-Paginated Response

```typescript
{
  items: EntityRecord[],
  totalCount?: number
}
```

## Using Entity Methods

```typescript
const entity = await sdk.entities.getById(entityId);
const results = await entity.query({
  filterGroup: { /* ... */ },
  pageSize: 50
});
```

