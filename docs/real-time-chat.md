# Real-time Chat with WebSocket Streaming

The Conversational Agent SDK provides real-time bidirectional communication for building interactive chat experiences with UiPath AI Agents. This guide covers how to use WebSocket streaming for live conversations.

## Overview

Conversation interaction uses asynchronous events for streaming input and output content. This enables real-time output streaming to deliver LLM responses word-by-word as they're generated.

## Event Protocol

All WebSocket communication uses a hierarchical JSON event structure. Every event contains a `conversationId` and optional sub-events for different levels of the conversation.

### Event Hierarchy

```
ConversationEvent
├── conversationId (required)
├── Session Events (startSession, sessionStarted, sessionEnding, endSession)
├── exchange
│   ├── exchangeId
│   ├── startExchange / endExchange
│   └── message
│       ├── messageId
│       ├── startMessage (role: user|assistant|system) / endMessage
│       ├── contentPart
│       │   ├── contentPartId
│       │   ├── startContentPart (mimeType, name?, externalValue?)
│       │   ├── chunk (data, citation?)
│       │   └── endContentPart
│       ├── toolCall
│       │   ├── toolCallId
│       │   ├── startToolCall (toolName, input?)
│       │   └── endToolCall (output?, isError?, cancelled?)
│       └── interrupt
│           ├── interruptId
│           ├── startInterrupt (type, value)
│           └── endInterrupt
├── labelUpdated
├── conversationError
└── metaEvent
```

### Raw Event Examples

**Session Start (Client → Server)**
```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "startSession": {
    "capabilities": {
      "mimeTypesHandled": ["text/plain", "text/markdown"]
    }
  }
}
```

**Session Started (Server → Client)**
```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "sessionStarted": {
    "capabilities": {
      "mimeTypesEmitted": ["text/markdown"]
    }
  }
}
```

**Exchange with User Message (Client → Server)**
```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "startExchange": {
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
      "startMessage": {
        "role": "user",
        "timestamp": "2024-01-15T10:30:00.100Z"
      }
    }
  }
}
```

**Content Part with Streaming Chunks (Server → Client)**
```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "B2C3D4E5-F6A7-8901-BCDE-F23456789012",
      "contentPart": {
        "contentPartId": "C3D4E5F6-A7B8-9012-CDEF-345678901234",
        "startContentPart": {
          "mimeType": "text/markdown",
          "timestamp": "2024-01-15T10:30:01.000Z"
        }
      }
    }
  }
}
```

```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "B2C3D4E5-F6A7-8901-BCDE-F23456789012",
      "contentPart": {
        "contentPartId": "C3D4E5F6-A7B8-9012-CDEF-345678901234",
        "chunk": {
          "data": "The capital of France is "
        }
      }
    }
  }
}
```

```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "B2C3D4E5-F6A7-8901-BCDE-F23456789012",
      "contentPart": {
        "contentPartId": "C3D4E5F6-A7B8-9012-CDEF-345678901234",
        "chunk": {
          "data": "Paris.",
          "citation": {
            "citationId": "CIT-001",
            "startCitation": {},
            "endCitation": {
              "sources": [
                { "title": "Wikipedia", "number": 1, "url": "https://en.wikipedia.org/wiki/Paris" }
              ]
            }
          }
        }
      }
    }
  }
}
```

**Tool Call Event (Server → Client)**
```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "D4E5F6A7-B8C9-0123-DEFG-456789012345",
      "toolCall": {
        "toolCallId": "TC-001",
        "startToolCall": {
          "toolName": "get_weather",
          "input": { "city": "Paris" },
          "timestamp": "2024-01-15T10:30:02.000Z"
        }
      }
    }
  }
}
```

```json
{
  "conversationId": "941d0be0-ba10-4dfe-8c8b-9833b8a03ea2",
  "exchange": {
    "exchangeId": "7DEF531D-00D2-41DC-BE0D-C845763FABAA",
    "message": {
      "messageId": "D4E5F6A7-B8C9-0123-DEFG-456789012345",
      "toolCall": {
        "toolCallId": "TC-001",
        "endToolCall": {
          "output": { "temperature": "22C", "condition": "sunny" },
          "timestamp": "2024-01-15T10:30:03.000Z"
        }
      }
    }
  }
}
```

## Session Management

Conversation events are sent and received within a session. A conversation can have multiple sessions over its lifetime, and multiple clients can connect to the same conversation simultaneously - input events are shared and output events are broadcast to all clients.

### Starting a Session

Send a start session event to initiate a session. Wait for the `sessionStarted` event before starting exchanges.

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';

const sdk = new UiPath({
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'myorg',
  tenantName: 'mytenant',
  // OAuth config or secret required - see Authentication guide
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'ConversationalAgents'
});
await sdk.initialize();

const conversationalAgentService = new ConversationalAgent(sdk);

// Create conversation first (HTTP API)
const conversation = await conversationalAgentService.conversations.create({
  agentReleaseId: 123,
  folderId: 456
});

// Start real-time session (WebSocket)
const session = conversationalAgentService.events.startSession({
  conversationId: conversation.id
});

