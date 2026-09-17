Real-time WebSocket session for two-way communication within a [Conversation](../ConversationServiceModel/).

Send messages and receive agent responses through a nested stream hierarchy. The `SessionStream` is the top-level entry point — events flow down through exchanges, messages, content parts, and tool calls.

### Usage

**Important:** Always wait for `onSessionStarted` before calling `startExchange`. The session must be fully connected via WebSocket before exchanges can be sent — calling `startExchange` earlier may lose events or cause errors.

```
const session = conversation.startSession();

// Set up handlers for incoming assistant responses
session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    if (message.isAssistant) {
      message.onContentPartStart((part) => {
        if (part.isMarkdown) {
          part.onChunk((chunk) => {
            process.stdout.write(chunk.data ?? '');
          });
        }
      });
    }
  });
});

// Wait for the session to be ready, then send a message
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({
    data: 'Hello!',
    role: MessageRole.User
  });
});

// End the session when done
conversation.endSession();
```

### Related Streams

| Stream                                     | Description                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [ExchangeStream](../ExchangeStream/)       | A single request-response cycle within a session. Contains user and assistant messages.               |
| [MessageStream](../MessageStream/)         | A single message (user, assistant, or system). Contains content parts and tool calls.                 |
| [ContentPartStream](../ContentPartStream/) | A piece of streamed content (text, audio, image, transcript). Delivers data via `onChunk`.            |
| [ToolCallStream](../ToolCallStream/)       | An external tool invocation by the assistant. Has a start event (name, input) and end event (output). |

## Properties

| Property         | Modifier   | Type                          | Description                                        |
| ---------------- | ---------- | ----------------------------- | -------------------------------------------------- |
| `conversationId` | `readonly` | `string`                      | The conversation ID this session belongs to        |
| `ended`          | `readonly` | `boolean`                     | Whether this session has ended                     |
| `exchanges`      | `readonly` | `Iterable`\<`ExchangeStream`> | Iterator over all active exchanges in this session |

## Methods

### getExchange()

> **getExchange**(`exchangeId`: `string`): `undefined` | `ExchangeStream`

Retrieves an exchange by ID

#### Parameters

- `exchangeId`: `string` — The exchange ID to look up

#### Returns

`undefined` | `ExchangeStream`

The exchange stream, or undefined if not found

### onErrorEnd()

> **onErrorEnd**(`cb`: (`error`: { `errorId`: `string`; } & `ErrorEndEvent`) => `void`): () => `void`

Registers a handler for error end events at the session level

#### Parameters

- `cb`: (`error`: { `errorId`: `string`; } & `ErrorEndEvent`) => `void` — Callback receiving the error end event

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onErrorEnd((error) => {
  console.log(`Error ${error.errorId} resolved`);
});
```

### onErrorStart()

> **onErrorStart**(`cb`: (`error`: { `errorId`: `string`; } & `ErrorStartEvent`) => `void`): () => `void`

Registers a handler for error start events at the session level

#### Parameters

- `cb`: (`error`: { `errorId`: `string`; } & `ErrorStartEvent`) => `void` — Callback receiving the error event

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onErrorStart((error) => {
  console.error(`Session error [${error.errorId}]: ${error.message}`);
});
```

### onExchangeStart()

> **onExchangeStart**(`cb`: (`exchange`: `ExchangeStream`) => `void`): () => `void`

Registers a handler for exchange start events

This is the primary entry point for handling agent responses. Each exchange represents a request-response cycle containing user and assistant messages.

#### Parameters

- `cb`: (`exchange`: `ExchangeStream`) => `void` — Callback receiving each new exchange

#### Returns

Cleanup function to remove the handler

#### Examples

```
session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    if (message.isAssistant) {
      message.onContentPartStart((part) => {
        if (part.isMarkdown) {
          part.onChunk((chunk) => renderMarkdown(chunk.data ?? ''));
        } else if (part.isAudio) {
          part.onChunk((chunk) => audioPlayer.enqueue(chunk.data ?? ''));
        } else if (part.isImage) {
          part.onChunk((chunk) => imageBuffer.append(chunk.data ?? ''));
        } else if (part.isTranscript) {
          part.onChunk((chunk) => showTranscript(chunk.data ?? ''));
        }
      });
    }
  });
});
```

