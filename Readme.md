# UiPath TypeScript SDK

A comprehensive TypeScript SDK for interacting with the UiPath Platform services.

## Installation

```bash
npm install @uipath/uipath-typescript
# or
yarn add @uipath/uipath-typescript
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
const tasks = await sdk.task.getAll();
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
const tasks = await sdk.task.getAll();
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
  const tasks = await sdk.task.getAll();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

## Available Services

The SDK provides access to the following services through a consistent API:

- `sdk.maestro.processes` - Manage agentic maestro processes
- `sdk.maestro.processes.instances` - Manage maestro process executions
- `sdk.task` - Create and manage tasks
- `sdk.entity` - Data Fabric entity operations
- `sdk.process` - Manage Orchestrator processes
- `sdk.bucket` - Manage storage buckets in Orchestrator
- `sdk.queue` - Manage Orchestrator queues
- `sdk.asset` - Manage Orchestrator assets

### Consistent Method Naming

All services follow a consistent method naming pattern:
- `getAll()` - Retrieve all resources
- `getById(id)` - Get a specific resource
- `create()` - Create a new resource
- `update()` - Update an existing resource
- `delete()` - Delete a resource

Example usage:
```typescript
// Get all processes
const bpmnProcesses = await sdk.maestro.process.getAll();

// Get a specific task
const task = await sdk.task.getById('task-id');

// Create a new entity
const entity = await sdk.entity.create({...});

// Get all buckets 
const buckets = await sdk.bucket.getAll();

// Get a specific process and start it
const process = await sdk.process.getAll({ 
  filter: "name eq 'MyProcess'" 
});
const job = await sdk.process.start({
  processKey: process[0].key
}, 'folder-id');

// Get all queues
const queues = await sdk.queue.getAll();

// Get all assets
const assets = await sdk.asset.getAll();
//Get assets in a folder
const assets = await sdk.asset.getAll({folderId: 'folder-id'});
```

## TypeScript Support

The SDK is fully typed and exports all request and response types for better developer experience and LLM-friendly coding:

```typescript
import { 
  UiPath,
  // Request types
  CreateTaskRequest,
  UpdateProcessRequest,
  CreateEntityRequest,
  
  // Response types
  TaskResponse,
  ProcessResponse,
  EntityResponse,
  ProcessInstanceResponse,
  ProcessStartResponse,
  BucketGetResponse,
} from '@uipath/uipath-typescript';

// TypeScript will provide full intellisense
const createTaskRequest: CreateTaskRequest = {
  title: 'Review Document',
  priority: 'High',
  assigneeId: 'user-id'
};

const task: TaskResponse = await sdk.task.create(createTaskRequest);
```

## Development

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Test
```bash
npm test        # Unit tests
npm run test:e2e # End-to-end tests
```

### Generate Documentation
```bash
npm run docs
```

## Configuration

The SDK can be configured with the following options:

```typescript
interface UiPathConfig {
  baseUrl: string;        // UiPath platform URL
  orgName: string;        // Organization name
  tenantName: string;     // Tenant name
  
  // Authentication options (choose one):
  // Option 1: Secret-based authentication
  secret?: string;        // Secret for authentication (PAT Token or Bearer Token)
  
  // Option 2: OAuth authentication (all three required together)
  clientId?: string;      // OAuth client ID (required with redirectUri and scope)
  redirectUri?: string;   // OAuth redirect URI (required with clientId and scope)
  scope?: string;         // OAuth scopes (required with clientId and redirectUri)
}
```

## Error Handling

The SDK provides typed errors for better error handling:

```typescript
try {
  const process = await sdk.maestro.process.getById('invalid-id');
} catch (error) {
  if (error.code === 'PROCESS_NOT_FOUND') {
    console.error('Process not found');
  }
}
```

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]