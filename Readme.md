# UiPath TypeScript SDK

[![npm version](https://badge.fury.io/js/@uipath%2Fsdk.svg)](https://badge.fury.io/js/@uipath%2Fsdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A TypeScript SDK that enables programmatic interaction with UiPath Cloud Platform services including processes, assets, buckets, context grounding, data services, jobs, and more.

## Installation

```bash
npm install @uipath/sdk
# or
yarn add @uipath/sdk
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
UIPATH_URL=https://cloud.uipath.com/ACCOUNT_NAME/TENANT_NAME
UIPATH_ACCESS_TOKEN=YOUR_TOKEN_HERE
```

## Basic Usage

```typescript
import { UiPath } from "@uipath/sdk";

// Initialize the SDK
const sdk = new UiPath();

// Execute a process
const job = await sdk.processes.invoke({
    name: "MyProcess",
    inputArguments: {
        param1: "value1",
        param2: 42,
    },
});

// Work with assets
const asset = await sdk.assets.retrieve({ name: "MyAsset" });
```

## Available Services

The SDK provides access to various UiPath services:

- `sdk.processes` - Manage and execute UiPath automation processes
- `sdk.assets` - Work with assets (variables, credentials) stored in UiPath
- `sdk.buckets` - Manage cloud storage containers for automation files
- `sdk.connections` - Handle connections to external systems
- `sdk.contextGrounding` - Work with semantic contexts for AI-enabled automation
- `sdk.jobs` - Monitor and manage automation jobs
- `sdk.queues` - Work with transaction queues
- `sdk.actions` - Work with Action Center
- `sdk.folders` - Manage folder structure and permissions

## Examples

### Buckets Service

```typescript
// Download a file from a bucket
await sdk.buckets.download({
    bucketKey: "my-bucket",
    blobFilePath: "path/to/file.xlsx",
    destinationPath: "local/path/file.xlsx",
});
```

### Context Grounding Service

```typescript
// Search for contextual information
const results = await sdk.contextGrounding.search({
    name: "my-knowledge-index",
    query: "How do I process an invoice?",
    numberOfResults: 5,
});
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
