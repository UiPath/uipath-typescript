# Entity Query API Documentation

## Overview

The Entity Query API provides advanced querying capabilities for UiPath Data Fabric entities, enabling complex filtering, sorting, field selection, and pagination. This API uses a POST-based endpoint (`query_expansion`) that supports more sophisticated operations than the basic `read` endpoint.

### Key Features

- **Complex Filtering**: Nested filter groups with AND/OR logical operators
- **Multi-field Sorting**: Sort by multiple fields with ascending/descending order
- **Field Selection**: Select specific fields to reduce payload size
- **Entity Expansion**: Expand related entities with field selection
- **Pagination**: Support for cursor-based and page-based pagination
- **Type Safety**: Full TypeScript support with type inference

## API Reference

### Method: `queryRecords`

Queries entity records with advanced filtering, sorting, and field selection.

#### Signature

```typescript
queryRecords<T extends EntityQueryOptions = EntityQueryOptions>(
  entityId: string,
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<EntityRecord>
    : NonPaginatedResponse<EntityRecord>
>
```

#### Parameters

- **entityId** (`string`): UUID of the entity to query
- **options** (`EntityQueryOptions`, optional): Query configuration including filters, sorting, pagination, etc.

#### Returns

- **Paginated Response**: When pagination options (`pageSize`, `cursor`, or `jumpToPage`) are provided
- **Non-Paginated Response**: When no pagination options are provided

### Method: `query` (Entity Method)

Convenience method available on entity instances for querying records.

#### Signature

```typescript
query<T extends EntityQueryOptions = EntityQueryOptions>(
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<EntityRecord>
    : NonPaginatedResponse<EntityRecord>
>
```

#### Usage

```typescript
const entity = await sdk.entities.getById(entityId);
const results = await entity.query({
  filterGroup: { /* ... */ },
  pageSize: 50
});
```

## Type Definitions

### EntityQueryOptions

Main query options interface that extends `EntityQuery` with pagination support.

```typescript
type EntityQueryOptions = EntityQuery & PaginationOptions;
```

### EntityQuery

Core query configuration interface.

```typescript
interface EntityQuery {
  /** Optional list of field names to select */
  selectedFields?: string[];
  
  /** Starting index for pagination (0-based) */
  start?: number;
  
  /** Maximum number of records to return */
  limit?: number;
  
  /** Sort options for ordering results */
  sortOptions?: SortOption[];
  
  /** Filter group for complex filtering */
  filterGroup?: FilterGroup;
  
  /** Expansion configurations for related entities */
  expansions?: Expansion[];
}
```

### FilterGroup

Represents a group of filters that can be combined with logical operators.

```typescript
interface FilterGroup {
  /** Logical operator to combine filters (AND/OR) */
  logicalOperator?: FilterLogicalOperator;
  
  /** Array of query filters */
  queryFilters: QueryFilter[];
  
  /** Nested filter groups for complex filtering */
  filterGroups?: FilterGroup[];
}
```

### QueryFilter

Represents a single filter condition.

```typescript
interface QueryFilter {
  /** Name of the field to filter on */
  fieldName: string;
  
  /** Operator to use for the filter */
  operator: FilterOperator;
  
  /** Value to compare against */
  value: any;
}
```

### FilterOperator

Supported filter operators.

```typescript
type FilterOperator =
  | 'contains'
  | 'not contains'
  | 'startswith'
  | 'endswith'
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'in'
  | 'not in';
```

### FilterLogicalOperator

Logical operators for combining filter groups.

```typescript
enum FilterLogicalOperator {
  AND = 0,
  OR = 1
}
```

### SortOption

Sort configuration for query results.

```typescript
interface SortOption {
  /** Name of the field to sort by */
  fieldName: string;
  
  /** Whether to sort in descending order */
  isDescending: boolean;
}
```

### Expansion

Expansion configuration for related entities.

```typescript
interface Expansion {
  /** Name of the field to expand */
  expandedField: string;
  
  /** Optional list of fields to select from the expanded entity */
  selectedFields?: string[];
}
```

## Usage Examples

### Basic Filtering

Simple query with a single filter condition.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  }
});

console.log(`Found ${records.items.length} active records`);
```

### Multiple Filters with AND Operator

Combine multiple filters with AND logic.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    logicalOperator: FilterLogicalOperator.AND,
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' },
      { fieldName: 'age', operator: '>=', value: 18 },
      { fieldName: 'createdTime', operator: '>=', value: '2024-01-01' }
    ]
  }
});
```

