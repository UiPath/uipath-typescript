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

To improve the developer experience, the SDK collects basic usage data about method invocations. Telemetry is enabled by default. For details on UiPath’s privacy practices, see our [privacy policy](https://www.uipath.com/legal/privacy-policy).

### **What is sent**

The SDK sends one event when a `UiPath` instance is created and one event for each SDK method call. Events go to a UiPath-owned Azure Application Insights resource, which also records the time of each event and an approximate location derived from the sender's IP address. Each event contains:

| Field                                          | Value                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ApplicationName`, `Version`                   | The SDK's name and version                                                                                                         |
| `Service`                                      | The SDK method that was called, for example `Tasks.GetAll`                                                                         |
| `CloudUrl`                                     | The base URL with the organization and tenant                                                                                      |
| `CloudOrganizationName`, `CloudOrganizationId` | The organization the SDK is configured for                                                                                         |
| `CloudTenantName`, `CloudTenantId`             | The tenant the SDK is configured for                                                                                               |
| `CloudUserId`                                  | The id of the signed-in user, taken from the access token. Empty for tokens that carry no user id, such as a personal access token |
| `CloudClientId`, `CloudRedirectUri`            | The OAuth client id and redirect URI, when OAuth is used                                                                           |

Method arguments, request bodies and response data are never sent.

### **Disabling telemetry**

When telemetry is disabled, the SDK sends no events at all.

Set the `UIPATH_APPS_TELEMETRY_DISABLED` environment variable to `1` or `true` in the [deployment's environment variables](../coded-apps/ci-cd-github-actions/#coded-app-inside-solution).

```
UIPATH_APPS_TELEMETRY_DISABLED=true
```

A deployment's environment variables replace the package defaults as a whole, so include this variable in every deployment that sets its own.

Set the `UIPATH_TELEMETRY_DISABLED` environment variable to `1` or `true` in the process environment. This is the same variable the [UiPath CLI](https://www.npmjs.com/package/@uipath/cli) reads, so disabling CLI telemetry also disables SDK telemetry for CLI commands.

```
export UIPATH_TELEMETRY_DISABLED=1
```

Deno

Deno must be allowed to read the variable, for example with `--allow-env=UIPATH_TELEMETRY_DISABLED`. Without that permission the variable is ignored and telemetry stays on.

## **Vibe Coding**

The SDK is designed for rapid prototyping and development, making it perfect for vibe coding. Here are three ways to get started:

### **Option 1: AI Agent Skills**

Install the agent skill in your AI agent of choice to build, deploy, and create coded apps:

# install uipath cli npm install -g @uipath/cli# install all uipath skillsuip skills install

This will install all uipath skills including the uipath-coded-apps skill. See [UiPath Skills](https://github.com/uipath/skills) and [UiPath CLI](https://github.com/UiPath/cli) for more details.

### **Option 2: AI IDE Integration**

After installing the SDK, supercharge your development with AI IDEs:

1. **Install the SDK**: `npm install @uipath/uipath-typescript`
1. **Drag & Drop**: From your `node_modules/@uipath/uipath-typescript` folder, drag the entire package into your AI IDE
1. **Start Prompting**: Your AI assistant now has full context of the SDK!

**Works with:**

- **GitHub Copilot**
- **Cursor**
- **Claude**
- **Any AI coding assistant**

### **Option 3: Copy Documentation for LLMs**

Give your AI assistant complete context by copying our documentation:

**For Maximum Context:**

1. **Download Complete Documentation**: [llms-full-content.txt](/uipath-typescript/llms-full-content.txt)
1. **Copy and Paste**: Copy the entire content and paste it into your AI chat
1. **Start Prompting**: Your AI now has complete SDK knowledge!

**For Specific Features:**

1. **Use the copy button** (📋) on any documentation page
1. **Paste into your AI chat**
1. **Ask specific questions** about that feature