```
session.onExchangeStart((exchange) => {
  exchange.onMessageCompleted((completed) => {
    console.log(`Message ${completed.messageId} (role: ${completed.role})`);
    for (const part of completed.contentParts) {
      console.log(part.data);
    }
    for (const tool of completed.toolCalls) {
      console.log(`${tool.toolName} → ${tool.output}`);
    }
  });
});
```

```
session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    if (message.isAssistant) {
      // Stream tool call events
      message.onToolCallStart((toolCall) => {
        const { toolName, input } = toolCall.startEvent;
        console.log(`Calling ${toolName}:`, JSON.parse(input ?? '{}'));
        toolCall.onToolCallEnd((end) => {
          console.log(`Result:`, JSON.parse(end.output ?? '{}'));
        });
      });

      // Handle confirmation interrupts
      message.onInterruptStart(({ interruptId, startEvent }) => {
        if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
          message.sendInterruptEnd(interruptId, { approved: true });
        }
      });
    }
  });
});
```

### onLabelUpdated()

> **onLabelUpdated**(`cb`: (`event`: `LabelUpdatedEvent`) => `void`): () => `void`

Registers a handler for conversation label updates

Fired when the conversation label changes, typically when the server auto-generates a title based on the first message.

#### Parameters

- `cb`: (`event`: `LabelUpdatedEvent`) => `void` — Callback receiving the [LabelUpdatedEvent](../LabelUpdatedEvent/) with the new label

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onLabelUpdated((event) => {
  console.log(`New label: ${event.label} (auto: ${event.autogenerated})`);
  updateConversationTitle(event.label);
});
```

### onSessionEnd()

> **onSessionEnd**(`cb`: (`event`: `SessionEndEvent`) => `void`): () => `void`

Registers a handler for session end events

Fired when the session has fully closed.

#### Parameters

- `cb`: (`event`: `SessionEndEvent`) => `void` — Callback receiving the end event

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onSessionEnd((event) => {
  console.log('Session ended');
});
```

### onSessionEnding()

> **onSessionEnding**(`cb`: (`event`: `SessionEndingEvent`) => `void`): () => `void`

Registers a handler for session ending events

Fired when the session is about to end. Use this for cleanup before the session fully closes.

#### Parameters

- `cb`: (`event`: `SessionEndingEvent`) => `void` — Callback receiving the ending event

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onSessionEnding((event) => {
  console.log('Session is ending, performing cleanup...');
});
```

### onSessionStarted()

> **onSessionStarted**(`cb`: (`event`: `SessionStartedEvent`) => `void`): () => `void`

Registers a handler for session started events

Fired when the WebSocket connection is established and the session is ready to send and receive events.

#### Parameters

- `cb`: (`event`: `SessionStartedEvent`) => `void` — Callback receiving the started event

#### Returns

Cleanup function to remove the handler

#### Example

```
session.onSessionStarted(() => {
  console.log('Session is ready — now safe to start exchanges');

  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({
    data: 'Hello!',
    role: MessageRole.User
  });
});
```

### startExchange()

> **startExchange**(`args?`: { `exchangeId?`: `string`; } & `ExchangeStartEvent`): `ExchangeStream`

Starts a new exchange in this session

Each exchange is a request-response cycle. Use `sendMessageWithContentPart` on the returned [ExchangeStream](../ExchangeStream/) to send a user message, or `startMessage` for fine-grained control.

#### Parameters

- `args?`: { `exchangeId?`: `string`; } & `ExchangeStartEvent` — Optional exchange start options

#### Returns

`ExchangeStream`

The exchange stream for sending messages

#### Example

```
const session = conversation.startSession();

// Listen for all assistant responses
session.onExchangeStart((exchange) => {
  exchange.onMessageCompleted((completed) => {
    if (completed.role === MessageRole.Assistant) {
      for (const part of completed.contentParts) {
        console.log('Assistant:', part.data);
      }
    }
  });
});

// Wait for session to be ready before starting exchanges
session.onSessionStarted(async () => {
  // Send first user message
  const exchange1 = session.startExchange();
  await exchange1.sendMessageWithContentPart({
    data: 'What is the weather today?',
    role: MessageRole.User
  });

  // Send follow-up in a new exchange
  const exchange2 = session.startExchange();
  await exchange2.sendMessageWithContentPart({
    data: 'And tomorrow?',
    role: MessageRole.User
  });
});
```
