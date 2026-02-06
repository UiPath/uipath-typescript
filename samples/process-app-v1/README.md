# UiPath Maestro Process Management App

A sample React TypeScript application for managing UiPath Maestro processes with OAuth authentication.

> This app uses the recommended modular import pattern for better performance and smaller bundle sizes. For the single-package import pattern, see [process-app-v0](../process-app-v0).

## SDK Usage

### Importing the SDK

```typescript
// Core SDK for authentication
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

// Maestro Processes service
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import type { ProcessInstanceGetResponse, MaestroProcessGetAllResponse } from '@uipath/uipath-typescript/maestro-processes';

// Entities service
import { Entities } from '@uipath/uipath-typescript/entities';
import type { EntityGetResponse, EntityRecord } from '@uipath/uipath-typescript/entities';
```

### Initializing the SDK

```typescript
// Create SDK instance
const sdk = new UiPath(config);
await sdk.initialize();

// Create service instances
const maestroProcesses = new MaestroProcesses(sdk);
const processInstances = new ProcessInstances(sdk);
const entities = new Entities(sdk);

// Use services
const processes = await maestroProcesses.getAll();
const instances = await processInstances.getAll();
const entity = await entities.getById(entityId);
```

## Installation

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
   VITE_UIPATH_SCOPE=PIMS DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write
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
├── components/
│   ├── Header.tsx           # App header with auth status
│   ├── InstanceDetails.tsx  # Instance details view
│   ├── InstanceList.tsx     # Instance list component
│   ├── LoginScreen.tsx      # OAuth login interface
│   ├── Navigation.tsx       # Tab navigation
│   ├── ProcessInstances.tsx # Process instances table
│   └── ProcessList.tsx      # Maestro processes view
├── hooks/
│   └── useAuth.tsx          # Authentication context and hooks
├── utils/
│   └── formatters.ts        # Utility functions
├── App.tsx                  # Main application component
└── main.tsx                 # Application entry point
```

## Key Features

### Process Overview (ProcessList)
- Dashboard statistics (total processes, running, completed today, failed today)
- List all Maestro processes with instance counts (completed, running, faulted, pending)
- Visual progress bar for each process status distribution
- Refresh data on demand

### Process Instances (ProcessInstances)
- Paginated list of all process instances
- Filter instances by process
- View instance details including:
  - Variables grouped by source
  - Execution history
  - BPMN activity type detection
  - Action Center task links
  - Entity attachments
- Cancel faulted instances

## Technologies Used

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
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

- Check the [UiPath TypeScript SDK documentation](https://uipath.github.io/uipath-typescript/)
- Verify your UiPath Cloud tenant configuration
- Ensure proper scopes are granted to your OAuth application
