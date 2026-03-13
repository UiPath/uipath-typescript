Consumer-facing model for message event helpers.

A message represents a single turn from a user, assistant, or system. Messages contain content parts (text, audio, images) and tool calls. The `role` property and convenience booleans (`isUser`, `isAssistant`, `isSystem`) let you filter by sender.

## Examples

```
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
```

```
exchange.onMessageStart((message) => {
  if (message.isAssistant) {
    message.onToolCallStart((toolCall) => {
      console.log(`Tool: ${toolCall.startEvent.toolName}`);
    });

    message.onInterruptStart(({ interruptId, startEvent }) => {
      if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
        message.sendInterruptEnd(interruptId, { approved: true });
      }
    });
  }
});
```

```
exchange.onMessageStart((message) => {
  if (message.isAssistant) {
    message.onCompleted((completed) => {
      console.log(`Message ${completed.messageId} finished`);
      for (const part of completed.contentParts) {
        console.log(part.data);
      }
      for (const tool of completed.toolCalls) {
        console.log(`${tool.toolName} → ${tool.output}`);
      }
    });
  }
});
```

```
const message = exchange.startMessage({ role: MessageRole.User });
await message.sendContentPart({ data: 'Hello!', mimeType: 'text/plain' });
message.sendMessageEnd();
```

## Properties

| Property       | Modifier   | Type                                                      | Description                                            |
| -------------- | ---------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `contentParts` | `readonly` | `Iterable`\<[`ContentPartStream`](../ContentPartStream/)> | Iterator over all active content parts in this message |
| `ended`        | `readonly` | `boolean`                                                 | Whether this message has ended                         |
| `isAssistant`  | `readonly` | `boolean`                                                 | Whether this message is from the assistant             |
| `isSystem`     | `readonly` | `boolean`                                                 | Whether this message is a system message               |
| `isUser`       | `readonly` | `boolean`                                                 | Whether this message is from the user                  |
| `messageId`    | `readonly` | `string`                                                  | Unique identifier for this message                     |
| `role`         | `readonly` | `undefined`                                               | [`MessageRole`](../../enumerations/MessageRole/)       |
| `toolCalls`    | `readonly` | `Iterable`\<[`ToolCallStream`](../ToolCallStream/)>       | Iterator over all active tool calls in this message    |

## Methods

### getContentPart()

> **getContentPart**(`contentPartId`: `string`): `undefined` | [`ContentPartStream`](../ContentPartStream/)

Retrieves a content part by ID

#### Parameters

| Parameter       | Type     | Description                    |
| --------------- | -------- | ------------------------------ |
| `contentPartId` | `string` | The content part ID to look up |

#### Returns

`undefined` | [`ContentPartStream`](../ContentPartStream/)

The content part stream, or undefined if not found

______________________________________________________________________

### getToolCall()

> **getToolCall**(`toolCallId`: `string`): `undefined` | [`ToolCallStream`](../ToolCallStream/)

Retrieves a tool call by ID

#### Parameters

| Parameter    | Type     | Description                 |
| ------------ | -------- | --------------------------- |
| `toolCallId` | `string` | The tool call ID to look up |

#### Returns

`undefined` | [`ToolCallStream`](../ToolCallStream/)

The tool call stream, or undefined if not found

______________________________________________________________________

### onCompleted()

> **onCompleted**(`cb`: (`completedMessage`: { `contentParts`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: [`JSONObject`](../../type-aliases/JSONObject/); `role?`: [`MessageRole`](../../enumerations/MessageRole/); `timestamp?`: `string`; `toolCalls`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)[]; }) => `void`): `void`

Registers a handler called when the entire message finishes

The handler receives the aggregated message data including all completed content parts and tool calls.

#### Parameters

| Parameter | Type                                                                                                                                                                                                                                                                                                                                                                                                         | Description                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `cb`      | (`completedMessage`: { `contentParts`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: [`JSONObject`](../../type-aliases/JSONObject/); `role?`: [`MessageRole`](../../enumerations/MessageRole/); `timestamp?`: `string`; `toolCalls`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)[]; }) => `void` | Callback receiving the completed message data |

#### Returns

`void`

#### Example

```
message.onCompleted((completed) => {
  console.log(`Message ${completed.messageId} (role: ${completed.role})`);
  console.log('Text:', completed.contentParts.map(p => p.data).join(''));
  console.log('Tool calls:', completed.toolCalls.length);
});
```

______________________________________________________________________

### onContentPartCompleted()

> **onContentPartCompleted**(`cb`: (`completedContentPart`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)) => `void`): `void`

Registers a handler called when a content part finishes

Convenience method that combines onContentPartStart + onContentPartEnd. The handler receives the full buffered content part data including text, citations, and any citation errors.