session.onSessionStarted((event) => {
  console.log('Session ready!', event.capabilities);
  // Now safe to start exchanges
});
```

### Echo Mode

When you send a user message, it goes to the server but normally your handlers only receive the assistant's response. With `echo: true`, your own sent messages are also dispatched to your handlers locally.

```typescript
const session = conversationalAgentService.events.startSession({
  conversationId: conversation.id,
  echo: true
});

// With echo: true, onMessageStart receives BOTH:
// - User messages (immediately when you send them)
// - Assistant messages (when the server responds)
exchange.onMessageStart((message) => {
  // This single handler can render all messages
  renderMessage(message);
});
```

This simplifies chat UI code since you can use one handler to render all messages instead of manually adding user messages before sending.

### Ending a Session

End the session when the user is finished or temporarily away:

```typescript
session.sendSessionEnd();
```

### Handling Session Ending (Server-Initiated)

The server sends a `sessionEnding` event when it needs the client to disconnect (deployment, timeout, etc.). End the session gracefully when the current exchange completes:

```typescript
let sessionEnding = false;

session.onSessionEnding((event) => {
  console.log(`Session ending in ${event.timeToLiveMS}ms`);
  sessionEnding = true;
});

// When exchange completes, check if we need to end
exchange.onExchangeEnd(() => {
  if (sessionEnding) {
    sessionEnding = false;
    session.sendSessionEnd();
    // Can immediately start a new session if needed
  }
});
```

### Session End

Handle session termination:

```typescript
session.onSessionEnd((event) => {
  console.log('Session ended');
  // Clean up resources
});
```

## Starting an Exchange

Once `sessionStarted` is received, start an exchange to send and receive messages. An exchange represents a request-response pair - started by the client with an input message, ended by the agent after producing output.

```typescript
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  // Send message and register handlers...
});
```

You can also provide options:

```typescript
const exchange = session.startExchange({
  exchangeId: 'custom-id',  // Optional: provide your own ID
  metadata: { source: 'web-client' }
});
```

## Sending Input Messages

Messages are composed of content parts. Most messages have a single text content part.

### Simple Text Message

```typescript
exchange.sendMessageWithContentPart({
  data: 'What is the capital of France?'
});
```

### Multiple Content Parts

For messages with multiple parts (e.g., text + file attachment), use the callback pattern:

```typescript
await exchange.startMessage({ role: 'user' }, async (message) => {
  await message.sendContentPart({
    mimeType: 'text/plain',
    data: 'Please analyze this document'
  });

  await message.sendContentPart({
    mimeType: 'application/pdf',
    name: 'document.pdf',
    externalValue: { uri: attachmentUri }
  });
});
```

### File Attachments

Upload files via HTTP API first, then reference them in the message:

```typescript
// Upload attachment
const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
const attachment = await conversationalAgentService.conversations.attachments.upload(
  conversation.id,
  file
);

// Send message with attachment
await exchange.startMessage({ role: 'user' }, async (message) => {
  await message.sendContentPart({
    mimeType: 'text/plain',
    data: 'Please analyze this document'
  });

  await message.sendContentPart({
    mimeType: attachment.mimeType,
    name: attachment.name,
    externalValue: { uri: attachment.uri }
  });
});
```

## Processing Output Messages

Register event handlers **before** sending input to avoid missing events.

### Streaming Response

Process chunks as they arrive for real-time UI updates:

```typescript
exchange.onMessageStart((message) => {
  message.onContentPartStart((contentPart) => {
    contentPart.onChunk((chunk) => {
      process.stdout.write(chunk.data ?? '');
    });
  });

  message.onToolCallStart((toolCall) => {
    console.log(`Calling tool: ${toolCall.startEvent.toolName}`);
  });
});

exchange.onExchangeEnd(() => {
  console.log('Exchange complete');
});
```

### Complete Message

Use `onMessageCompleted` to receive the full message after streaming completes:

```typescript
exchange.onMessageCompleted(({ messageId, role, contentParts, toolCalls }) => {
  contentParts.forEach(({ data, citations }) => {
    console.log('Content:', data);
    citations.forEach(({ sources }) => console.log('Sources:', sources));
  });

  toolCalls.forEach(({ toolName, output, isError }) => {
    console.log('Tool result:', { toolName, output, isError });
  });
});
```

## Handling Interrupts

Interrupts allow agents to pause execution and request user confirmation. The SDK supports tool call confirmation interrupts.

```typescript
import { InterruptType, ToolCallConfirmationValue } from '@uipath/uipath-typescript/conversational-agent';

