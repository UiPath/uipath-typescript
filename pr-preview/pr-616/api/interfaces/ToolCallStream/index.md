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

```
// BEFORE — legacy interrupt flow
message.onInterruptStart(async ({ interruptId, startEvent }) => {
  if (startEvent.type !== InterruptType.ToolCallConfirmation) return;
  const { toolName, inputSchema, inputValue } = startEvent.value;

  const decision = await showConfirmationDialog({
    toolName, inputSchema, input: inputValue,
  });
  message.sendInterruptEnd(interruptId, {
    approved: decision.approved,
    input: decision.editedInput,
  });
});

// AFTER — new tool-call confirmation flow
message.onToolCallStart(async (toolCall) => {
  const { toolName, input, requireConfirmation, inputSchema } = toolCall.startEvent;
  if (!requireConfirmation) return;

  const decision = await showConfirmationDialog({ toolName, inputSchema, input });
  if (decision.approved) {
    toolCall.sendToolCallConfirm({ approved: true, input: decision.editedInput });
  } else {
    toolCall.sendToolCallConfirm({ approved: false });
  }
});
```

```
message.onToolCallStart((toolCall) => {
  const { isClientSideTool, toolName } = toolCall.startEvent;
  if (!isClientSideTool) return;

  toolCall.onExecutingToolCall(async (event) => {
    const result = await runLocalProcess(toolName, event.input);
    toolCall.sendToolCallEnd({ output: result });
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

### onToolCallConfirm()

> **onToolCallConfirm**(`callback`: (`confirmToolCall`: `ToolCallConfirmationEvent`) => `void`): () => `void`

Registers a handler for tool call confirmation events. Fired when the peer responds to a tool call that was emitted with `requireConfirmation: true` on its start event.

#### Parameters

- `callback`: (`confirmToolCall`: `ToolCallConfirmationEvent`) => `void` — Callback receiving the confirmation event

#### Returns

Cleanup function to remove the handler

#### Example

```
toolCall.onToolCallConfirm(({ approved, input }) => {
  if (approved) executeTool(toolCall.startEvent.toolName, input);
  else cancelToolCall();
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

### sendToolCallConfirm()

> **sendToolCallConfirm**(`confirmToolCall`: `ToolCallConfirmationEvent`): `void`

Sends a tool call confirmation (approve or reject) for a tool call that was emitted with `requireConfirmation: true`. Replaces the legacy interrupt-based confirmation flow.

#### Parameters

- `confirmToolCall`: `ToolCallConfirmationEvent` — The user's decision and (when approved) the possibly-edited input the tool should execute with

#### Returns

`void`

#### Examples

```
toolCall.sendToolCallConfirm({ approved: true, input: editedInput });
```

```
toolCall.sendToolCallConfirm({ approved: false });
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
