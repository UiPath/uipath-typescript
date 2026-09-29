# DataTable

Package: `@uipath/ui-widgets-datatable`

A powerful and flexible React datatable component built with ag-Grid, designed for UiPath entity management.

## Features

- CRUD Operations: Full support for Create, Read, Update, Delete operations
- Master-Detail View: Group data by foreign key relationships
- Inline Editing: Edit cells directly with support for different field types
- Choice Set Support: Single and multi-select choice set fields
- Foreign Key Display: Resolved display names for reference fields
- Filtering & Sorting: Built-in filtering and sorting capabilities
- Pagination: Efficient data pagination via ag-Grid
- Diff Viewer: Review changes before committing
- Customizable: Flexible column configuration and styling

## Installation

```
npm install @uipath/ui-widgets-datatable
```

## Peer Dependencies

This package requires the following peer dependencies:

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.3.10
```

## Usage

Note

Add either `light` or `dark` class to your HTML `<body>` element to enable proper theming.

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

## Props

| Prop                          | Type                     | Required | Default | Description                                                   |
| ----------------------------- | ------------------------ | -------- | ------- | ------------------------------------------------------------- |
| `sdk`                         | `UiPath`                 | Yes      | -       | UiPath SDK instance                                           |
| `entityId`                    | `string`                 | Yes      | -       | The UUID of the Data Fabric entity to display                 |
| `pageSize`                    | `number`                 | No       | `50`    | Number of rows per page                                       |
| `showIdColumn`                | `boolean`                | No       | -       | Whether to show the Id column in the grid                     |
| `columnConfig`                | `Record<string, ColDef>` | No       | -       | Column configuration overrides keyed by display name          |
| `rowClassRules`               | `RowClassRules`          | No       | -       | ag-Grid row class rules for conditional row styling           |
| `customPaddingForExpandedRow` | `number`                 | No       | -       | Custom padding (in pixels) for expanded rows in group-by mode |

## Features in Detail

### CRUD Operations

#### Create

- Click "Add Row" to add a new row
- Fill in the data
- Click "Insert Records" to save

#### Read

- Data is automatically loaded on mount
- Click "Refresh" to reload data

#### Update

- Click any cell to edit (when not in master-detail mode)
- Changes are tracked automatically
- Click "Show Diff" to review changes
- Click "Commit Changes" to save

#### Delete

- Select rows using checkboxes
- Click "Delete Records"
- Confirm deletion

### Master-Detail View

Group records by foreign key relationships:

1. Select a groupable column from the "Group by" dropdown
1. Click the expand button to view related records
1. Related records are displayed in a nested grid

### Field Types

The datatable automatically handles different field types:

- **Text**: Standard text input
- **Multiline Text**: Textarea editor with Shift+Enter for new lines
- **Number**: Numeric input (Integer, Decimal, Float, Double, Big Integer)
- **Date**: Date picker
- **DateTime**: Date-time display (read-only)
- **Boolean**: Yes/No/None select
- **Choice Set (Single)**: Dropdown with choice set values
- **Choice Set (Multiple)**: Multi-select with choice set values
- **Foreign Key**: Dropdown with reference entity records
- **File**: File upload, download, and removal

### Custom Column Configuration

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

### Custom Row Styling

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

The component comes with default styles. Import the CSS file in your application:

```
import "@uipath/ui-widgets-datatable/DataTable.css";
```

The interface supports both light and dark themes through the UiPath Apollo design system.

## Development

### Running Tests

```
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Building

```
npm run build
```

## TypeScript Support

This package is written in TypeScript and includes type definitions. Import types as needed:

```
import type { DataTableProps } from "@uipath/ui-widgets-datatable";
```

## License

MIT
