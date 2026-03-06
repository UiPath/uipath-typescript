# Getting Started

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 8.x or higher (or yarn/pnpm)
- **TypeScript** 4.5+ (for TypeScript projects)

## Install the SDK

npm install @uipath/uipath-typescript\
found 0 vulnerabilities

yarn add @uipath/uipath-typescript✨ Done in 1.85s.

pnpm add @uipath/uipath-typescript

## Project Setup

mkdir my-uipath-project && cd my-uipath-projectnpm init -yWrote to package.jsonnpm install typescript @types/node ts-node --save-dev\
added x packages in 1snpx tsc --initCreated a new tsconfig.jsonnpm install @uipath/uipath-typescript\
added x packages in 1s

mkdir my-uipath-project && cd my-uipath-projectnpm init -yWrote to package.jsonnpm install @uipath/uipath-typescript\
added x packages in 1s

## **Import & Initialize**

The SDK supports two import patterns. Choose based on your SDK version.

```
// Import core SDK and only the services you need
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';

// Configure and initialize the SDK
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-org',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'OR.Tasks OR.DataService'
});

await sdk.initialize();

// Create service instances
const entities = new Entities(sdk);

// Use the services
const allEntities = await entities.getAll();
```

```
// Import everything from the main package
import { UiPath } from '@uipath/uipath-typescript';

// Configure and initialize the SDK
const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'your-org',
  tenantName: 'your-tenant',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'OR.Tasks OR.DataService'
});

await sdk.initialize();

// Access services directly from sdk instance
const allTasks = await sdk.tasks.getAll();
const allEntities = await sdk.entities.getAll();
```

**Note:** This pattern still works in newer versions but it includes all services in your bundle regardless of usage.

## **Telemetry**

To improve the developer experience, the SDK collects basic usage data about method invocations. For details on UiPath’s privacy practices, see our [privacy policy](https://www.uipath.com/legal/privacy-policy).

## **Vibe Coding**

The SDK is designed for rapid prototyping and development, making it perfect for vibe coding. Here are two ways to get started:

### **Option 1: AI IDE Integration**

After installing the SDK, supercharge your development with AI IDEs:

1. **Install the SDK**: `npm install @uipath/uipath-typescript`
1. **Drag & Drop**: From your `node_modules/@uipath/uipath-typescript` folder, drag the entire package into your AI IDE
1. **Start Prompting**: Your AI assistant now has full context of the SDK!

**Works with:**

- **GitHub Copilot**
- **Cursor**
- **Claude**
- **Any AI coding assistant**

### **Option 2: Copy Documentation for LLMs**

Give your AI assistant complete context by copying our documentation:

**For Maximum Context:**

1. **Download Complete Documentation**: [llms-full-content.txt](/uipath-typescript/llms-full-content.txt)
1. **Copy and Paste**: Copy the entire content and paste it into your AI chat
1. **Start Prompting**: Your AI now has complete SDK knowledge!

**For Specific Features:**

1. **Use the copy button** (📋) on any documentation page
1. **Paste into your AI chat**
1. **Ask specific questions** about that feature
