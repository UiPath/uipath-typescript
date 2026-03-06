Service for creating and managing conversations with UiPath Conversational Agents

A conversation is a long-lived interaction with a specific agent with shared context. It persists across sessions and can be resumed at any time. To retrieve the conversation history, use the [Exchanges](../ExchangeServiceModel/) service. For real-time chat, see [Session](../SessionStream/).

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
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

> **create**(`agentId`: `number`, `folderId`: `number`, `options?`: [`ConversationCreateOptions`](../ConversationCreateOptions/)): `Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Creates a new conversation

The returned conversation has bound methods for lifecycle management: `update()`, `delete()`, and `startSession()`.

#### Parameters

| Parameter  | Type                                                         | Description                                 |
| ---------- | ------------------------------------------------------------ | ------------------------------------------- |
| `agentId`  | `number`                                                     | The agent ID to create the conversation for |
| `folderId` | `number`                                                     | The folder ID containing the agent          |
| `options?` | [`ConversationCreateOptions`](../ConversationCreateOptions/) | Optional settings for the conversation      |

#### Returns

`Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Promise resolving to [ConversationCreateResponse](../../type-aliases/ConversationCreateResponse/) with bound methods

#### Example

```
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

______________________________________________________________________

### deleteById()

> **deleteById**(`id`: `string`): `Promise`\<[`RawConversationGetResponse`](../RawConversationGetResponse/)>

Deletes a conversation by ID

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `id`      | `string` | The conversation ID to delete |

#### Returns

`Promise`\<[`RawConversationGetResponse`](../RawConversationGetResponse/)>

Promise resolving to [ConversationDeleteResponse](../../type-aliases/ConversationDeleteResponse/)

#### Example

```
await conversationalAgent.conversations.deleteById(conversationId);
```

______________________________________________________________________

### endSession()

> **endSession**(`conversationId`: `string`): `void`

Ends an active session for a conversation

Sends a session end event and releases the socket for the conversation. If no active session exists for the given conversation, this is a no-op.

#### Parameters

| Parameter        | Type     | Description                                |
| ---------------- | -------- | ------------------------------------------ |
| `conversationId` | `string` | The conversation ID to end the session for |

#### Returns

`void`

#### Example

```
// End session for a specific conversation
conversationalAgent.conversations.endSession(conversationId);
```

______________________________________________________________________

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>>

Gets all conversations with optional filtering and pagination

#### Type Parameters

| Type Parameter                                                                             | Default type                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `T` *extends* [`ConversationGetAllOptions`](../../type-aliases/ConversationGetAllOptions/) | [`ConversationGetAllOptions`](../../type-aliases/ConversationGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                                 |
| ---------- | ---- | --------------------------------------------------------------------------- |
| `options?` | `T`  | Options for querying conversations including optional pagination parameters |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>>

Promise resolving to either an array of conversations NonPaginatedResponse or a PaginatedResponse when pagination options are used

#### Examples

```
const allConversations = await conversationalAgent.conversations.getAll();

for (const conversation of allConversations.items) {
  console.log(`${conversation.label} - created: ${conversation.createdTime}`);
}
```

```
// First page
const firstPage = await conversationalAgent.conversations.getAll({ pageSize: 10 });

// Navigate using cursor
if (firstPage.hasNextPage) {
  const nextPage = await conversationalAgent.conversations.getAll({
    cursor: firstPage.nextCursor
  });
}
```

```
const result = await conversationalAgent.conversations.getAll({
  sort: SortOrder.Descending,
  pageSize: 20
});
```

______________________________________________________________________

### getById()

> **getById**(`id`: `string`): `Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Gets a conversation by ID

The returned conversation has bound methods for lifecycle management: `update()`, `delete()`, and `startSession()`.

#### Parameters

| Parameter | Type     | Description                     |
| --------- | -------- | ------------------------------- |
| `id`      | `string` | The conversation ID to retrieve |

#### Returns

`Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Promise resolving to [ConversationGetResponse](../../type-aliases/ConversationGetResponse/) with bound methods

#### Examples

```
const conversation = await conversationalAgent.conversations.getById(conversationId);
const session = conversation.startSession();
```

```
//Retrieve conversation history
const conversation = await conversationalAgent.conversations.getById(conversationId);
const allExchanges = await conversation.exchanges.getAll();
for (const exchange of allExchanges.items) {
  for (const message of exchange.messages) {
    console.log(`${message.role}: ${message.contentParts.map(p => p.data).join('')}`);
  }
}
```

______________________________________________________________________

### getSession()

> **getSession**(`conversationId`: `string`): `undefined` | [`SessionStream`](../SessionStream/)

Retrieves an active session by conversation ID

#### Parameters

| Parameter        | Type     | Description                                |
| ---------------- | -------- | ------------------------------------------ |
| `conversationId` | `string` | The conversation ID to get the session for |

#### Returns

`undefined` | [`SessionStream`](../SessionStream/)

The session helper if active, undefined otherwise

#### Example

```
const session = conversationalAgent.conversations.getSession(conversationId);
if (session) {
  // Session already started — safe to send exchanges directly
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({ data: 'Hello!' });
}
```

______________________________________________________________________

### startSession()

> **startSession**(`conversationId`: `string`, `options?`: [`ConversationSessionOptions`](../ConversationSessionOptions/)): [`SessionStream`](../SessionStream/)

Starts a real-time chat session for a conversation

Creates a WebSocket session and returns a SessionStream for sending and receiving messages in real-time.

#### Parameters

| Parameter        | Type                                                           | Description                                  |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------- |
| `conversationId` | `string`                                                       | The conversation ID to start the session for |
| `options?`       | [`ConversationSessionOptions`](../ConversationSessionOptions/) | Optional session configuration               |

#### Returns

[`SessionStream`](../SessionStream/)

SessionStream for managing the session

#### Example

```
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

______________________________________________________________________

### updateById()

> **updateById**(`id`: `string`, `options`: [`ConversationUpdateOptions`](../ConversationUpdateOptions/)): `Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Updates a conversation by ID

#### Parameters

| Parameter | Type                                                         | Description                   |
| --------- | ------------------------------------------------------------ | ----------------------------- |
| `id`      | `string`                                                     | The conversation ID to update |
| `options` | [`ConversationUpdateOptions`](../ConversationUpdateOptions/) | Fields to update              |

#### Returns

`Promise`\<[`ConversationGetResponse`](../../type-aliases/ConversationGetResponse/)>

Promise resolving to [ConversationGetResponse](../../type-aliases/ConversationGetResponse/) with bound methods

#### Example

```
const updatedConversation = await conversationalAgent.conversations.updateById(conversationId, {
  label: 'Updated Name'
});
```

______________________________________________________________________

### uploadAttachment()

> **uploadAttachment**(`id`: `string`, `file`: `File`): `Promise`\<[`ConversationAttachmentUploadResponse`](../ConversationAttachmentUploadResponse/)>

Uploads a file attachment to a conversation

#### Parameters

| Parameter | Type     | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `id`      | `string` | The ID of the conversation to attach the file to |
| `file`    | `File`   | The file to upload                               |

#### Returns

`Promise`\<[`ConversationAttachmentUploadResponse`](../ConversationAttachmentUploadResponse/)>

Promise resolving to attachment metadata with URI [ConversationAttachmentUploadResponse](../ConversationAttachmentUploadResponse/)

#### Example

```
const attachment = await conversationalAgent.conversations.uploadAttachment(conversationId, file);
console.log(`Uploaded: ${attachment.uri}`);
```
