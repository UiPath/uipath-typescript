<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/assets/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./docs/assets/logo-light.svg">
  <img src="./docs/assets/logo-dark.svg" alt="UiPath Logo" width="200">
</picture>




# UiPath TypeScript SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@uipath/uipath-typescript?logo=npm)](https://www.npmjs.com/package/@uipath/uipath-typescript)
[![GitHub](https://img.shields.io/github/stars/UiPath/uipath-typescript?style=social)](https://github.com/UiPath/uipath-typescript)

[Documentation](https://uipath.github.io/uipath-typescript/) • [Getting Started](#getting-started) • [Usage](#usage) • [Samples](#samples)

A comprehensive TypeScript SDK for interacting with UiPath Platform services.

</div>

<details>
<summary><strong>Table of Contents</strong></summary>

- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Authentication](#authentication)
  - [Authentication Methods](#authentication-methods)
  - [SDK Initialization](#sdk-initialization)
  - [OAuth Integration Patterns](#oauth-integration-patterns)
- [Usage](#usage)
- [Samples](#samples)
- [Development](#development)

</details>

## Overview

The **UiPath TypeScript SDK** is a comprehensive, type-safe library for interacting with UiPath Platform services. Built with modern TypeScript, it provides seamless integration for both browser and Node.js applications, enabling developers to build sophisticated automation solutions with enterprise-grade reliability.

<div align="right">

</div>

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher (or yarn/pnpm)
- **TypeScript** 4.5+ (for TypeScript projects)

### Installation

```bash
# Using npm
npm install @uipath/uipath-typescript

# Using yarn
yarn add @uipath/uipath-typescript

# Using pnpm
pnpm add @uipath/uipath-typescript
```

### Quick Start

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
import { Tasks } from '@uipath/uipath-typescript/tasks';

// Initialize the SDK with OAuth
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
  scope: 'your-scopes'
});

// Initialize OAuth flow
await sdk.initialize();

// Create service instances
const maestroProcesses = new MaestroProcesses(sdk);
const tasks = new Tasks(sdk);

// Use the services
const processes = await maestroProcesses.getAll();
const allTasks = await tasks.getAll();
```

<div align="right">

[↑ Back to top](#uipath-typescript-sdk)

</div>

## Authentication

### Authentication Methods

The SDK supports two authentication methods:

For OAuth, first create a non confidential [External App](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications) with the required scopes and provide the clientId, redirectUri, and scope here.

<details>
<summary><strong>1. OAuth Authentication (Recommended)</strong></summary>

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

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

</details>

<details>
<summary><strong>2. Secret-based Authentication</strong></summary>

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token
});
```

</details>

### SDK Initialization

<details>
<summary><strong>When to Use initialize()</strong></summary>

The `initialize()` method completes the authentication process for the SDK:

- **Secret Authentication**: Auto-initializes when creating the SDK instance - **no need to call initialize()**
- **OAuth Authentication**: **MUST call** `await sdk.initialize()` before using any SDK services

#### Example: Secret Authentication (Auto-initialized)
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Tasks } from '@uipath/uipath-typescript/tasks';

const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-organization',
  tenantName: 'your-tenant',
  secret: 'your-secret' //PAT Token or Bearer Token
});

// Ready to use immediately - no initialize() needed
const tasks = new Tasks(sdk);
const allTasks = await tasks.getAll();
```

#### Example: OAuth Authentication (Requires initialize)
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Tasks } from '@uipath/uipath-typescript/tasks';

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
  const tasks = new Tasks(sdk);
  const allTasks = await tasks.getAll();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

</details>

### OAuth Integration Patterns

<details>
<summary><strong>View Integration Patterns</strong></summary>

#### Auto-login on App Load
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';

useEffect(() => {
  const initSDK = async () => {
    const sdk = new UiPath({...oauthConfig});
    await sdk.initialize();
  };
  initSDK();
}, []);
```

#### User-Triggered Login
```typescript
const onLogin = async () => {
  await sdk.initialize();
};

// Handle OAuth callback
const oauthCompleted = useRef(false);
useEffect(() => {
  if (sdk.isInitialized() && !oauthCompleted.current) {
    oauthCompleted.current = true;
    sdk.completeOAuth();
  }
}, []);
```

#### Available OAuth Methods
- `sdk.initialize()` - Start OAuth flow (auto completes also based on callback state)
- `sdk.isInitialized()` - Check if SDK initialization completed
- `sdk.isAuthenticated()` - Check if user has valid token
- `sdk.isInOAuthCallback()` - Check if processing OAuth redirect
- `sdk.completeOAuth()` - Manually complete OAuth (advanced use)

</details>

<div align="right">

[↑ Back to top](#uipath-typescript-sdk)

</div>

## Usage

The SDK provides access to the following services through modular imports:

- `MaestroProcesses` from `@uipath/uipath-typescript/maestro-processes` - Manage agentic maestro processes
- `ProcessInstances` from `@uipath/uipath-typescript/maestro-processes` - Manage maestro process executions
- `Cases` from `@uipath/uipath-typescript/cases` - Manage maestro case management processes
- `CaseInstances` from `@uipath/uipath-typescript/cases` - Manage maestro case executions
- `Tasks` from `@uipath/uipath-typescript/tasks` - Create and manage tasks
- `Entities` from `@uipath/uipath-typescript/entities` - Data Fabric entity operations
- `Processes` from `@uipath/uipath-typescript/processes` - Manage Orchestrator processes
- `Buckets` from `@uipath/uipath-typescript/buckets` - Manage storage buckets in Orchestrator
- `Queues` from `@uipath/uipath-typescript/queues` - Manage Orchestrator queues
- `Assets` from `@uipath/uipath-typescript/assets` - Manage Orchestrator assets

<details>
<summary><strong>View Example Usage</strong></summary>

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { Entities } from '@uipath/uipath-typescript/entities';

// Initialize SDK
const sdk = new UiPath({ /* config */ });

// Create service instances
const maestroProcesses = new MaestroProcesses(sdk);
const processInstances = new ProcessInstances(sdk);
const cases = new Cases(sdk);
const caseInstances = new CaseInstances(sdk);
const tasks = new Tasks(sdk);
const processes = new Processes(sdk);
const buckets = new Buckets(sdk);
const entities = new Entities(sdk);

// Maestro - Get processes and their instances
const allProcesses = await maestroProcesses.getAll();
const instances = await processInstances.getAll({
  processKey: 'my-process',
  pageSize: 10
});

// Control Process Instances
await processInstances.pause(instanceId, 'folder-key');
await processInstances.resume(instanceId, 'folder-key');
await processInstances.cancel(instanceId, 'folder-key', {
  comment: 'Cancelled due to error'
});

// Maestro Case Instances
const caseInstance = await caseInstances.getById(instanceId, 'folder-key');
const stages = await caseInstances.getStages(instanceId, 'folder-key');

// Control Case Instances
await caseInstances.close(instanceId, 'folder-key', {
  comment: 'Case resolved successfully'
});

// Orchestrator Processes - Start a process
const result = await processes.start({
  processKey: 'MyProcess_Key',
}, folderId);

// Tasks - Create, assign, and complete
const task = await tasks.create({
  title: 'Review Invoice',
  priority: 'High'
}, folderId);

await tasks.assign({
  taskId: task.id,
  userNameOrEmail: 'user@company.com'
}, folderId);

await tasks.complete(TaskType.App, {
  taskId: task.id,
  data: {},
  action: 'submit'
}, folderId);

// Buckets - File operations
const bucket = await buckets.getById(bucketId, folderId);
const fileMetadata = await buckets.getFileMetaData(bucketId, folderId, {
  prefix: '/invoices/'
});

// Upload file
await buckets.uploadFile({
  bucketId: bucketId,
  folderId: folderId,
  prefix: '/folder1'
});

// Get download URL
const downloadUrl = await buckets.getReadUri({
  bucketId: bucketId,
  folderId: folderId,
  path: '/folder/file.pdf'
});

// Data Fabric Entities - CRUD operations
const entity = await entities.getById('entity-uuid');
const records = await entities.getRecordsById('entity-uuid', {
  pageSize: 100,
  expansionLevel: 1
});

// Insert records
await entities.insertById('entity-uuid', [
  { name: 'John Doe', email: 'john@company.com', status: 'Active' },
  { name: 'Jane Smith', email: 'jane@company.com', status: 'Active' }
]);

// Update records
await entities.updateById('entity-uuid', [
  { Id: 'record-id-1', status: 'Inactive' }
]);

// Delete records
await entities.deleteById('entity-uuid', ['record-id-1', 'record-id-2']);
```

</details>

<div align="right">

[↑ Back to top](#uipath-typescript-sdk)

</div>

## Samples

Check out the [`/samples`](./samples) folder to see sample applications built using the SDK:

- **[process-app](./samples/process-app)**: A Maestro process management application demonstrating OAuth authentication and SDK usage

<div align="right">

[↑ Back to top](#uipath-typescript-sdk)

</div>

## Development

Before submitting a pull request, please review our [Contribution Guidelines](https://uipath.github.io/uipath-typescript/CONTRIBUTING/).

<div align="right">

[↑ Back to top](#uipath-typescript-sdk)

</div>