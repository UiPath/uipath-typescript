# Conversational Agent Chat

Package: `@uipath/ui-widgets-conversational-agent-chat`

A React component that provides a conversational AI chat interface powered by UiPath Conversational Agents. Built on top of UiPath Apollo React components, this widget enables seamless integration of AI-powered chat functionality into your applications.

## Features

- Real-time streaming responses from conversational agents
- File attachment support with drag and drop
- Tool call visualization and tracking
- Conversation history management
- Start new conversations or continue existing ones
- Built on Apollo React chat components
- Built with TypeScript for type safety

## Installation

```
npm install @uipath/ui-widgets-conversational-agent-chat
```

## Peer Dependencies

This package requires the following peer dependencies:

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.3.10
```

## Usage

Note

Add either `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```
import { ConversationalAgentChat } from "@uipath/ui-widgets-conversational-agent-chat";
import "@uipath/ui-widgets-conversational-agent-chat/ConversationalAgentChat.css";
import { UiPath } from "@uipath/uipath-typescript/core";
import { useEffect, useState } from "react";

function App() {
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const init = async () => {
      const uipath = new UiPath({
        baseUrl: "https://cloud.uipath.com",
        orgName: "your-org",
        tenantName: "your-tenant",
        secret: "your-secret",
      });
      await uipath.initialize();
      setSdk(uipath);
    };
    init();
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return <ConversationalAgentChat sdk={sdk} agentId={123} folderId={456} />;
}
```

## API Reference

### Props

| Prop                     | Type          | Required | Description                                                                                                                                                                                     |
| ------------------------ | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`                    | `UiPath`      | Yes      | UiPath SDK instance for API communication                                                                                                                                                       |
| `agentId`                | `number`      | No       | The ID of the conversational agent release. Required unless `existingConversationId` is provided.                                                                                               |
| `folderId`               | `number`      | No       | The folder ID the agent lives in. When omitted, the widget resolves it by listing agents and matching on `agentId` — prefer passing it when known.                                              |
| `existingConversationId` | `string`      | No       | Load an existing conversation by ID instead of creating a new one on first message.                                                                                                             |
| `inputSchema`            | `InputSchema` | No       | Agent input schema. Takes precedence over the schema derived from the resolved agent; use when the caller has the schema but the agent can't be resolved (e.g. an in-progress draft).           |
| `isDebugMode`            | `boolean`     | No       | Debug flow: opens an empty conversation up front so inputs are collected in the widget, and submits update the existing conversation instead of creating a new one.                             |
| `externalUserId`         | `string`      | No       | External user identifier sent as `x-uipath-external-user-id` (HTTP header / WebSocket query param). Required when authenticating via an app-scoped external app; omit for standard user tokens. |

## `ConversationalAgentPickerChat` (agent picker + chat)

A higher-level component that lists all conversational agents accessible to a given SDK and opens a chat with the selected one. Useful when you don't know the `agentId`/`folderId` up front and want the user to pick.

### Usage

```
import { ConversationalAgentPickerChat } from "@uipath/ui-widgets-conversational-agent-chat";
import "@uipath/ui-widgets-conversational-agent-chat/ConversationalAgentChat.css";
import { UiPath } from "@uipath/uipath-typescript/core";
import { useEffect, useState } from "react";

function App() {
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const init = async () => {
      const uipath = new UiPath({
        baseUrl: "https://cloud.uipath.com",
        orgName: "your-org",
        tenantName: "your-tenant",
        secret: "your-secret",
      });
      await uipath.initialize();
      setSdk(uipath);
    };
    init();
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return <ConversationalAgentPickerChat sdk={sdk} />;
}
```

### Props

| Prop              | Type                                           | Required | Description                                                            |
| ----------------- | ---------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `sdk`             | `UiPath`                                       | Yes      | UiPath SDK instance. Changing it refetches the list and resets the UI. |
| `locale`          | `Locale`                                       | No       | Passthrough to the inner chat.                                         |
| `theme`           | `"light" \| "dark" \| "light-hc" \| "dark-hc"` | No       | Passthrough to the inner chat.                                         |
| `readOnly`        | `boolean`                                      | No       | Passthrough to the inner chat.                                         |
| `overrideLabels`  | `OverrideLabels`                               | No       | Passthrough to the inner chat.                                         |
| `onAgentSelected` | `(agent: AgentSummary) => void`                | No       | Fired when the user picks an agent (telemetry, routing, etc.).         |

### Behavior

- Calls `ConversationalAgent(sdk).getAll()` on mount → renders one row per agent (`name` + `description`).
- Clicking an agent swaps to the chat view with that agent's `id` and `folderId`.
- "Back" clears the selection and returns to the list (no refetch).
- If the user's accessible tenants live behind your own auth/chrome, switch tenants by rebuilding the `UiPath` instance and passing the new one as `sdk` — the picker handles the rest.

## Features in Detail

### Streaming Responses

The component supports real-time streaming of AI responses, providing a smooth conversational experience as the agent generates its reply.

### File Attachments

Users can attach files to their messages via drag and drop or file picker.

### Tool Call Tracking

When the conversational agent uses tools, the component automatically displays:

- Tool name and input parameters
- Execution status
- Output results
- Error handling

### Session Management

The widget automatically handles:

- Conversation creation and persistence
- Session initialization and maintenance
- Multiple conversation support via "New Chat"

## Styling

The component comes with default styles. Import the CSS file in your application:

```
import "@uipath/ui-widgets-conversational-agent-chat/ConversationalAgentChat.css";
```

The chat interface supports both light and dark themes through the UiPath Apollo design system.

## Development

### Install Dependencies

```
npm install
```

### Build the Package

```
npm run build
```

### Run Tests

```
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## TypeScript Support

This package is written in TypeScript and includes type definitions. Import types as needed:

```
import type { ConversationalAgentChatProps } from "@uipath/ui-widgets-conversational-agent-chat";
```

## License

MIT
