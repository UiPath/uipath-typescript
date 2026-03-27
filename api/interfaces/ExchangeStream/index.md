Consumer-facing model for exchange event helpers.

An exchange represents a single request-response cycle within a session. Each exchange contains one or more messages (typically a user message followed by an assistant response). Use exchanges to group related turns in a multi-turn conversation.

## Examples

```
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
```

```
session.onExchangeStart((exchange) => {
  exchange.onMessageCompleted((completed) => {
    for (const part of completed.contentParts) {
      console.log(part.data);
    }
    for (const tool of completed.toolCalls) {
      console.log(`${tool.toolName}: ${tool.output}`);
    }
  });
});
```

```
// Call startExchange inside onSessionStarted to ensure the session is ready
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({
    data: 'Hello, how can you help me?',
    role: MessageRole.User
  });
});
```

```
// Call startExchange inside onSessionStarted to ensure the session is ready
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  const message = exchange.startMessage({ role: MessageRole.User });
  const part = message.startContentPart({ mimeType: 'text/plain' });
  part.sendChunk({ data: 'Hello, ' });
  part.sendChunk({ data: 'how can you help me?' });
  part.sendContentPartEnd();
  message.sendMessageEnd();
});
```

## Properties

| Property     | Modifier   | Type                                              | Description                                        |
| ------------ | ---------- | ------------------------------------------------- | -------------------------------------------------- |
| `ended`      | `readonly` | `boolean`                                         | Whether this exchange has ended                    |
| `exchangeId` | `readonly` | `string`                                          | Unique identifier for this exchange                |
| `messages`   | `readonly` | `Iterable`\<[`MessageStream`](../MessageStream/)> | Iterator over all active messages in this exchange |

## Methods

### getMessage()

> **getMessage**(`messageId`: `string`): `undefined` | [`MessageStream`](../MessageStream/)

Retrieves a message by ID

#### Parameters

| Parameter   | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `messageId` | `string` | The message ID to look up |

#### Returns

`undefined` | [`MessageStream`](../MessageStream/)

The message stream, or undefined if not found

______________________________________________________________________

### onErrorEnd()

> **onErrorEnd**(`cb`: (`error`: { `errorId`: `string`; } & [`ErrorEndEvent`](../ErrorEndEvent/)) => `void`): () => `void`

Registers a handler for error end events

#### Parameters

| Parameter | Type                                                                                 | Description                            |
| --------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `cb`      | (`error`: { `errorId`: `string`; } & [`ErrorEndEvent`](../ErrorEndEvent/)) => `void` | Callback receiving the error end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

______________________________________________________________________

### onErrorStart()

> **onErrorStart**(`cb`: (`error`: { `errorId`: `string`; } & [`ErrorStartEvent`](../ErrorStartEvent/)) => `void`): () => `void`

Registers a handler for error start events

#### Parameters

| Parameter | Type                                                                                     | Description                        |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| `cb`      | (`error`: { `errorId`: `string`; } & [`ErrorStartEvent`](../ErrorStartEvent/)) => `void` | Callback receiving the error event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
exchange.onErrorStart((error) => {
  console.error(`Exchange error [${error.errorId}]: ${error.message}`);
});
```

______________________________________________________________________

### onExchangeEnd()

> **onExchangeEnd**(`cb`: (`endExchange`: [`ExchangeEndEvent`](../ExchangeEndEvent/)) => `void`): () => `void`

Registers a handler for exchange end events

#### Parameters

| Parameter | Type                                                                  | Description                      |
| --------- | --------------------------------------------------------------------- | -------------------------------- |
| `cb`      | (`endExchange`: [`ExchangeEndEvent`](../ExchangeEndEvent/)) => `void` | Callback receiving the end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
exchange.onExchangeEnd((endEvent) => {
  console.log('Exchange completed');
});
```

______________________________________________________________________

### onMessageCompleted()

> **onMessageCompleted**(`cb`: (`completedMessage`: { `contentParts`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: [`JSONObject`](../../type-aliases/JSONObject/); `role?`: [`MessageRole`](../../enumerations/MessageRole/); `timestamp?`: `string`; `toolCalls`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)[]; }) => `void`): `void`

Registers a handler called when a message finishes