### Multiple Filters with OR Operator

Combine multiple filters with OR logic.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    logicalOperator: FilterLogicalOperator.OR,
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' },
      { fieldName: 'status', operator: '=', value: 'Pending' }
    ]
  }
});
```

### Complex Nested Filters

Create complex filter logic with nested groups.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
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
      },
      {
        logicalOperator: FilterLogicalOperator.AND,
        queryFilters: [
          { fieldName: 'createdTime', operator: '>=', value: '2024-01-01' },
          { fieldName: 'createdTime', operator: '<=', value: '2024-12-31' }
        ]
      }
    ]
  }
});
```

This query translates to:
```
status = 'Active' AND (age >= 18 OR isVerified = true) AND (createdTime >= '2024-01-01' AND createdTime <= '2024-12-31')
```

### Sorting

Sort results by one or more fields.

```typescript
// Single field sort
const records = await sdk.entities.queryRecords(entityId, {
  sortOptions: [
    { fieldName: 'createdTime', isDescending: true }
  ]
});

// Multiple field sort
const records = await sdk.entities.queryRecords(entityId, {
  sortOptions: [
    { fieldName: 'status', isDescending: false },
    { fieldName: 'createdTime', isDescending: true },
    { fieldName: 'name', isDescending: false }
  ]
});
```

### Field Selection

Select only specific fields to reduce payload size.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  selectedFields: ['id', 'name', 'email', 'status'],
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  }
});
```

### Entity Expansion

Expand related entities with optional field selection.

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  expansions: [
    {
      expandedField: 'customer',
      selectedFields: ['id', 'name', 'email']
    },
    {
      expandedField: 'orders'
    }
  ],
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  }
});
```

### Pagination

#### Page Size Only (First Page)

```typescript
const paginatedResponse = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  pageSize: 50
});

console.log(`Page 1: ${paginatedResponse.items.length} items`);
console.log(`Total: ${paginatedResponse.totalCount} items`);
console.log(`Has more: ${paginatedResponse.hasNextPage}`);
```

#### Using Cursor for Next Page

```typescript
// First page
const firstPage = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  pageSize: 50
});

// Next page using cursor
if (firstPage.nextCursor) {
  const nextPage = await sdk.entities.queryRecords(entityId, {
    cursor: firstPage.nextCursor,
    filterGroup: {
      queryFilters: [
        { fieldName: 'status', operator: '=', value: 'Active' }
      ]
    }
  });
}
```

#### Jump to Specific Page

```typescript
const page3 = await sdk.entities.queryRecords(entityId, {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  jumpToPage: 3,
  pageSize: 50
});
```

### Complete Example: Advanced Query

Combining all features in a single query.

```typescript
const results = await sdk.entities.queryRecords(entityId, {
  // Select specific fields
  selectedFields: ['id', 'name', 'email', 'status', 'createdTime'],
  
  // Complex filtering
  filterGroup: {
    logicalOperator: FilterLogicalOperator.AND,
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' },
      { fieldName: 'createdTime', operator: '>=', value: '2024-01-01' }
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
  },
  
  // Sorting
  sortOptions: [
    { fieldName: 'createdTime', isDescending: true },
    { fieldName: 'name', isDescending: false }
  ],
  
  // Entity expansion
  expansions: [
    {
      expandedField: 'customer',
      selectedFields: ['id', 'name']
    }
  ],
  
  // Pagination
  pageSize: 50
});

console.log(`Found ${results.totalCount} total records`);
console.log(`Current page: ${results.currentPage}`);
console.log(`Items in this page: ${results.items.length}`);
```

### Using Entity Methods

Query directly from an entity instance.

```typescript
// Get entity with methods
const entity = await sdk.entities.getById(entityId);

// Query using entity method
const results = await entity.query({
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  sortOptions: [
    { fieldName: 'createdTime', isDescending: true }
  ],
  pageSize: 50
});
```

## Filter Operators Reference

### Equality Operators

- `=` - Equal to
- `!=` - Not equal to

### Comparison Operators

- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal to
- `<=` - Less than or equal to

### String Operators

- `contains` - String contains substring
- `not contains` - String does not contain substring
- `startswith` - String starts with substring
- `endswith` - String ends with substring

### Collection Operators

- `in` - Value is in the list
- `not in` - Value is not in the list

### Examples