exchange.onMessageStart((message) => {
  message.onInterruptStart(({ interruptId, startEvent }) => {
    if (startEvent.type === InterruptType.ToolCallConfirmation) {
      const confirmation = startEvent.value as ToolCallConfirmationValue;

      console.log(`Tool "${confirmation.toolName}" requires confirmation`);
      console.log('Input:', confirmation.inputValue);

      // Prompt user for approval...

      // To APPROVE (optionally with modified input):
      message.sendInterruptEnd(interruptId, {
        type: InterruptType.ToolCallConfirmation,
        value: {
          approved: true,
          input: confirmation.inputValue  // or modified input
        }
      });

      // To CANCEL:
      // message.sendInterruptEnd(interruptId, {
      //   type: InterruptType.ToolCallConfirmation,
      //   value: { approved: false }
      // });
    }
  });
});
```

**ToolCallConfirmationValue structure:**
```typescript
interface ToolCallConfirmationValue {
  toolCallId: string;      // ID of the tool call
  toolName: string;        // Name of the tool to execute
  inputSchema: JSONValue;  // JSON Schema for input validation
  inputValue?: JSONValue;  // Pre-filled input values
}
```

## Error Handling

Errors can occur at multiple levels (session, exchange, message, content part, tool call). Each level has `onErrorStart` and `onErrorEnd` handlers.

### Scoped Errors

```typescript
// Session-level errors
session.onErrorStart(({ errorId, message, details }) => {
  console.error('Session error:', message);
});

// Exchange-level errors
exchange.onErrorStart(({ errorId, message, details }) => {
  console.error('Exchange error:', message);
});
```

### Global Error Handler

Catch errors from any level:

```typescript
conversationalAgentService.events.onAnyErrorStart(({ source, errorId, message }) => {
  console.error('Error from', source.toString(), ':', message);
});

conversationalAgentService.events.onAnyErrorEnd(({ errorId }) => {
  // Error cleared - can update UI
});
```

## Label Updates

Handle conversation label changes (auto-generated or manual):

```typescript
session.onLabelUpdated(({ label, autogenerated }) => {
  console.log('Label updated:', label, autogenerated ? '(auto)' : '(manual)');
});
```

## Complete Example

```typescript
// Import SDK core
import { UiPath } from '@uipath/uipath-typescript/core';

// Import conversational agent service and types
import {
  ConversationalAgent,
  MessageRole
} from '@uipath/uipath-typescript/conversational-agent';

async function chat() {
  // 1. Initialize SDK with OAuth
  const sdk = new UiPath({
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'myorg',
    tenantName: 'mytenant',
    clientId: 'your-client-id',
    redirectUri: 'http://localhost:3000/callback',
    scope: 'ConversationalAgents'
  });
  await sdk.initialize();

  // 2. Create conversational agent service
  const conversationalAgentService = new ConversationalAgent(sdk);

  // 3. Get available agents
  const agents = await conversationalAgentService.agents.getAll();
  const selectedAgent = agents[0];
  console.log('Selected agent:', selectedAgent.name);

  // 4. Create a conversation
  const conversation = await conversationalAgentService.conversations.create({
    agentReleaseId: selectedAgent.id,
    folderId: selectedAgent.folderId
  });
  console.log('Created conversation:', conversation.id);

  // 5. Track session state
  let sessionEnding = false;

  // 6. Start real-time session
  const session = conversationalAgentService.events.startSession({
    conversationId: conversation.id
  });

  // 7. Handle session started - now safe to send messages
  session.onSessionStarted(() => {
    console.log('Session started');

    // 8. Start an exchange
    const exchange = session.startExchange();

    // 9. Register message handlers BEFORE sending
    exchange.onMessageStart((message) => {
      // Only process assistant messages
      if (message.startEvent.role === MessageRole.Assistant) {
        message.onContentPartStart((contentPart) => {
          // Stream response chunks
          contentPart.onChunk((chunk) => {
            process.stdout.write(chunk.data ?? '');
          });
        });

        message.onToolCallStart((toolCall) => {
          console.log(`\n[Tool: ${toolCall.startEvent.toolName}]`);
        });
      }
    });

    exchange.onExchangeEnd(() => {
      console.log('\n--- Exchange complete ---');
      if (sessionEnding) {
        session.sendSessionEnd();
      }
    });

    // 10. Send user message
    exchange.sendMessageWithContentPart({
      data: 'Hello! What can you help me with?'
    });
  });

  // 11. Handle server-initiated session ending
  session.onSessionEnding((event) => {
    console.log(`Session ending in ${event.timeToLiveMS}ms`);
    sessionEnding = true;
  });

  // 12. Handle label updates
  session.onLabelUpdated(({ label }) => {
    console.log(`Label: ${label}`);
  });

  // 13. Handle errors
  session.onErrorStart(({ message }) => {
    console.error('Error:', message);
  });

  // 14. Handle session end
  session.onSessionEnd(() => {
    console.log('Session ended');
  });
}

chat().catch(console.error);
```

## API Reference

For detailed API documentation, see:

- [ConversationalAgentServiceModel](api/interfaces/ConversationalAgentServiceModel.md) - Main service
- [SessionEventHelperModel](api/interfaces/SessionEventHelperModel.md) - Session management
- [ExchangeEventHelperModel](api/interfaces/ExchangeEventHelperModel.md) - Exchange handling
- [MessageEventHelperModel](api/interfaces/MessageEventHelperModel.md) - Message handling
- [ContentPartEventHelperModel](api/interfaces/ContentPartEventHelperModel.md) - Content streaming
- [ToolCallEventHelperModel](api/interfaces/ToolCallEventHelperModel.md) - Tool call handling
