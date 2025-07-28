# UiPath TypeScript SDK

A comprehensive TypeScript SDK for interacting with the UiPath Platform services.

## Installation

```bash
npm install @uipath/sdk
# or
yarn add @uipath/sdk
```

## Quick Start

```typescript
import { UiPath } from '@uipath/sdk';

// Initialize the SDK
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret'
});

// Use the services
const processes = await sdk.maestroProcess.getAll();
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
  secret: 'your-secret'
});
```

### 2. OAuth Authentication
```typescript
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'your-client-secret'
});
```

## Available Services

The SDK provides access to the following services through a consistent API:

- `sdk.maestroProcess` - Manage automation processes
- `sdk.processInstance` - Manage process executions
- `sdk.task` - Create and manage tasks
- `sdk.entity` - Data Fabric entity operations
- `sdk.case` - Business case management

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
const processes = await sdk.maestroProcess.getAll();

// Get a specific task
const task = await sdk.task.getById('task-id');

// Create a new entity
const entity = await sdk.entity.create({...});
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
  CaseResponse
} from '@uipath/sdk';

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
  secret?: string;        // Secret for authentication
  clientId?: string;      // OAuth client ID
  clientSecret?: string;  // OAuth client secret
  timeout?: number;       // Request timeout in milliseconds
  retryConfig?: {         // Retry configuration
    retries: number;
    retryDelay: number;
  };
}
```

## Error Handling

The SDK provides typed errors for better error handling:

```typescript
try {
  const process = await sdk.maestroProcess.getById('invalid-id');
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