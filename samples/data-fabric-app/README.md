# Data Fabric

A sample React application demonstrating all Data Fabric entity endpoints from the UiPath TypeScript SDK.

## Features

This app showcases all available Data Fabric entity operations:

### Entities Tab
- **getAll()** - List all entities in your Data Fabric
- **getById()** - View detailed entity metadata including fields, types, and relationships
- Field details modal with type constraints and references

### Records Tab
- **getRecordsById()** - Browse entity records with pagination
- Configurable page size and expansion level
- **downloadAttachment()** - Download file attachments from records
- View record details in modal

### Operations Tab
- **insertById()** - Insert a single record (triggers Data Fabric events)
- **batchInsertById()** - Batch insert multiple records
- **updateById()** - Update existing records by ID
- **deleteById()** - Delete records by their IDs
- Operation history with success/failure tracking
- Field reference table for selected entity

### Choice Sets Tab
- **choicesets.getAll()** - List all choice sets
- **choicesets.getById()** - View choice set values with pagination

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your UiPath OAuth credentials in `.env`:
   ```env
   VITE_UIPATH_CLIENT_ID=your-oauth-client-id
   VITE_UIPATH_ORG_NAME=your-organization-name
   VITE_UIPATH_TENANT_NAME=your-tenant-name
   VITE_UIPATH_REDIRECT_URI=http://localhost:5173
   VITE_UIPATH_SCOPE=DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write offline_access
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## OAuth Configuration

Before running the app, you need to configure an External Application in UiPath Cloud:

1. Go to **Admin > External Applications**
2. Create a new application with:
   - **Application Type**: Web Application
   - **Redirect URL**: `http://localhost:5173`
   - **Scopes**: Enable the following Data Fabric scopes:
     - `DataFabric.Schema.Read`
     - `DataFabric.Data.Read`
     - `DataFabric.Data.Write`

## SDK Endpoints Demonstrated

| Endpoint | Description | Location |
|----------|-------------|----------|
| `sdk.entities.getAll()` | List all entities | EntityList.tsx |
| `sdk.entities.getById(id)` | Get entity metadata | EntityDetails.tsx |
| `sdk.entities.getRecordsById(id, options)` | Get entity records | RecordsList.tsx |
| `sdk.entities.insertById(id, data, options)` | Insert single record | RecordOperations.tsx |
| `sdk.entities.batchInsertById(id, data, options)` | Batch insert records | RecordOperations.tsx |
| `sdk.entities.updateById(id, data, options)` | Update records | RecordOperations.tsx |
| `sdk.entities.deleteById(id, recordIds, options)` | Delete records | RecordOperations.tsx |
| `sdk.entities.downloadAttachment(options)` | Download file attachment | RecordsList.tsx, App.tsx |
| `sdk.entities.choicesets.getAll()` | List all choice sets | ChoiceSets.tsx |
| `sdk.entities.choicesets.getById(id, options)` | Get choice set values | ChoiceSets.tsx |

## Entity Methods

When you retrieve an entity with `getById()` or `getAll()`, the returned entity object includes convenience methods:

```typescript
const entity = await sdk.entities.getById(entityId);

// Direct method calls on entity
const records = await entity.getRecords({ pageSize: 50 });
const inserted = await entity.insert({ name: "John", age: 30 });
const batchResult = await entity.batchInsert([...]);
const updated = await entity.update([{ Id: "...", name: "Updated" }]);
const deleted = await entity.delete(["record-id-1", "record-id-2"]);
const blob = await entity.downloadAttachment(recordId, fieldName);
```

## Technologies

- React 19
- TypeScript 5.8
- Vite 7
- Tailwind CSS 3
- @uipath/uipath-typescript SDK

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```