#### Parameters

| Parameter | Type                                                                                                   | Description                                        |
| --------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `cb`      | (`completedContentPart`: [`CompletedContentPart`](../../type-aliases/CompletedContentPart/)) => `void` | Callback receiving the completed content part data |

#### Returns

`void`

#### Example

```
message.onContentPartCompleted((completed) => {
  console.log(`[${completed.mimeType}] ${completed.data}`);

  // Access citations if present
  for (const citation of completed.citations) {
    const citedText = completed.data.substring(citation.offset, citation.offset + citation.length);
    console.log(`Citation "${citedText}" from:`, citation.sources);
  }

  // Check for citation errors
  for (const error of completed.citationErrors) {
    console.warn(`Citation error [${error.citationId}]: ${error.errorType}`);
  }
});
```

______________________________________________________________________

### onContentPartStart()

> **onContentPartStart**(`cb`: (`contentPart`: [`ContentPartStream`](../ContentPartStream/)) => `void`): () => `void`

Registers a handler for content part start events

Content parts are streamed pieces of content (text, audio, images, transcripts). Use `part.isMarkdown`, `part.isAudio`, etc. to determine type.

#### Parameters

| Parameter | Type                                                                    | Description                              |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `cb`      | (`contentPart`: [`ContentPartStream`](../ContentPartStream/)) => `void` | Callback receiving each new content part |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
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
```

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
message.onErrorStart((error) => {
  console.error(`Message error [${error.errorId}]: ${error.message}`);
});
```

______________________________________________________________________

### onInterruptEnd()

> **onInterruptEnd**(`cb`: (`interrupt`: { `endEvent`: [`InterruptEndEvent`](../../type-aliases/InterruptEndEvent/); `interruptId`: `string`; }) => `void`): () => `void`

Registers a handler for interrupt end events

#### Parameters

| Parameter | Type                                                                                                                            | Description                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `cb`      | (`interrupt`: { `endEvent`: [`InterruptEndEvent`](../../type-aliases/InterruptEndEvent/); `interruptId`: `string`; }) => `void` | Callback receiving the interrupt ID and end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
message.onInterruptEnd(({ interruptId, endEvent }) => {
  console.log(`Interrupt ${interruptId} resolved`);
});
```

______________________________________________________________________

### onInterruptStart()

> **onInterruptStart**(`cb`: (`interrupt`: { `interruptId`: `string`; `startEvent`: [`InterruptStartEvent`](../../type-aliases/InterruptStartEvent/); }) => `void`): () => `void`

Registers a handler for interrupt start events

Interrupts represent pause points where the agent needs external input, such as tool call confirmation requests.

#### Parameters

| Parameter | Type                                                                                                                                  | Description                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `cb`      | (`interrupt`: { `interruptId`: `string`; `startEvent`: [`InterruptStartEvent`](../../type-aliases/InterruptStartEvent/); }) => `void` | Callback receiving the interrupt ID and start event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
message.onInterruptStart(({ interruptId, startEvent }) => {
  if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
    // Show confirmation UI, then respond
    message.sendInterruptEnd(interruptId, { approved: true });
  }
});
```

______________________________________________________________________

### onMessageEnd()

> **onMessageEnd**(`cb`: (`endMessage`: [`MessageEndEvent`](../MessageEndEvent/)) => `void`): () => `void`

Registers a handler for message end events

#### Parameters

