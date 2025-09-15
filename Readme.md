# UiPath TypeScript SDK

[View Full API Reference ↗](https://uipath.github.io/uipath-typescript/getting-started/)

A comprehensive TypeScript SDK for interacting with UiPath Platform services.

## Installation

```bash
npm install @uipath/uipath-typescript
# or
yarn add @uipath/uipath-typescript
# or
pnpm add @uipath/uipath-typescript
```


## Quick Start

```typescript
import { UiPath } from '@uipath/uipath-typescript';

// Initialize the SDK
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token 
});

// Use the services
const processes = await sdk.maestro.processes.getAll();
const tasks = await sdk.tasks.getAll();
```

## Authentication

The SDK supports two authentication methods:

### 1. Secret-based Authentication
```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token 
});
```

For OAuth, first create a non confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications) with the required scopes and provide the clientId, redirectUri, and scope here.

### 2. OAuth Authentication
```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
  scope: 'your-scopes'
});

// IMPORTANT: OAuth requires calling initialize()
await sdk.initialize();
```

## SDK Initialization - The initialize() Method

### When to Use initialize()

The `initialize()` method completes the authentication process for the SDK:

- **Secret Authentication**: Auto-initializes when creating the SDK instance - **no need to call initialize()**
- **OAuth Authentication**: **MUST call** `await sdk.initialize()` before using any SDK services

### Example: Secret Authentication (Auto-initialized)
```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token 
});

// Ready to use immediately - no initialize() needed
const tasks = await sdk.tasks.getAll();
```

### Example: OAuth Authentication (Requires initialize)
```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000',
  scope: 'your-scopes'
});

// Must initialize before using services
try {
  await sdk.initialize();
  console.log('SDK initialized successfully');
  
  // Now you can use the SDK
  const tasks = await sdk.tasks.getAll();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

## Available Services

The SDK provides access to the following services through a consistent API:

- `sdk.maestro.processes` - Manage agentic maestro processes
- `sdk.maestro.processes.instances` - Manage maestro process executions
- `sdk.tasks` - Create and manage tasks
- `sdk.entities` - Data Fabric entity operations
- `sdk.processes` - Manage Orchestrator processes
- `sdk.buckets` - Manage storage buckets in Orchestrator
- `sdk.queues` - Manage Orchestrator queues
- `sdk.assets` - Manage Orchestrator assets


**Example usage**:
```typescript
// Get all processes
const bpmnProcesses = await sdk.maestro.processes.getAll();

// Get a specific task
const task = await sdk.tasks.getById('task-id');

// Create a new entity
const entity = await sdk.entities.create({...});

// Get all buckets 
const buckets = await sdk.buckets.getAll();

// Get a specific process and start it
const process = await sdk.processes.getAll({ 
  filter: "name eq 'MyProcess'" 
});
const job = await sdk.processes.start({
  processKey: process[0].key
}, 'folder-id');

// Get all queues
const queues = await sdk.queues.getAll();

// Get all assets
const assets = await sdk.assets.getAll();
//Get assets in a folder
const assets = await sdk.assets.getAll({folderId: 'folder-id'});
```

## TypeScript Support

The SDK is fully typed and exports all types for better developer experience and LLM-friendly coding:

```typescript
import { 
  UiPath,
  // Task types
  TaskCreateOptions,
  TaskPriority,
  TaskStatus,
  
  // Process types  
  ProcessStartRequest,
  ProcessStartResponse,
  ProcessGetResponse,
  
  // Entity types
  EntityGetResponse,
  EntityInsertOptions,
  
  // Asset/Queue/Bucket types
  AssetGetResponse,
  QueueGetResponse,
  BucketGetResponse,
  
  // Maestro types
  ProcessInstanceGetResponse,
  MaestroProcessGetAllResponse
} from '@uipath/uipath-typescript';

// TypeScript will provide full intellisense
const taskOptions: TaskCreateOptions = {
  title: 'Review Document',
  priority: TaskPriority.High
};

const task = await sdk.tasks.create(taskOptions);
```

## Error Handling

The SDK provides comprehensive error handling with typed errors:

```typescript
import { UiPathError } from '@uipath/uipath-typescript';

try {
  const process = await sdk.maestro.processes.getById('invalid-id');
} catch (error) {
  if (error instanceof UiPathError) {
    // Access common error properties
    console.log('Error Type:', error.type);
    console.log('Message:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Request ID:', error.requestId);
    console.log('Timestamp:', error.timestamp);
    console.log('error stack trace:', error.stack);

    // Get detailed debug information including stack trace
    const debugInfo = error.getDebugInfo();
  }
}
```

## Pagination

The SDK provides built-in pagination support:

### Cursor-based Navigation

```typescript
// Navigate through pages using cursors
let currentPage = await sdk.assets.getAll({ pageSize: 10 }) as PaginatedResponse<AssetGetResponse>;

while (currentPage.hasNextPage) {
  // Process current page items
  currentPage.items.forEach(item => console.log(item.name));
  
  // Get next page using cursor
    currentPage = await sdk.assets.getAll({ 
    cursor: currentPage.nextCursor 
  }) as PaginatedResponse<AssetGetResponse>;
}
```

### Page Jumping

```typescript
// Jump directly to page 5 (when supported)
const page5 = await sdk.assets.getAll({
  jumpToPage: 5,
  pageSize: 20
});

// Check if page jumping is supported
if (page5.supportsPageJump) {
  console.log(`Currently on page ${page5.currentPage} of ${page5.totalPages}`);
}
```

## Development

Before submitting a pull request, please review our [Contribution Guidelines](https://uipath.github.io/uipath-typescript/CONTRIBUTING/).
