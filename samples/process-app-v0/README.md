# UiPath Maestro Process Management App

A sample React TypeScript application for managing UiPath Maestro processes with OAuth authentication.

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
   VITE_UIPATH_BASE_URL=https://api.uipath.com
   VITE_UIPATH_SCOPE=PIMS DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write
   ```

### 4. Installation and Running

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

- Check the [UiPath TypeScript SDK documentation](https://uipath.github.io/uipath-typescript/)
- Verify your UiPath Cloud tenant configuration
- Ensure proper scopes are granted to your OAuth application
