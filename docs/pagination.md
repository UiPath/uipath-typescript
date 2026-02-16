# Pagination

## Overview

The SDK supports two pagination approaches:

1. **Cursor-based Navigation**: Use opaque cursors to navigate between pages
2. **Page Jump**: Jump directly to specific page numbers (when supported) [↗ Refer to the Quick Reference Table](#quick-reference-table)

You can specify either cursor OR jumpToPage, but **not** both.

All paginated methods return a [`PaginatedResponse<T>`](/uipath-typescript/api/interfaces/PaginatedResponse) when pagination parameters are provided, or a [`NonPaginatedResponse<T>`](/uipath-typescript/api/interfaces/NonPaginatedResponse) when no pagination parameters are specified.

## Types

### [PaginationOptions](/uipath-typescript/api/type-aliases/PaginationOptions)

```typescript
type PaginationOptions = {
  pageSize?: number;      // Size of the page to fetch (items per page)
  cursor?: string;        // Opaque string containing all information needed to fetch next page
  jumpToPage?: number;    // Direct page number navigation
}
```

### [PaginatedResponse](/uipath-typescript/api/interfaces/PaginatedResponse)

```typescript
interface PaginatedResponse<T> {
  items: T[];                           // The items in the current page
  totalCount?: number;                  // Total count of items across all pages (if available)
  hasNextPage: boolean;                 // Whether more pages are available
  nextCursor?: PaginationCursor;        // Cursor to fetch the next page (if available)
  previousCursor?: PaginationCursor;    // Cursor to fetch the previous page (if available)
  currentPage?: number;                 // Current page number (1-based, if available)
  totalPages?: number;                  // Total number of pages (if available)
  supportsPageJump: boolean;            // Whether this pagination type supports jumping to arbitrary pages
}

```

## Usage Examples

### Basic Pagination

```typescript
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);

// Get first page with 10 items
const firstPage = await assets.getAll({ pageSize: 10 });

console.log(`Got ${firstPage.items.length} items`);
console.log(`Total items: ${firstPage.totalCount}`);
console.log(`Has next page: ${firstPage.hasNextPage}`);
```

### Cursor-based Navigation

```typescript
import { Assets, AssetGetResponse } from '@uipath/uipath-typescript/assets';
import { PaginatedResponse } from '@uipath/uipath-typescript/core';

const assets = new Assets(sdk);

// Navigate through pages using cursors
let currentPage = await assets.getAll({ pageSize: 10 }) as PaginatedResponse<AssetGetResponse>;

while (currentPage.hasNextPage) {
  // Process current page items
  currentPage.items.forEach(item => console.log(item.name));

  // Get next page using cursor
  currentPage = await assets.getAll({
    cursor: currentPage.nextCursor
  }) as PaginatedResponse<AssetGetResponse>;
}
```

### Page Jumping

```typescript
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);

// Jump directly to page 5 (when supported)
const page5 = await assets.getAll({
  jumpToPage: 5,
  pageSize: 20
});

// Check if page jumping is supported
if (page5.supportsPageJump) {
  console.log(`Currently on page ${page5.currentPage} of ${page5.totalPages}`);
}
```

### Non-paginated Requests

```typescript
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);

// Get all items without pagination
const allAssets = await assets.getAll();

console.log(`Retrieved ${allAssets.items.length} assets`);
console.log(`Total count: ${allAssets.totalCount}`);
```

## Quick Reference Table

| Service | Method | Supports `jumpToPage`? |
|---------|--------|------------------------|
| Assets | `getAll()` | ✅ Yes |
| Buckets | `getAll()` | ✅ Yes |
| Buckets | `getFiles()` | ❌ No |
| Entities | `getAll()` | ✅ Yes |
| Entities | `getAllRecords()` | ✅ Yes |
| Processes | `getAll()` | ✅ Yes |
| ProcessInstances | `getAll()` | ❌ No |
| CaseInstances | `getAll()` | ❌ No |
| CaseInstances | `getActionTasks()` | ✅ Yes |
| Queues | `getAll()` | ✅ Yes |
| Tasks | `getAll()` | ✅ Yes |
| Tasks | `getUsers()` | ✅ Yes |