```typescript
// String contains
{ fieldName: 'name', operator: 'contains', value: 'John' }

// String starts with
{ fieldName: 'email', operator: 'startswith', value: 'admin@' }

// In list
{ fieldName: 'status', operator: 'in', value: ['Active', 'Pending', 'Review'] }

// Not in list
{ fieldName: 'category', operator: 'not in', value: ['Archived', 'Deleted'] }

// Date comparison
{ fieldName: 'createdTime', operator: '>=', value: '2024-01-01T00:00:00Z' }

// Numeric comparison
{ fieldName: 'price', operator: '>', value: 100 }
```

## Response Types

### PaginatedResponse

Returned when pagination options are provided.

```typescript
interface PaginatedResponse<T> {
  /** The items in the current page */
  items: T[];
  
  /** Total count of items across all pages (if available) */
  totalCount?: number;
  
  /** Whether more pages are available */
  hasNextPage: boolean;
  
  /** Cursor to fetch the next page (if available) */
  nextCursor?: PaginationCursor;
  
  /** Cursor to fetch the previous page (if available) */
  previousCursor?: PaginationCursor;
  
  /** Current page number (1-based, if available) */
  currentPage?: number;
  
  /** Total number of pages (if available) */
  totalPages?: number;
  
  /** Whether this pagination type supports jumping to arbitrary pages */
  supportsPageJump: boolean;
}
```

### NonPaginatedResponse

Returned when no pagination options are provided.

```typescript
interface NonPaginatedResponse<T> {
  items: T[];
  totalCount?: number;
}
```

## Best Practices

### 1. Use Field Selection for Large Entities

When working with entities that have many fields, select only the fields you need to reduce payload size and improve performance.

```typescript
// Good: Select only needed fields
const records = await sdk.entities.queryRecords(entityId, {
  selectedFields: ['id', 'name', 'status'],
  filterGroup: { /* ... */ }
});

// Avoid: Fetching all fields unnecessarily
const records = await sdk.entities.queryRecords(entityId, {
  filterGroup: { /* ... */ }
});
```

### 2. Use Pagination for Large Result Sets

Always use pagination when querying potentially large datasets to avoid memory issues and improve response times.

```typescript
// Good: Use pagination
const results = await sdk.entities.queryRecords(entityId, {
  filterGroup: { /* ... */ },
  pageSize: 50
});

// Avoid: Fetching all records at once
const results = await sdk.entities.queryRecords(entityId, {
  filterGroup: { /* ... */ }
});
```

### 3. Optimize Filter Groups

Structure filter groups efficiently to improve query performance.

```typescript
// Good: Simple filters first
filterGroup: {
  logicalOperator: FilterLogicalOperator.AND,
  queryFilters: [
    { fieldName: 'status', operator: '=', value: 'Active' },
    { fieldName: 'createdTime', operator: '>=', value: '2024-01-01' }
  ]
}

// Avoid: Overly complex nested structures when simple filters suffice
```

### 4. Use Indexed Fields for Filtering

Filter on indexed fields (like primary keys, foreign keys, or commonly queried fields) for better performance.

### 5. Combine Filtering and Sorting

When possible, combine filtering and sorting in a single query rather than filtering first and sorting in memory.

```typescript
// Good: Server-side filtering and sorting
const results = await sdk.entities.queryRecords(entityId, {
  filterGroup: { /* ... */ },
  sortOptions: [{ fieldName: 'createdTime', isDescending: true }]
});
```

### 6. Handle Pagination Cursors Properly

When using cursor-based pagination, always preserve the filter and sort options when fetching the next page.

```typescript
// Store query options
const queryOptions = {
  filterGroup: {
    queryFilters: [
      { fieldName: 'status', operator: '=', value: 'Active' }
    ]
  },
  sortOptions: [
    { fieldName: 'createdTime', isDescending: true }
  ],
  pageSize: 50
};

// First page
const firstPage = await sdk.entities.queryRecords(entityId, queryOptions);

// Next page - preserve all options except cursor
if (firstPage.nextCursor) {
  const nextPage = await sdk.entities.queryRecords(entityId, {
    ...queryOptions,
    cursor: firstPage.nextCursor
  });
}
```

## Common Use Cases

### Use Case 1: Search with Multiple Criteria

