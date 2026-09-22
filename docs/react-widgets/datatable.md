# DataTable

A powerful and flexible React datatable built with ag-Grid, designed for managing [Data Fabric entity](../api/interfaces/entity/index.md) records.

Package: `@uipath/ui-widgets-datatable`

## Features

- **CRUD operations** — create, read, update and delete records
- **Master-detail view** — group data by foreign key relationships
- **Inline editing** — edit cells directly, with an editor per field type
- **Choice set support** — single and multi-select choice set fields
- **Foreign key display** — resolved display names for reference fields
- **Filtering & sorting** — built in
- **Pagination** — efficient paging via ag-Grid
- **Diff viewer** — review changes before committing
- **Customizable** — flexible column configuration and styling

## Installation

```bash
npm install @uipath/ui-widgets-datatable
```

### Peer dependencies

```bash
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.3.10
```

## Usage

!!! note "Theming"
    Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```tsx
import { DataTable } from "@uipath/ui-widgets-datatable";
import "@uipath/ui-widgets-datatable/DataTable.css";
import { UiPath } from "@uipath/uipath-typescript/core";
import { useEffect, useState } from "react";

function App() {
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const init = async () => {
      const uipath = new UiPath({
        baseUrl: "https://cloud.uipath.com",
        orgName: "your-org",
        tenantName: "your-tenant",
        secret: "your-secret",
      });
      await uipath.initialize();
      setSdk(uipath);
    };
    init();
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return (
    <DataTable
      sdk={sdk}
      entityId="your-entity-id"
      pageSize={50}
      showIdColumn={true}
    />
  );
}
```

!!! tip "Finding the entity ID"
    `entityId` is the UUID of a Data Fabric entity. List the entities available to you with `sdk.entities.getAll()` — see the [Entity service reference](../api/interfaces/entity/index.md).

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `sdk` | `UiPath` | Yes | — | UiPath SDK instance |
| `entityId` | `string` | Yes | — | The UUID of the Data Fabric entity to display |
| `pageSize` | `number` | No | `50` | Number of rows per page |
| `showIdColumn` | `boolean` | No | — | Whether to show the Id column in the grid |
| `columnConfig` | `Record<string, ColDef>` | No | — | Column configuration overrides, keyed by display name |
| `rowClassRules` | `RowClassRules` | No | — | ag-Grid row class rules for conditional row styling |
| `customPaddingForExpandedRow` | `number` | No | — | Custom padding (in pixels) for expanded rows in group-by mode |

## Features in detail

### CRUD operations

=== "Create"

    1. Click **Add Row** to add a new row
    2. Fill in the data
    3. Click **Insert Records** to save

=== "Read"

    Data is loaded automatically on mount. Click **Refresh** to reload.

=== "Update"

    1. Click any cell to edit (when not in master-detail mode)
    2. Changes are tracked automatically
    3. Click **Show Diff** to review changes
    4. Click **Commit Changes** to save

=== "Delete"

    1. Select rows using the checkboxes
    2. Click **Delete Records**
    3. Confirm the deletion

### Master-detail view

Group records by foreign key relationships:

1. Select a groupable column from the **Group by** dropdown
2. Click the expand button to view related records
3. Related records are displayed in a nested grid

### Field types

The datatable handles each entity field type automatically:

| Field type | Editor |
| ---------- | ------ |
| Text | Standard text input |
| Multiline Text | Textarea editor, `Shift+Enter` for a new line |
| Number | Numeric input (Integer, Decimal, Float, Double, Big Integer) |
| Date | Date picker |
| DateTime | Date-time display (read-only) |
| Boolean | Yes / No / None select |
| Choice Set (single) | Dropdown with choice set values |
| Choice Set (multiple) | Multi-select with choice set values |
| Foreign Key | Dropdown with reference entity records |
| File | File upload, download and removal |

### Custom column configuration

```tsx
<DataTable
  sdk={sdk}
  entityId="entity-id"
  columnConfig={{
    "Column Name": {
      width: 200,
      editable: false,
      cellStyle: { color: "blue" },
    },
  }}
/>
```

### Custom row styling

```tsx
<DataTable
  sdk={sdk}
  entityId="entity-id"
  rowClassRules={{
    "row-highlight": (params) => params.data.status === "Active",
    "row-disabled": (params) => params.data.status === "Inactive",
  }}
/>
```

## Styling

The component ships default styles. Import the stylesheet once in your application:

```tsx
import "@uipath/ui-widgets-datatable/DataTable.css";
```

Both light and dark themes are supported through the UiPath Apollo design system.

## TypeScript

```tsx
import type { DataTableProps } from "@uipath/ui-widgets-datatable";
```
