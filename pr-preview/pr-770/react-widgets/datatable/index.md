# DataTable

A powerful and flexible React datatable built with ag-Grid, designed for managing [Data Fabric entity](../../api/interfaces/entity/) records.

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

```
npm install @uipath/ui-widgets-datatable
```

### Peer dependencies

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.4.1
```

## Usage

Theming

Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```
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
        clientId: "your-client-id",
        redirectUri: "http://localhost:3000/callback",
        scope: "DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write",
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

Finding the entity ID

`entityId` is the UUID of a Data Fabric entity. List the ones available to you with the Entities service — see the [Entity service reference](../../api/interfaces/entity/):

```
import { Entities } from "@uipath/uipath-typescript/entities";

const entities = await new Entities(sdk).getAll();
```

## Props

| Prop                          | Type                     | Required | Default | Description                                                   |
| ----------------------------- | ------------------------ | -------- | ------- | ------------------------------------------------------------- |
| `sdk`                         | `UiPath`                 | Yes      | —       | UiPath SDK instance                                           |
| `entityId`                    | `string`                 | Yes      | —       | The UUID of the Data Fabric entity to display                 |
| `pageSize`                    | `number`                 | No       | `50`    | Number of rows per page                                       |
| `showIdColumn`                | `boolean`                | No       | —       | Whether to show the Id column in the grid                     |
| `columnConfig`                | `Record<string, ColDef>` | No       | —       | Column configuration overrides, keyed by display name         |
| `rowClassRules`               | `RowClassRules`          | No       | —       | ag-Grid row class rules for conditional row styling           |
| `customPaddingForExpandedRow` | `number`                 | No       | —       | Custom padding (in pixels) for expanded rows in group-by mode |

## Features in detail

### CRUD operations

1. Click **Add Row** to add a new row
1. Fill in the data
1. Click **Insert Records** to save

Data is loaded automatically on mount. Click **Refresh** to reload.

1. Click any cell to edit (when not in master-detail mode)

1. Changes are tracked automatically

1. Click **Show Diff** to review changes

1. Click **Commit Changes** to save

1. Select rows using the checkboxes

1. Click **Delete Records**

1. Confirm the deletion

### Master-detail view

Group records by foreign key relationships:

1. Select a groupable column from the **Group by** dropdown
1. Click the expand button to view related records
1. Related records are displayed in a nested grid

### Field types

The datatable handles each entity field type automatically:

| Field type            | Editor                                                       |
| --------------------- | ------------------------------------------------------------ |
| Text                  | Standard text input                                          |
| Multiline Text        | Textarea editor, `Shift+Enter` for a new line                |
| Number                | Numeric input (Integer, Decimal, Float, Double, Big Integer) |
| Date                  | Date picker                                                  |
| DateTime              | Date-time display (read-only)                                |
| Boolean               | Yes / No / None select                                       |
| Choice Set (single)   | Dropdown with choice set values                              |
| Choice Set (multiple) | Multi-select with choice set values                          |
| Foreign Key           | Dropdown with reference entity records                       |
| File                  | File upload, download and removal                            |

### Custom column configuration

```
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

```
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

```
import "@uipath/ui-widgets-datatable/DataTable.css";
```

Both light and dark themes are supported through the UiPath Apollo design system.

## TypeScript

```
import type { DataTableProps } from "@uipath/ui-widgets-datatable";
```
