# UiPath Maestro Process Management App (Modular Imports)

A sample React TypeScript application demonstrating the **modular imports pattern** for the UiPath TypeScript SDK.

This app has identical functionality to `process-app` but uses modular imports instead of the monolithic SDK import pattern. This results in smaller bundle sizes when you only need specific SDK modules.

## Modular Imports Pattern

Instead of importing everything from the main package:

```typescript
// Monolithic import (larger bundle)
import { UiPath, UiPathError, MaestroProcesses } from '@uipath/uipath-typescript';
import type { UiPathSDKConfig, ProcessInstanceGetResponse } from '@uipath/uipath-typescript';
```

This app uses modular imports from specific submodules:

```typescript
// Modular imports (smaller bundle - only loads what you need)
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import type { ProcessInstanceGetResponse, MaestroProcessGetAllResponse } from '@uipath/uipath-typescript/maestro-processes';

import { Entities } from '@uipath/uipath-typescript/entities';
import type { EntityGetResponse, EntityRecord } from '@uipath/uipath-typescript/entities';
```

### Using Modular Services

With modular imports, you create service instances directly instead of accessing them via `sdk.*`:

```typescript
// Create SDK instance (same as before)
const sdk = new UiPath(config);
await sdk.initialize();

// Create modular service instances
const maestroProcesses = new MaestroProcesses(sdk);
const processInstances = new ProcessInstances(sdk);  // Separate service!
const entities = new Entities(sdk);

// Use services directly
const processes = await maestroProcesses.getAll();
const instances = await processInstances.getAll();  // Not maestroProcesses.instances!
const entity = await entities.getById(entityId);
```

> **Note:** Unlike the monolithic SDK where you access `sdk.maestro.processes.instances`,
> in modular imports `ProcessInstances` is a separate service that must be instantiated independently.

## Installation

To install the sdk do
```bash
npm install @uipath/uipath-typescript
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- UiPath Cloud tenant access
- OAuth External Application configured in UiPath Admin Center

### 2. Configure OAuth Application

1. In UiPath Cloud: **Admin → External Applications**
2. Click **Add Application → Non Confidential Application**
3. Configure:
   - **Name**: Your app name (e.g., "Maestro Process Manager")
   - **Redirect URI**: `http://localhost:5173` (for development)
   - **Scopes**: Select required scopes (this app uses orchestrator scopes, maestro api scopes and DataFabric scopes)

4. Save and copy the **Client ID**

### 3. Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your UiPath credentials:
   ```env
   VITE_UIPATH_CLIENT_ID=your-oauth-client-id
   VITE_UIPATH_ORG_NAME=your-organization-name
   VITE_UIPATH_TENANT_NAME=your-tenant-name
   VITE_UIPATH_BASE_URL=https://cloud.uipath.com
   VITE_UIPATH_REDIRECT_URI=http://localhost:5173
   VITE_UIPATH_SCOPE=OR.License OR.License.Read OR.License.Write OR.Settings OR.Settings.Read OR.Settings.Write OR.Robots OR.Robots.Read OR.Robots.Write OR.Machines OR.Machines.Read OR.Machines.Write OR.Execution OR.Execution.Read OR.Execution.Write OR.Assets OR.Assets.Read OR.Assets.Write OR.Queues OR.Queues.Read OR.Queues.Write OR.Jobs OR.Jobs.Read OR.Jobs.Write OR.Users OR.Users.Read OR.Users.Write OR.Administration OR.Administration.Read OR.Administration.Write OR.Audit OR.Audit.Read OR.Audit.Write OR.Webhooks OR.Webhooks.Read OR.Webhooks.Write OR.Monitoring OR.Monitoring.Read OR.Monitoring.Write OR.ML OR.ML.Read OR.ML.Write OR.Tasks OR.Tasks.Read OR.Tasks.Write OR.Analytics OR.Analytics.Read OR.Analytics.Write OR.Folders OR.Folders.Read OR.Folders.Write OR.BackgroundTasks OR.BackgroundTasks.Read OR.BackgroundTasks.Write OR.TestSets OR.TestSets.Read OR.TestSets.Write OR.TestSetExecutions OR.TestSetExecutions.Read OR.TestSetExecutions.Write OR.TestSetSchedules OR.TestSetSchedules.Read OR.TestSetSchedules.Write OR.TestDataQueues OR.TestDataQueues.Read OR.TestDataQueues.Write OR.Hypervisor OR.Hypervisor.Read OR.Hypervisor.Write OR.AutomationSolutions.Access PIMS DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write
   ```

### 4. Installation and Running

Update your orgName in vite.config.ts in this section:
```
 server: {
    proxy: {
      // Replace '/your-org' with your actual organization
      '/your-org': {
        target: 'https://cloud.uipath.com',
        changeOrigin: true,
        secure: true,
      },
    },
  }
```
This above setup is for CORS Issue for local development, it creates a local proxy using vite server config

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

### 5. Authentication Flow

1. Click **"Sign in with UiPath"**
2. You'll be redirected to UiPath Cloud for authentication
3. After successful login, you'll return to the app dashboard
4. The app will automatically initialize the UiPath SDK

## Application Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard with statistics
│   ├── Header.tsx       # App header with auth status
│   ├── LoginScreen.tsx  # OAuth login interface
│   ├── Navigation.tsx   # Tab navigation
│   ├── ProcessList.tsx  # Maestro processes view
│   └── ProcessInstances.tsx # Process instances table
├── hooks/
│   └── useAuth.tsx      # Authentication context and hooks
├── services/
│   └── auth.ts          # OAuth service implementation
└── App.tsx              # Main application component
```

## Key Features

### Dashboard
- Live process statistics (total, running, completed, failed)
- System status indicators
- Quick action buttons

### Process Management
- View all Maestro processes with statistics
- Start process instances
- Real-time status updates

### Process Instances
- Monitor running and completed instances
- View execution status and duration
- Sortable table interface

## Technologies Used

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for beautiful styling
- **UiPath TypeScript SDK** for API integration
- **OAuth 2.0** for secure authentication

## Building for Production

```bash
npm run build
```

The built application will be in the `dist/` directory.

## Troubleshooting

### Common Issues

1. **Authentication fails**: Verify your OAuth client ID and redirect URI match your UiPath External Application configuration

2. **API errors**: Ensure your UiPath user has proper permissions for Maestro access

3. **Build errors**: Make sure all environment variables are properly set

### Getting Help

- Check the UiPath TypeScript SDK documentation[https://uipath.github.io/uipath-typescript/]
- Verify your UiPath Cloud tenant configuration
- Ensure proper scopes are granted to your OAuth application