```typescript
async function searchCustomers(
  entityId: string,
  searchTerm?: string,
  minAge?: number,
  status?: string
) {
  const queryFilters: QueryFilter[] = [];
  
  if (searchTerm) {
    queryFilters.push({
      fieldName: 'name',
      operator: 'contains',
      value: searchTerm
    });
  }
  
  if (minAge) {
    queryFilters.push({
      fieldName: 'age',
      operator: '>=',
      value: minAge
    });
  }
  
  if (status) {
    queryFilters.push({
      fieldName: 'status',
      operator: '=',
      value: status
    });
  }
  
  return await sdk.entities.queryRecords(entityId, {
    filterGroup: {
      logicalOperator: FilterLogicalOperator.AND,
      queryFilters
    },
    sortOptions: [
      { fieldName: 'name', isDescending: false }
    ],
    pageSize: 50
  });
}
```

### Use Case 2: Date Range Query

```typescript
async function getRecordsInDateRange(
  entityId: string,
  startDate: string,
  endDate: string
) {
  return await sdk.entities.queryRecords(entityId, {
    filterGroup: {
      logicalOperator: FilterLogicalOperator.AND,
      queryFilters: [
        { fieldName: 'createdTime', operator: '>=', value: startDate },
        { fieldName: 'createdTime', operator: '<=', value: endDate }
      ]
    },
    sortOptions: [
      { fieldName: 'createdTime', isDescending: true }
    ],
    pageSize: 100
  });
}
```

### Use Case 3: Status-Based Filtering with Exclusions

```typescript
async function getActiveRecordsExcludingArchived(entityId: string) {
  return await sdk.entities.queryRecords(entityId, {
    filterGroup: {
      logicalOperator: FilterLogicalOperator.AND,
      queryFilters: [
        { fieldName: 'status', operator: '=', value: 'Active' },
        { fieldName: 'status', operator: '!=', value: 'Archived' }
      ]
    }
  });
}
```

### Use Case 4: Complex Multi-Condition Query

```typescript
async function getHighPriorityActiveItems(entityId: string) {
  return await sdk.entities.queryRecords(entityId, {
    filterGroup: {
      logicalOperator: FilterLogicalOperator.AND,
      queryFilters: [
        { fieldName: 'status', operator: '=', value: 'Active' }
      ],
      filterGroups: [
        {
          logicalOperator: FilterLogicalOperator.OR,
          queryFilters: [
            { fieldName: 'priority', operator: '=', value: 'High' },
            { fieldName: 'isUrgent', operator: '=', value: true }
          ]
        }
      ]
    },
    sortOptions: [
      { fieldName: 'priority', isDescending: false },
      { fieldName: 'createdTime', isDescending: true }
    ],
    selectedFields: ['id', 'title', 'priority', 'status', 'createdTime'],
    pageSize: 50
  });
}
```

## Error Handling

The query API may throw errors in various scenarios:

```typescript
try {
  const results = await sdk.entities.queryRecords(entityId, {
    filterGroup: {
      queryFilters: [
        { fieldName: 'status', operator: '=', value: 'Active' }
      ]
    }
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Query failed:', error.message);
    // Handle specific error types
  }
}
```

Common error scenarios:
- Invalid entity ID
- Invalid field names in filters or sorting
- Invalid filter operators
- Invalid pagination cursor
- Network errors

## Performance Considerations

1. **Index Usage**: Ensure fields used in filters and sorting are indexed for optimal performance
2. **Result Set Size**: Use pagination to limit result set size
3. **Field Selection**: Select only needed fields to reduce payload size
4. **Filter Complexity**: Simpler filters generally perform better than complex nested structures
5. **Expansion**: Limit entity expansions as they can significantly increase response size

## Migration from `getRecordsById`

If you're currently using `getRecordsById`, you can migrate to `queryRecords` for more advanced querying:

### Before (getRecordsById)

```typescript
const records = await sdk.entities.getRecordsById(entityId, {
  expansionLevel: 1,
  pageSize: 50
});
```

### After (queryRecords)

```typescript
const records = await sdk.entities.queryRecords(entityId, {
  expansions: [
    { expandedField: 'relatedEntity' }
  ],
  pageSize: 50
});
```

The `queryRecords` method provides more granular control over expansions and supports advanced filtering and sorting that `getRecordsById` does not support.

## API Endpoint

The query API uses the following endpoint:

```
POST datafabric_/api/EntityService/entity/{entityId}/query_expansion
```

The request body contains the `EntityQuery` object with all query parameters.

## Related Documentation

- [Entity Service Overview](./entities.md)
- [Pagination Guide](./pagination.md)
- [Data Fabric Guide](https://docs.uipath.com/data-service/automation-cloud/latest/user-guide/introduction)

