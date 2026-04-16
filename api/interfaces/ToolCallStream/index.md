Consumer-facing model for tool call event helpers.

A tool call represents the agent invoking an external tool (API call, database query, etc.) during a conversation. Tool calls live within a message and have a start event (with tool name and input) and an end event (with the output/result).

## Examples

```
message.onToolCallStart((toolCall) => {
  console.log(`Tool: ${toolCall.startEvent.toolName}`);
  toolCall.onToolCallEnd((endEvent) => {
    console.log('Tool call completed:', endEvent.output);
  });
});
```

```
message.onToolCallStart((toolCall) => {
  const { toolName, input } = toolCall.startEvent;
  const parsedInput = JSON.parse(input ?? '{}');
  console.log(`Calling ${toolName} with:`, parsedInput);

  toolCall.onToolCallEnd((endEvent) => {
    const result = JSON.parse(endEvent.output ?? '{}');
    console.log(`${toolName} returned:`, result);
  });
});
```

```
message.onToolCallStart(async (toolCall) => {
  const { toolName, input } = toolCall.startEvent;

  // Execute the tool and return the result
  const result = await executeTool(toolName, input);
  toolCall.sendToolCallEnd({
    output: JSON.stringify(result)
  });
});
```

## Properties

| Property     | Modifier   | Type      | Description                          |
| ------------ | ---------- | --------- | ------------------------------------ |
| `ended`      | `readonly` | `boolean` | Whether this tool call has ended     |
| `toolCallId` | `readonly` | `string`  | Unique identifier for this tool call |

## Methods

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
toolCall.onErrorStart((error) => {
  console.error(`Tool call error: ${error.message}`);
});
```

### onToolCallEnd()

> **onToolCallEnd**(`cb`: (`endToolCall`: `ToolCallEndEvent`) => `void`): () => `void`

Registers a handler for tool call end events

#### Parameters

- `cb`: (`endToolCall`: `ToolCallEndEvent`) => `void` — Callback receiving the end event

#### Returns

Cleanup function to remove the handler

#### Example

```
toolCall.onToolCallEnd((endEvent) => {
  console.log('Output:', endEvent.output);
});
```

### sendToolCallEnd()

> **sendToolCallEnd**(`endToolCall?`: `ToolCallEndEvent`): `void`

Ends the tool call

#### Parameters

- `endToolCall?`: `ToolCallEndEvent` — Optional end event data

#### Returns

`void`

#### Example

```
toolCall.sendToolCallEnd({
  output: JSON.stringify({ temperature: 18, condition: 'cloudy' })
});
```
