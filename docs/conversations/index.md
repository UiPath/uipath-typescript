# Conversations

Service for creating and managing conversations with UiPath Conversational Agents

A conversation is a long-lived interaction with a specific agent with shared context.
It persists across sessions and can be resumed at any time. To retrieve the
conversation history, use the [Exchanges](../api/interfaces/ExchangeServiceModel.md) service.
For real-time chat, see [Session](../api/interfaces/SessionStream.md).

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```typescript
import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';

const conversationalAgent = new ConversationalAgent(sdk);

// Access conversations through the main service
const conversation = await conversationalAgent.conversations.create(agentId, folderId);

// Or through agent objects (agentId/folderId auto-filled)
const agents = await conversationalAgent.getAll();
const agentConversation = await agents[0].conversations.create({ label: 'My Chat' });
```

## Methods

### create()

> **create**(`agentId`: `number`, `folderId`: `number`, `options?`: [`ConversationCreateOptions`](../api/interfaces/ConversationCreateOptions.md)): `Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Creates a new conversation

The returned conversation has bound methods for lifecycle management:
`update()`, `delete()`, and `startSession()`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `agentId` | `number` | The agent ID to create the conversation for |
| `folderId` | `number` | The folder ID containing the agent |
| `options?` | [`ConversationCreateOptions`](../api/interfaces/ConversationCreateOptions.md) | Optional settings for the conversation |

#### Returns

`Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Promise resolving to [ConversationCreateResponse](../api/type-aliases/ConversationCreateResponse.md) with bound methods

#### Example

```typescript
const conversation = await conversationalAgent.conversations.create(
  agentId,
  folderId,
  { label: 'Customer Support Session' }
);

// Update the conversation
await conversation.update({ label: 'Renamed Chat' });

// Start a real-time session
const session = conversation.startSession();

// Delete the conversation
await conversation.delete();
```

***

### deleteById()

> **deleteById**(`id`: `string`): `Promise`&lt;[`RawConversationGetResponse`](../api/interfaces/RawConversationGetResponse.md)&gt;

Deletes a conversation by ID

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The conversation ID to delete |

#### Returns

`Promise`&lt;[`RawConversationGetResponse`](../api/interfaces/RawConversationGetResponse.md)&gt;

Promise resolving to [ConversationDeleteResponse](../api/type-aliases/ConversationDeleteResponse.md)

#### Example

```typescript
await conversationalAgent.conversations.deleteById(conversationId);
```

***

### endSession()

> **endSession**(`conversationId`: `string`): `void`

Ends an active session for a conversation

Sends a session end event and releases the socket for the conversation.
If no active session exists for the given conversation, this is a no-op.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `conversationId` | `string` | The conversation ID to end the session for |

#### Returns

`void`

#### Example

```typescript
// End session for a specific conversation
conversationalAgent.conversations.endSession(conversationId);
```

***

### getAll()

> **getAll**&lt;`T`&gt;(`options?`: `T`): `Promise`&lt;`T` *extends* [`HasPaginationOptions`](../api/type-aliases/HasPaginationOptions.md)&lt;`T`&gt; ? [`PaginatedResponse`](../api/interfaces/PaginatedResponse.md)&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt; : [`NonPaginatedResponse`](../api/interfaces/NonPaginatedResponse.md)&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;&gt;

Gets all conversations with optional filtering and pagination

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` *extends* [`ConversationGetAllOptions`](../api/type-aliases/ConversationGetAllOptions.md) | [`ConversationGetAllOptions`](../api/type-aliases/ConversationGetAllOptions.md) |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | `T` | Options for querying conversations including optional pagination parameters |

#### Returns

`Promise`&lt;`T` *extends* [`HasPaginationOptions`](../api/type-aliases/HasPaginationOptions.md)&lt;`T`&gt; ? [`PaginatedResponse`](../api/interfaces/PaginatedResponse.md)&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt; : [`NonPaginatedResponse`](../api/interfaces/NonPaginatedResponse.md)&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;&gt;

Promise resolving to either an array of conversations NonPaginatedResponse<ConversationGetResponse> or a PaginatedResponse<ConversationGetResponse> when pagination options are used

#### Examples

```typescript
const allConversations = await conversationalAgent.conversations.getAll();

for (const conversation of allConversations.items) {
  console.log(`${conversation.label} - created: ${conversation.createdTime}`);
}
```

```typescript
// First page
const firstPage = await conversationalAgent.conversations.getAll({ pageSize: 10 });

// Navigate using cursor
if (firstPage.hasNextPage) {
  const nextPage = await conversationalAgent.conversations.getAll({
    cursor: firstPage.nextCursor
  });
}
```

```typescript
const result = await conversationalAgent.conversations.getAll({
  sort: SortOrder.Descending,
  pageSize: 20
});
```

***

### getAttachmentUploadUri()

> **getAttachmentUploadUri**(`conversationId`: `string`, `fileName`: `string`): `Promise`&lt;[`ConversationAttachmentCreateResponse`](../api/interfaces/ConversationAttachmentCreateResponse.md)&gt;

Registers a file attachment for a conversation and returns a URI along with
pre-signed upload access details. Use the returned `fileUploadAccess` to upload
the file content to blob storage, then reference `uri` in subsequent messages.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `conversationId` | `string` | The ID of the conversation to attach the file to |
| `fileName` | `string` | The name of the file to attach |

#### Returns

`Promise`&lt;[`ConversationAttachmentCreateResponse`](../api/interfaces/ConversationAttachmentCreateResponse.md)&gt;

Promise resolving to [ConversationAttachmentCreateResponse](../api/interfaces/ConversationAttachmentCreateResponse.md) containing
the attachment `uri` and `fileUploadAccess` details needed to upload the file content

#### Examples

```typescript
const { uri, fileUploadAccess } = await conversationalAgent.conversations.getAttachmentUploadUri(conversationId, 'report.pdf');
console.log(`Attachment URI: ${uri}`);
```

```typescript
const { uri, fileUploadAccess } = await conversationalAgent.conversations.getAttachmentUploadUri(conversationId, file.name);

