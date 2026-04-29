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

| Property       | Modifier   | Type                             | Description                                            |
| -------------- | ---------- | -------------------------------- | ------------------------------------------------------ |
| `contentParts` | `readonly` | `Iterable`\<`ContentPartStream`> | Iterator over all active content parts in this message |
| `ended`        | `readonly` | `boolean`                        | Whether this message has ended                         |
| `isAssistant`  | `readonly` | `boolean`                        | Whether this message is from the assistant             |
| `isSystem`     | `readonly` | `boolean`                        | Whether this message is a system message               |
| `isUser`       | `readonly` | `boolean`                        | Whether this message is from the user                  |
| `messageId`    | `readonly` | `string`                         | Unique identifier for this message                     |
| `role`         | `readonly` | `undefined`                      | `MessageRole`                                          |
| `toolCalls`    | `readonly` | `Iterable`\<`ToolCallStream`>    | Iterator over all active tool calls in this message    |

## Methods

### getContentPart()

> **getContentPart**(`contentPartId`: `string`): `undefined` | `ContentPartStream`

Retrieves a content part by ID

#### Parameters

- `contentPartId`: `string` — The content part ID to look up

#### Returns

`undefined` | `ContentPartStream`

The content part stream, or undefined if not found

### getToolCall()

> **getToolCall**(`toolCallId`: `string`): `undefined` | `ToolCallStream`

Retrieves a tool call by ID

#### Parameters

- `toolCallId`: `string` — The tool call ID to look up

#### Returns

`undefined` | `ToolCallStream`

The tool call stream, or undefined if not found

### onCompleted()

