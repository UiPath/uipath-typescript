# Conversational Agent Chat

A React chat interface powered by [UiPath Conversational Agents](../../api/interfaces/ConversationalAgentServiceModel/). Built on UiPath Apollo React chat components, it drops an AI chat experience into your application with streaming, attachments and tool-call visibility.

Package: `@uipath/ui-widgets-conversational-agent-chat`

## Features

- Real-time streaming responses from conversational agents
- File attachment support with drag and drop
- Tool call visualization and tracking
- Conversation history management
- Start new conversations or continue existing ones
- Built on Apollo React chat components
- Written in TypeScript for type safety

## Installation

```
npm install @uipath/ui-widgets-conversational-agent-chat
```

### Peer dependencies

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.3.10
```

## Usage

Theming

Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

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

## Props

| Prop                     | Type          | Required | Description                                                                                                                                                                                    |
| ------------------------ | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`                    | `UiPath`      | Yes      | UiPath SDK instance for API communication                                                                                                                                                      |
| `agentId`                | `number`      | No       | The ID of the conversational agent release. Required unless `existingConversationId` is provided                                                                                               |
| `folderId`               | `number`      | No       | The folder ID the agent lives in. When omitted, the widget resolves it by listing agents and matching on `agentId` — prefer passing it when known                                              |
| `existingConversationId` | `string`      | No       | Load an existing conversation by ID instead of creating a new one on the first message                                                                                                         |
| `inputSchema`            | `InputSchema` | No       | Agent input schema. Takes precedence over the schema derived from the resolved agent; use when the caller has the schema but the agent can't be resolved (e.g. an in-progress draft)           |
| `isDebugMode`            | `boolean`     | No       | Debug flow: opens an empty conversation up front so inputs are collected in the widget, and submits update the existing conversation instead of creating a new one                             |
| `externalUserId`         | `string`      | No       | External user identifier sent as `x-uipath-external-user-id` (HTTP header / WebSocket query param). Required when authenticating via an app-scoped external app; omit for standard user tokens |

## Agent picker + chat

`ConversationalAgentPickerChat` is a higher-level component that lists every conversational agent reachable by a given SDK instance and opens a chat with the selected one. Use it when you don't know the `agentId` / `folderId` up front and want the user to pick.

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

| Prop              | Type                                           | Required | Description                                                           |
| ----------------- | ---------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `sdk`             | `UiPath`                                       | Yes      | UiPath SDK instance. Changing it refetches the list and resets the UI |
| `locale`          | `Locale`                                       | No       | Passthrough to the inner chat                                         |
| `theme`           | `"light" \| "dark" \| "light-hc" \| "dark-hc"` | No       | Passthrough to the inner chat                                         |
| `readOnly`        | `boolean`                                      | No       | Passthrough to the inner chat                                         |
| `overrideLabels`  | `OverrideLabels`                               | No       | Passthrough to the inner chat                                         |
| `onAgentSelected` | `(agent: AgentSummary) => void`                | No       | Fired when the user picks an agent (telemetry, routing, etc.)         |

### Behavior

- Calls `ConversationalAgent(sdk).getAll()` on mount, then renders one row per agent (`name` + `description`).
- Clicking an agent swaps to the chat view with that agent's `id` and `folderId`.
- **Back** clears the selection and returns to the list — no refetch.
- If the user's accessible tenants live behind your own auth or chrome, switch tenants by rebuilding the `UiPath` instance and passing the new one as `sdk`; the picker handles the rest.

## Features in detail

### Streaming responses

Responses stream in real time, so the conversation stays fluid while the agent generates its reply.

### File attachments

Users can attach files to their messages via drag and drop or the file picker.

### Tool call tracking

When the agent uses tools, the widget displays:

- Tool name and input parameters
- Execution status
- Output results
- Error handling

### Session management

The widget handles conversation creation and persistence, session initialization and maintenance, and multiple conversations via **New Chat**.

## Styling

```
import "@uipath/ui-widgets-conversational-agent-chat/ConversationalAgentChat.css";
```

Both light and dark themes are supported through the UiPath Apollo design system.

## TypeScript

```
import type { ConversationalAgentChatProps } from "@uipath/ui-widgets-conversational-agent-chat";
```