Convenience method that combines onMessageStart + message.onCompleted. The handler receives the aggregated message data including all content parts and tool calls.

#### Parameters

| Parameter | Type                                                                                                                                                                                                                                                                                                                                                                                                         | Description                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `cb`      | (`completedMessage`: { `contentParts`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: [`JSONObject`](../../type-aliases/JSONObject/); `role?`: [`MessageRole`](../../enumerations/MessageRole/); `timestamp?`: `string`; `toolCalls`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)[]; }) => `void` | Callback receiving the completed message data |

#### Returns

`void`

#### Example

```
exchange.onMessageCompleted((message) => {
  console.log(`Message ${message.messageId} (role: ${message.role})`);
  console.log(`Content parts: ${message.contentParts.length}`);
  console.log(`Tool calls: ${message.toolCalls.length}`);
});
```

______________________________________________________________________

### onMessageStart()

> **onMessageStart**(`cb`: (`message`: [`MessageStream`](../MessageStream/)) => `void`): () => `void`

Registers a handler for message start events

Each exchange typically contains a user message and an assistant response. Use `message.isAssistant` or `message.isUser` to filter.

#### Parameters

| Parameter | Type                                                        | Description                         |
| --------- | ----------------------------------------------------------- | ----------------------------------- |
| `cb`      | (`message`: [`MessageStream`](../MessageStream/)) => `void` | Callback receiving each new message |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
exchange.onMessageStart((message) => {
  if (message.isAssistant) {
    message.onContentPartStart((part) => {
      if (part.isMarkdown) {
        part.onChunk((chunk) => process.stdout.write(chunk.data ?? ''));
      }
    });
  }
});
```

______________________________________________________________________

### sendExchangeEnd()

> **sendExchangeEnd**(`endExchange?`: [`ExchangeEndEvent`](../ExchangeEndEvent/)): `void`

Ends the exchange

#### Parameters

| Parameter      | Type                                       | Description             |
| -------------- | ------------------------------------------ | ----------------------- |
| `endExchange?` | [`ExchangeEndEvent`](../ExchangeEndEvent/) | Optional end event data |

#### Returns

`void`

#### Example

```
exchange.sendExchangeEnd();
```

______________________________________________________________________

### sendMessageWithContentPart()

> **sendMessageWithContentPart**(`options`: { `data`: `string`; `mimeType?`: `string`; `role?`: [`MessageRole`](../../enumerations/MessageRole/); }): `Promise`\<`void`>

Sends a complete message with a content part in one step

Convenience method that creates a message, adds a content part with the given data, and ends both the content part and message.

#### Parameters

| Parameter           | Type                                                                                                    | Description             |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------- |
| `options`           | { `data`: `string`; `mimeType?`: `string`; `role?`: [`MessageRole`](../../enumerations/MessageRole/); } | Message content options |
| `options.data`      | `string`                                                                                                | -                       |
| `options.mimeType?` | `string`                                                                                                | -                       |
| `options.role?`     | [`MessageRole`](../../enumerations/MessageRole/)                                                        | -                       |

#### Returns

`Promise`\<`void`>

#### Example

```
await exchange.sendMessageWithContentPart({
  data: 'What is the weather today?',
  role: MessageRole.User
});
```

______________________________________________________________________

### startMessage()

> **startMessage**(`args?`: { `messageId?`: `string`; } & `Partial`\<[`MessageStartEvent`](../MessageStartEvent/)>): [`MessageStream`](../MessageStream/)

Starts a new message in this exchange

Use this for fine-grained control over message construction. For simple text messages, prefer [sendMessageWithContentPart](#sendmessagewithcontentpart).

#### Parameters

| Parameter | Type                                                                                   | Description                                   |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| `args?`   | { `messageId?`: `string`; } & `Partial`\<[`MessageStartEvent`](../MessageStartEvent/)> | Optional message start options including role |

#### Returns

[`MessageStream`](../MessageStream/)

The message stream for sending content

#### Example

```
const message = exchange.startMessage({ role: MessageRole.User });
const part = message.startContentPart({ mimeType: 'text/plain' });
part.sendChunk({ data: 'Analyze this image: ' });
part.sendContentPartEnd();
message.sendMessageEnd();
```