await fetch(fileUploadAccess.url, {
  method: fileUploadAccess.verb,
  body: file,
  headers: { 'Content-Type': file.type },
});

// Reference the URI in a message after upload
console.log(`File ready at: ${uri}`);
```

***

### getById()

> **getById**(`id`: `string`): `Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Gets a conversation by ID

The returned conversation has bound methods for lifecycle management:
`update()`, `delete()`, and `startSession()`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The conversation ID to retrieve |

#### Returns

`Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Promise resolving to [ConversationGetResponse](../api/type-aliases/ConversationGetResponse.md) with bound methods

#### Examples

```typescript
const conversation = await conversationalAgent.conversations.getById(conversationId);
const session = conversation.startSession();
```

```typescript
//Retrieve conversation history
const conversation = await conversationalAgent.conversations.getById(conversationId);
const allExchanges = await conversation.exchanges.getAll();
for (const exchange of allExchanges.items) {
  for (const message of exchange.messages) {
    console.log(`${message.role}: ${message.contentParts.map(p => p.data).join('')}`);
  }
}
```

***

### getSession()

> **getSession**(`conversationId`: `string`): `undefined` \| [`SessionStream`](../api/interfaces/SessionStream.md)

Retrieves an active session by conversation ID

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `conversationId` | `string` | The conversation ID to get the session for |

#### Returns

`undefined` \| [`SessionStream`](../api/interfaces/SessionStream.md)

The session helper if active, undefined otherwise

#### Example

```typescript
const session = conversationalAgent.conversations.getSession(conversationId);
if (session) {
  // Session already started — safe to send exchanges directly
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({ data: 'Hello!' });
}
```

***

### startSession()

> **startSession**(`conversationId`: `string`, `options?`: [`ConversationSessionOptions`](../api/interfaces/ConversationSessionOptions.md)): [`SessionStream`](../api/interfaces/SessionStream.md)

Starts a real-time chat session for a conversation

Creates a WebSocket session and returns a SessionStream for sending
and receiving messages in real-time.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `conversationId` | `string` | The conversation ID to start the session for |
| `options?` | [`ConversationSessionOptions`](../api/interfaces/ConversationSessionOptions.md) | Optional session configuration |

#### Returns

[`SessionStream`](../api/interfaces/SessionStream.md)

SessionStream for managing the session

#### Example

```typescript
const session = conversationalAgent.conversations.startSession(conversation.id);

// Listen for responses using helper methods
session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    // Use message.isAssistant to filter AI responses
    if (message.isAssistant) {
      message.onContentPartStart((part) => {
        // Use part.isMarkdown to handle text content
        if (part.isMarkdown) {
          part.onChunk((chunk) => console.log(chunk.data));
        }
      });
    }
  });
});

// Wait for session to be ready, then send a message
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({ data: 'Hello!' });
});

// End the session when done
conversationalAgent.conversations.endSession(conversation.id);
```

***

### updateById()

> **updateById**(`id`: `string`, `options`: [`ConversationUpdateOptions`](../api/interfaces/ConversationUpdateOptions.md)): `Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Updates a conversation by ID

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The conversation ID to update |
| `options` | [`ConversationUpdateOptions`](../api/interfaces/ConversationUpdateOptions.md) | Fields to update |

#### Returns

`Promise`&lt;[`ConversationGetResponse`](../api/type-aliases/ConversationGetResponse.md)&gt;

Promise resolving to [ConversationGetResponse](../api/type-aliases/ConversationGetResponse.md) with bound methods

#### Example

```typescript
const updatedConversation = await conversationalAgent.conversations.updateById(conversationId, {
  label: 'Updated Name'
});
```

***

### uploadAttachment()

> **uploadAttachment**(`id`: `string`, `file`: `File`): `Promise`&lt;[`ConversationAttachmentUploadResponse`](../api/interfaces/ConversationAttachmentUploadResponse.md)&gt;

Uploads a file attachment to a conversation

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID of the conversation to attach the file to |
| `file` | `File` | The file to upload |

#### Returns

`Promise`&lt;[`ConversationAttachmentUploadResponse`](../api/interfaces/ConversationAttachmentUploadResponse.md)&gt;

Promise resolving to attachment metadata with URI
[ConversationAttachmentUploadResponse](../api/interfaces/ConversationAttachmentUploadResponse.md)

#### Example

```typescript
const attachment = await conversationalAgent.conversations.uploadAttachment(conversationId, file);
console.log(`Uploaded: ${attachment.uri}`);
```
