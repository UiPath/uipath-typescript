# UiPath Conversational Agent App

A sample React TypeScript application for interacting with UiPath Conversational Agents. Features real-time streaming responses over WebSocket, conversation management, file attachments, tool call visualization, and feedback.

## Installation

```bash
npm install @uipath/uipath-typescript
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- UiPath Cloud tenant access
- OAuth External Application configured in UiPath Admin Center
- At least one Conversational Agent deployed in your tenant

### 2. Configure OAuth Application

1. In UiPath Cloud: **Admin > External Applications**
2. Click **Add Application > Non Confidential Application**
3. Configure:
   - **Name**: Your app name (e.g., "Conversational Agent App")
   - **Redirect URI**: `http://localhost:5173/callback` (for development)
   - **Scopes**: `OR.Execution`, `OR.Folders`, `OR.Jobs`, `ConversationalAgents`, `Traces.API`

4. Save and copy the **Client ID**

> **Note:** The `ConversationalAgents` scope is required for real-time WebSocket sessions. Without it, REST API calls will work but the socket connection will fail. See the [OAuth Scopes Reference](https://uipath.github.io/uipath-typescript/oauth-scopes/) for details.

### 3. Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your UiPath credentials:
   ```env
   VITE_UIPATH_BASE_URL=https://cloud.uipath.com
   VITE_UIPATH_CLIENT_ID=your-oauth-client-id
   VITE_UIPATH_REDIRECT_URI=http://localhost:5173/callback
   VITE_UIPATH_SCOPE=OR.Execution OR.Folders OR.Jobs ConversationalAgents Traces.API
   VITE_UIPATH_ORG_NAME=your-organization-name
   VITE_UIPATH_TENANT_NAME=your-tenant-name
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
3. After successful login, you'll return to the app
4. The app will automatically initialize the UiPath SDK

## Application Structure

```
src/
├── components/
│   ├── AgentSelector.tsx      # Agent selection dropdown
│   ├── ChatArea.tsx           # Message display area
│   ├── ChatInput.tsx          # Text input with file attachments
│   ├── ChatLayout.tsx         # Main layout with sidebar
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── LoginScreen.tsx        # OAuth login interface
│   ├── MessageBubble.tsx      # Message rendering (markdown, images, citations)
│   ├── Sidebar.tsx            # Conversation list and management
│   ├── Spinner.tsx            # Loading indicator
│   └── WelcomeScreen.tsx      # Initial screen before conversation
├── context/
│   ├── AuthContext.tsx         # OAuth authentication context
│   └── ConversationalAgentContext.tsx  # Agent orchestration layer
├── hooks/
│   ├── useAgents.ts           # Agent discovery and selection
│   ├── useChat.ts             # Messages, streaming, exchanges, feedback, interrupts
│   └── useConversations.ts    # Conversation CRUD and pagination
├── types.ts                   # Shared type definitions
├── App.tsx                    # Main application component
└── main.tsx                   # Entry point
```

## Key Features

### Real-Time Chat
- WebSocket streaming with chunked markdown rendering
- Multi-turn conversations with shared context
- Connection status monitoring and error handling

### Content Types
- Markdown with syntax highlighting
- HTML content rendering
- Image display
- Citations with source links

### Conversation Management
- Create, rename, and delete conversations
- Conversation history with pagination
- Auto-generated conversation labels

### Agent Interactions
- Tool call visualization (name, input, output)
- Interrupt handling (tool call confirmation prompts)
- Exchange-level feedback (thumbs up/down)

### File Attachments
- Upload files to conversations
- Attach files to messages

## Technologies Used

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **UiPath TypeScript SDK** for API and WebSocket integration
- **OAuth 2.0** for secure authentication

## Building for Production

```bash
npm run build
```

The built application will be in the `dist/` directory.

## Troubleshooting

### Common Issues

1. **Authentication fails**: Verify your OAuth client ID and redirect URI match your UiPath External Application configuration

2. **WebSocket connection fails**: Ensure the `ConversationalAgents` scope is included in your OAuth application

3. **No agents found**: Verify you have at least one Conversational Agent deployed and your user has access to the folder containing the agent

4. **Build errors**: Make sure all environment variables are properly set in `.env`

### Getting Help

- [UiPath TypeScript SDK Documentation](https://uipath.github.io/uipath-typescript/)
- [OAuth Scopes Reference](https://uipath.github.io/uipath-typescript/oauth-scopes/)
- [Conversational Agent Guide](https://uipath.github.io/uipath-typescript/conversational-agent/)
