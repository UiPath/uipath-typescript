# UiPath TypeScript SDK

[![npm version](https://badge.fury.io/js/@uipath%2Fsdk.svg)](https://badge.fury.io/js/@uipath%2Fsdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A TypeScript SDK that enables programmatic interaction with UiPath Cloud Platform services including processes, assets, buckets, context grounding, data services, jobs, and more.

## Installation

```bash
npm install uipath-typescript-sdk
```

## Basic Usage

```typescript
import { UiPath } from "uipath-typescript-sdk";

// Initialize the SDK with required parameters
const sdk = new UiPath({
    // Base URL for the UiPath Platform (required)
    baseUrl: "https://alpha.uipath.com/{orgName}/{tenantName}",
    
    // Authentication token (required)
    // You can get this token from UiPath Automation Platform
    secret: "your-access-token",
    
    // Optional debug logging
    debug: false,

    // Optional API configuration
    apiConfig: {
        UIPATH_TENANT_ID: "your-tenant-id",
        UIPATH_ORGANIZATION_ID: "your-org-id"
    },

    // Optional folder configuration
    folderConfig: {
        UIPATH_FOLDER_KEY: "your-folder-key",
        UIPATH_FOLDER_PATH: "your-folder-path"
    }
});

// Example: Execute a process
async function runProcess() {
    try {
        const job = await sdk.processes.invoke({
            name: "MyProcess",
            inputArguments: {
                param1: "value1",
                param2: 42,
            },
        });
        
        console.log("Job started:", job.id);
        
        // Monitor job status
        const status = await sdk.jobs.get({ id: job.id });
        console.log("Job status:", status.state);
    } catch (error) {
        console.error("Error running process:", error);
    }
}

// Example: Work with assets
async function getAsset() {
    try {
        const asset = await sdk.assets.retrieve({ name: "MyAsset" });
        console.log("Asset value:", asset.value);
    } catch (error) {
        console.error("Error retrieving asset:", error);
    }
}
```

## Authentication

The SDK requires an authentication token to interact with UiPath services. You can obtain this token in one of two ways:

1. **User Access Token**: Generate a user access token from UiPath Automation Platform
   - Log in to UiPath platform
   - Get API access Bearer auth token

2. **Service Account**:
   - Use PAT token to access APIs, Navigate to profile -> preferences -> genrate pat token

## Environment Variables

The following environment variables are optional and can be used for additional functionality:

Optional:
- `UIPATH_JOB_ID` - Job ID for process execution context (optional)
- `UIPATH_JOB_KEY` - Job key for process execution context (optional)
- `UIPATH_ROBOT_KEY` - Robot key for automation context (optional)
- `UIPATH_FOLDER_KEY` - Folder key for resource access (optional)
- `UIPATH_FOLDER_PATH` - Folder path for resource access (optional)

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
- `sdk.llmGateway` - Access UiPath's LLM Gateway services
- `sdk.entity` - Query and read entity data in data fabric / data service

## Examples

### Buckets Service

```typescript
// Download a file from a bucket
try {
    await sdk.buckets.download({
        bucketKey: "my-bucket",
        blobFilePath: "path/to/file.xlsx",
        destinationPath: "local/path/file.xlsx",
    });
} catch (error) {
    console.error("Error downloading file:", error);
}
```

### Context Grounding Service

```typescript
// Search for contextual information
try {
    const results = await sdk.contextGrounding.search({
        name: "my-knowledge-index",
        query: "How do I process an invoice?",
        numberOfResults: 5,
    });
    console.log("Search results:", results);
} catch (error) {
    console.error("Error searching context:", error);
}
```

### Entity Service

```typescript
// Example: Query and read employee data with department expansion
async function getEmployeeData() {
    try {
        // Query employees in a specific department with salary > 50000
        const employeeQuery = await sdk.entity.queryByEntityId(
            "95d53e79-5831-f011-8b3d-000d3a31aec5",
            {
                filter: "department.name eq 'Engineering' and salary gt 50000",
                orderBy: ["lastName asc", "firstName asc"],
                skip: 0,
                take: 20
            },
            1  // Include one level of related entities (e.g., department details)
        );
        console.log("Engineers with salary > 50000:", employeeQuery.items);

        // Read all employees with pagination
        const allEmployees = await sdk.entity.readByEntityName(
            "Employee",
            0,     // Start from first record
            100,   // Get up to 100 records
            2      // Include two levels of related entities (e.g., department and location)
        );
        
        // Process the results
        allEmployees.items.forEach(employee => {
            console.log(`${employee.firstName} ${employee.lastName} - ${employee.department.name} (${employee.department.location.city})`);
        });

        // Get total count
        console.log(`Total employees: ${allEmployees.count}`);
    } catch (error) {
        console.error("Error fetching employee data:", error);
    }
}

// Execute the function
getEmployeeData();
```

This example demonstrates:
- Querying employees with specific conditions (department and salary)
- Ordering results by multiple fields
- Using expansion levels to include related entity data
- Pagination support for large datasets
- Processing and displaying nested entity data
