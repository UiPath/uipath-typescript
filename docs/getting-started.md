# Getting Started

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher (or yarn/pnpm)
- **TypeScript** 4.5+ (for TypeScript projects)


## Install the SDK

=== "npm"

    <!-- termynal -->

    ```bash
    $ npm install @uipath/uipath-typescript

    found 0 vulnerabilities
    ```

=== "yarn"

    <!-- termynal -->

    ```bash
    $ yarn add @uipath/uipath-typescript
    ✨ Done in 1.85s.
    ```

=== "pnpm"

    <!-- termynal -->

    ```bash
    $ pnpm add @uipath/uipath-typescript
    ```

## Project Setup

=== "TypeScript Project"

    <!-- termynal -->

    ```bash
    $ mkdir my-uipath-project && cd my-uipath-project
    $ npm init -y
    Wrote to package.json
    $ npm install typescript @types/node ts-node --save-dev

    added x packages in 1s
    $ npx tsc --init
    Created a new tsconfig.json
    $ npm install @uipath/uipath-typescript

    added x packages in 1s
    ```

=== "JavaScript Project"

    <!-- termynal -->

    ```bash
    $ mkdir my-uipath-project && cd my-uipath-project
    $ npm init -y
    Wrote to package.json
    $ npm install @uipath/uipath-typescript

    added x packages in 1s
    ```




## **Import & Initialize**

The SDK supports two import patterns. Choose based on your SDK version.

=== "1.0.0-beta.16+"

    ```typescript
    // Import core SDK and only the services you need
    import { UiPath } from '@uipath/uipath-typescript/core';
    import { Tasks } from '@uipath/uipath-typescript/tasks';
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
    const tasks = new Tasks(sdk);
    const entities = new Entities(sdk);

    // Use the services
    const allTasks = await tasks.getAll();
    const allEntities = await entities.getAll();
    ```

    **Benefits:**

    - Tree-shaking removes unused services from your bundle
    - Smaller bundle sizes for production
    - Explicit dependencies make code easier to understand

=== "Earlier versions"

    ```typescript
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

    **Note:** This pattern still works but includes all services in your bundle regardless of usage.

## **Telemetry**

To improve the developer experience, the SDK collects basic usage data about method invocations. For details on UiPath’s privacy practices, see our [privacy policy](https://www.uipath.com/legal/privacy-policy).



## **Vibe Coding**

The SDK is designed for rapid prototyping and development, making it perfect for vibe coding. Here are two ways to get started:

### **Option 1: AI IDE Integration**

After installing the SDK, supercharge your development with AI IDEs:

1. **Install the SDK**: `npm install @uipath/uipath-typescript`
2. **Drag & Drop**: From your `node_modules/@uipath/uipath-typescript` folder, drag the entire package into your AI IDE
3. **Start Prompting**: Your AI assistant now has full context of the SDK!

**Works with:**
- **GitHub Copilot**
- **Cursor**
- **Claude**
- **Any AI coding assistant**

![Vibe Coding Demo](assets/vibe-coding-demo.gif)

### **Option 2: Copy Documentation for LLMs**

Give your AI assistant complete context by copying our documentation:

=== "Copy Full Documentation"

    **For Maximum Context:**
    
    1. **Download Complete Documentation**: [llms-full-content.txt](/uipath-typescript/llms-full-content.txt)
    
    2. **Copy and Paste**: Copy the entire content and paste it into your AI chat
    
    3. **Start Prompting**: Your AI now has complete SDK knowledge!

=== "Copy Individual Pages"

    **For Specific Features:**
    
    1. **Use the copy button** (📋) on any documentation page
    2. **Paste into your AI chat** 
    3. **Ask specific questions** about that feature