| Parameter | Type                                                               | Description                      |
| --------- | ------------------------------------------------------------------ | -------------------------------- |
| `cb`      | (`endMessage`: [`MessageEndEvent`](../MessageEndEvent/)) => `void` | Callback receiving the end event |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
message.onMessageEnd((endEvent) => {
  console.log('Message ended');
});
```

______________________________________________________________________

### onToolCallCompleted()

> **onToolCallCompleted**(`cb`: (`completedToolCall`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)) => `void`): `void`

Registers a handler called when a tool call finishes

Convenience method that combines onToolCallStart + onToolCallEnd. The handler receives the merged start and end event data.

#### Parameters

| Parameter | Type                                                                                          | Description                                     |
| --------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `cb`      | (`completedToolCall`: [`CompletedToolCall`](../../type-aliases/CompletedToolCall/)) => `void` | Callback receiving the completed tool call data |

#### Returns

`void`

#### Example

```
message.onToolCallCompleted((toolCall) => {
  console.log(`Tool: ${toolCall.toolName}`);
  console.log(`Input: ${toolCall.input}`);
  console.log(`Output: ${toolCall.output}`);
});
```

______________________________________________________________________

### onToolCallStart()

> **onToolCallStart**(`cb`: (`toolCall`: [`ToolCallStream`](../ToolCallStream/)) => `void`): () => `void`

Registers a handler for tool call start events

Tool calls represent the agent invoking external tools. Each tool call has a name, input, and eventually an output when it completes.

#### Parameters

| Parameter | Type                                                           | Description                           |
| --------- | -------------------------------------------------------------- | ------------------------------------- |
| `cb`      | (`toolCall`: [`ToolCallStream`](../ToolCallStream/)) => `void` | Callback receiving each new tool call |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

#### Example

```
message.onToolCallStart((toolCall) => {
  const { toolName, input } = toolCall.startEvent;
  console.log(`Calling ${toolName}:`, JSON.parse(input ?? '{}'));

  toolCall.onToolCallEnd((end) => {
    console.log(`Result:`, JSON.parse(end.output ?? '{}'));
  });
});
```

______________________________________________________________________

### sendContentPart()

> **sendContentPart**(`args`: { `data?`: `string`; `mimeType?`: `string`; }): `Promise`\<`void`>

Sends a complete content part with data in one step

Convenience method that creates a content part, sends the data as a chunk, and ends the content part. Defaults to mimeType "text/markdown".

#### Parameters

| Parameter        | Type                                          | Description                              |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| `args`           | { `data?`: `string`; `mimeType?`: `string`; } | Content part data and optional mime type |
| `args.data?`     | `string`                                      | -                                        |
| `args.mimeType?` | `string`                                      | -                                        |

#### Returns

`Promise`\<`void`>

#### Examples

```
await message.sendContentPart({ data: 'Hello world!' });
```

```
await message.sendContentPart({
  data: 'Plain text content',
  mimeType: 'text/plain'
});
```

______________________________________________________________________

### sendInterruptEnd()

> **sendInterruptEnd**(`interruptId`: `string`, `endInterrupt`: [`InterruptEndEvent`](../../type-aliases/InterruptEndEvent/)): `void`

Sends an interrupt end event to resolve a pending interrupt

Call this to respond to an interrupt received via onInterruptStart.

#### Parameters

| Parameter      | Type                                                         | Description                                                   |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `interruptId`  | `string`                                                     | The interrupt ID to respond to                                |
| `endInterrupt` | [`InterruptEndEvent`](../../type-aliases/InterruptEndEvent/) | The response data (e.g., approval for tool call confirmation) |

#### Returns

`void`

#### Example

```
message.sendInterruptEnd(interruptId, { approved: true });
```

______________________________________________________________________

### sendMessageEnd()

> **sendMessageEnd**(`endMessage?`: [`MessageEndEvent`](../MessageEndEvent/)): `void`

Ends the message

#### Parameters

| Parameter     | Type                                     | Description             |
| ------------- | ---------------------------------------- | ----------------------- |
| `endMessage?` | [`MessageEndEvent`](../MessageEndEvent/) | Optional end event data |

#### Returns

`void`

#### Example

```
message.sendMessageEnd();
```

______________________________________________________________________

### startContentPart()

> **startContentPart**(`args`: { `contentPartId?`: `string`; } & [`ContentPartStartEvent`](../ContentPartStartEvent/)): [`ContentPartStream`](../ContentPartStream/)

Starts a new content part stream in this message

Use this for streaming content in chunks. For sending complete content in one call, prefer [sendContentPart](#sendcontentpart).

#### Parameters

| Parameter | Type                                                                                   | Description                                    |
| --------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `args`    | { `contentPartId?`: `string`; } & [`ContentPartStartEvent`](../ContentPartStartEvent/) | Content part start options including mime type |

#### Returns

[`ContentPartStream`](../ContentPartStream/)

The content part stream for sending chunks

#### Example

```
const part = message.startContentPart({ mimeType: 'text/markdown' });
part.sendChunk({ data: '# Hello\n' });
part.sendChunk({ data: 'This is **markdown** content.' });
part.sendContentPartEnd();
```

______________________________________________________________________

### startToolCall()

> **startToolCall**(`args`: { `toolCallId?`: `string`; } & [`ToolCallStartEvent`](../ToolCallStartEvent/)): [`ToolCallStream`](../ToolCallStream/)

Starts a new tool call in this message

#### Parameters

| Parameter | Type                                                                          | Description                                 |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| `args`    | { `toolCallId?`: `string`; } & [`ToolCallStartEvent`](../ToolCallStartEvent/) | Tool call start options including tool name |

#### Returns

[`ToolCallStream`](../ToolCallStream/)

The tool call stream for managing the tool call lifecycle

#### Example

```
const toolCall = message.startToolCall({
  toolName: 'get-weather',
  input: JSON.stringify({ city: 'London' })
});
toolCall.sendToolCallEnd({
  output: JSON.stringify({ temperature: 18, condition: 'cloudy' })
});
```