> **onCompleted**(`cb`: (`completedMessage`: { `contentParts`: `CompletedContentPart`[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: `JSONObject`; `role?`: `MessageRole`; `timestamp?`: `string`; `toolCalls`: `CompletedToolCall`[]; }) => `void`): `void`

Registers a handler called when the entire message finishes

The handler receives the aggregated message data including all completed content parts and tool calls.

#### Parameters

- `cb`: (`completedMessage`: { `contentParts`: `CompletedContentPart`[]; `exchangeSequence?`: `number`; `messageId`: `string`; `metaData?`: `JSONObject`; `role?`: `MessageRole`; `timestamp?`: `string`; `toolCalls`: `CompletedToolCall`[]; }) => `void` — Callback receiving the completed message data

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

### onContentPartCompleted()

> **onContentPartCompleted**(`cb`: (`completedContentPart`: `CompletedContentPart`) => `void`): `void`

Registers a handler called when a content part finishes

Convenience method that combines onContentPartStart + onContentPartEnd. The handler receives the full buffered content part data including text, citations, and any citation errors.

#### Parameters

- `cb`: (`completedContentPart`: `CompletedContentPart`) => `void` — Callback receiving the completed content part data

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

### onContentPartStart()

> **onContentPartStart**(`cb`: (`contentPart`: `ContentPartStream`) => `void`): () => `void`

Registers a handler for content part start events

Content parts are streamed pieces of content (text, audio, images, transcripts). Use `part.isMarkdown`, `part.isAudio`, etc. to determine type.

#### Parameters

- `cb`: (`contentPart`: `ContentPartStream`) => `void` — Callback receiving each new content part

#### Returns

Cleanup function to remove the handler

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

### onErrorEnd()

> **onErrorEnd**(`cb`: (`error`: { `errorId`: `string`; } & `ErrorEndEvent`) => `void`): () => `void`

Registers a handler for error end events

#### Parameters

- `cb`: (`error`: { `errorId`: `string`; } & `ErrorEndEvent`) => `void` — Callback receiving the error end event

#### Returns

Cleanup function to remove the handler

### onErrorStart()

> **onErrorStart**(`cb`: (`error`: { `errorId`: `string`; } & `ErrorStartEvent`) => `void`): () => `void`

Registers a handler for error start events

#### Parameters

- `cb`: (`error`: { `errorId`: `string`; } & `ErrorStartEvent`) => `void` — Callback receiving the error event

#### Returns

Cleanup function to remove the handler

#### Example

```
message.onErrorStart((error) => {
  console.error(`Message error [${error.errorId}]: ${error.message}`);
});
```

### onInterruptEnd()

> **onInterruptEnd**(`cb`: (`interrupt`: { `endEvent`: `InterruptEndEvent`; `interruptId`: `string`; }) => `void`): () => `void`

Registers a handler for interrupt end events

#### Parameters

- `cb`: (`interrupt`: { `endEvent`: `InterruptEndEvent`; `interruptId`: `string`; }) => `void` — Callback receiving the interrupt ID and end event

#### Returns

Cleanup function to remove the handler

#### Example

```
message.onInterruptEnd(({ interruptId, endEvent }) => {
  console.log(`Interrupt ${interruptId} resolved`);
});
```

### onInterruptStart()

> **onInterruptStart**(`cb`: (`interrupt`: { `interruptId`: `string`; `startEvent`: `InterruptStartEvent`; }) => `void`): () => `void`

Registers a handler for interrupt start events

Interrupts represent pause points where the agent needs external input, such as tool call confirmation requests.

#### Parameters

- `cb`: (`interrupt`: { `interruptId`: `string`; `startEvent`: `InterruptStartEvent`; }) => `void` — Callback receiving the interrupt ID and start event

#### Returns

Cleanup function to remove the handler

#### Example

```
message.onInterruptStart(({ interruptId, startEvent }) => {
  if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
    // Show confirmation UI, then respond
    message.sendInterruptEnd(interruptId, { approved: true });
  }
});
```

### onMessageEnd()

> **onMessageEnd**(`cb`: (`endMessage`: `MessageEndEvent`) => `void`): () => `void`

Registers a handler for message end events

#### Parameters

- `cb`: (`endMessage`: `MessageEndEvent`) => `void` — Callback receiving the end event

#### Returns

Cleanup function to remove the handler

#### Example

```
message.onMessageEnd((endEvent) => {
  console.log('Message ended');
});
```

### onToolCallCompleted()

> **onToolCallCompleted**(`cb`: (`completedToolCall`: `CompletedToolCall`) => `void`): `void`

Registers a handler called when a tool call finishes

Convenience method that combines onToolCallStart + onToolCallEnd. The handler receives the merged start and end event data.

#### Parameters

- `cb`: (`completedToolCall`: `CompletedToolCall`) => `void` — Callback receiving the completed tool call data

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

### onToolCallStart()

> **onToolCallStart**(`cb`: (`toolCall`: `ToolCallStream`) => `void`): () => `void`

Registers a handler for tool call start events

Tool calls represent the agent invoking external tools. Each tool call has a name, input, and eventually an output when it completes.

#### Parameters

- `cb`: (`toolCall`: `ToolCallStream`) => `void` — Callback receiving each new tool call

#### Returns

Cleanup function to remove the handler

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

### sendContentPart()

> **sendContentPart**(`args`: { `data?`: `string`; `mimeType?`: `string`; }): `Promise`\<`void`>

Sends a complete content part with data in one step

Convenience method that creates a content part, sends the data as a chunk, and ends the content part. Defaults to mimeType "text/markdown".

#### Parameters

- `args`: { `data?`: `string`; `mimeType?`: `string`; } — Content part data and optional mime type
- `args.data?`: `string` — -
- `args.mimeType?`: `string` — -

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

### sendInterruptEnd()

> **sendInterruptEnd**(`interruptId`: `string`, `endInterrupt`: `InterruptEndEvent`): `void`

Sends an interrupt end event to resolve a pending interrupt

Call this to respond to an interrupt received via onInterruptStart.

#### Parameters

- `interruptId`: `string` — The interrupt ID to respond to
- `endInterrupt`: `InterruptEndEvent` — The response data (e.g., approval for tool call confirmation)

#### Returns

`void`

#### Example

```
message.sendInterruptEnd(interruptId, { approved: true });
```

### sendMessageEnd()

> **sendMessageEnd**(`endMessage?`: `MessageEndEvent`): `void`

Ends the message

#### Parameters

- `endMessage?`: `MessageEndEvent` — Optional end event data

#### Returns

`void`

#### Example

```
message.sendMessageEnd();
```

### startContentPart()

> **startContentPart**(`args`: { `contentPartId?`: `string`; } & `ContentPartStartEvent`): `ContentPartStream`

Starts a new content part stream in this message

Use this for streaming content in chunks. For sending complete content in one call, prefer [sendContentPart](#sendcontentpart).

#### Parameters

- `args`: { `contentPartId?`: `string`; } & `ContentPartStartEvent` — Content part start options including mime type

#### Returns

`ContentPartStream`

The content part stream for sending chunks

#### Example

```
const part = message.startContentPart({ mimeType: 'text/markdown' });
part.sendChunk({ data: '# Hello\n' });
part.sendChunk({ data: 'This is **markdown** content.' });
part.sendContentPartEnd();
```

### startToolCall()

> **startToolCall**(`args`: { `toolCallId?`: `string`; } & `ToolCallStartEvent`): `ToolCallStream`

Starts a new tool call in this message

#### Parameters

- `args`: { `toolCallId?`: `string`; } & `ToolCallStartEvent` — Tool call start options including tool name

#### Returns

`ToolCallStream`

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
