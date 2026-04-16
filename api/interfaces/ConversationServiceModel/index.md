Service for creating and managing conversations with UiPath Conversational Agents

A conversation is a long-lived interaction with a specific agent with shared context. It persists across sessions and can be resumed at any time. To retrieve the conversation history, use the [Exchanges](../ExchangeServiceModel/) service. For real-time chat, see [Session](../SessionStream/).

### Usage

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

> **create**(`agentId`: `number`, `folderId`: `number`, `options?`: `ConversationCreateOptions`): `Promise`\<`ConversationCreateResponse`>

Creates a new conversation

The returned conversation has bound methods for lifecycle management: `update()`, `delete()`, and `startSession()`.

#### Parameters

- `agentId`: `number` — The agent ID to create the conversation for
- `folderId`: `number` — The folder ID containing the agent
- `options?`: `ConversationCreateOptions` — Optional settings for the conversation

#### Returns

`Promise`\<`ConversationCreateResponse`>

Promise resolving to [ConversationCreateResponse](../ConversationCreateResponse/) with bound methods

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

### deleteById()

> **deleteById**(`id`: `string`): `Promise`\<`ConversationDeleteResponse`>

Deletes a conversation by ID

#### Parameters

- `id`: `string` — The conversation ID to delete

#### Returns

`Promise`\<`ConversationDeleteResponse`>

Promise resolving to [ConversationDeleteResponse](../ConversationDeleteResponse/)

#### Example

```
await conversationalAgent.conversations.deleteById(conversationId);
```

### endSession()

> **endSession**(`conversationId`: `string`): `void`

Ends an active session for a conversation

Sends a session end event and releases the socket for the conversation. If no active session exists for the given conversation, this is a no-op.

#### Parameters

- `conversationId`: `string` — The conversation ID to end the session for

#### Returns

`void`

#### Example

```
// End session for a specific conversation
conversationalAgent.conversations.endSession(conversationId);
```

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ConversationGetResponse`> : `NonPaginatedResponse`\<`ConversationGetResponse`>>

Gets all conversations with optional filtering and pagination

#### Type Parameters

- `T` *extends* `ConversationGetAllOptions` = `ConversationGetAllOptions`

#### Parameters

- `options?`: `T` — Options for querying conversations including optional pagination parameters

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ConversationGetResponse`> : `NonPaginatedResponse`\<`ConversationGetResponse`>>

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

### getAttachmentUploadUri()

> **getAttachmentUploadUri**(`conversationId`: `string`, `fileName`: `string`): `Promise`\<`ConversationAttachmentCreateResponse`>

Registers a file attachment for a conversation and returns a URI along with pre-signed upload access details. Use the returned `fileUploadAccess` to upload the file content to blob storage, then reference `uri` in subsequent messages.

#### Parameters

- `conversationId`: `string` — The ID of the conversation to attach the file to
- `fileName`: `string` — The name of the file to attach

#### Returns

`Promise`\<`ConversationAttachmentCreateResponse`>

Promise resolving to [ConversationAttachmentCreateResponse](../ConversationAttachmentCreateResponse/) containing the attachment `uri` and `fileUploadAccess` details needed to upload the file content

#### Examples

```
const { uri, fileUploadAccess } = await conversationalAgent.conversations.getAttachmentUploadUri(conversationId, 'report.pdf');
console.log(`Attachment URI: ${uri}`);
```

```
const { uri, fileUploadAccess } = await conversationalAgent.conversations.getAttachmentUploadUri(conversationId, file.name);

await fetch(fileUploadAccess.url, {
  method: fileUploadAccess.verb,
  body: file,
  headers: { 'Content-Type': file.type },
});

// Reference the URI in a message after upload
console.log(`File ready at: ${uri}`);
```

### getById()

> **getById**(`id`: `string`): `Promise`\<`ConversationGetResponse`>

Gets a conversation by ID

The returned conversation has bound methods for lifecycle management: `update()`, `delete()`, and `startSession()`.

#### Parameters

- `id`: `string` — The conversation ID to retrieve

#### Returns

`Promise`\<`ConversationGetResponse`>

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

### getSession()

> **getSession**(`conversationId`: `string`): `undefined` | `SessionStream`

Retrieves an active session by conversation ID

#### Parameters

- `conversationId`: `string` — The conversation ID to get the session for

#### Returns

`undefined` | `SessionStream`

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

### startSession()

> **startSession**(`conversationId`: `string`, `options?`: `ConversationSessionOptions`): `SessionStream`

Starts a real-time chat session for a conversation

Creates a WebSocket session and returns a SessionStream for sending and receiving messages in real-time.

#### Parameters

- `conversationId`: `string` — The conversation ID to start the session for
- `options?`: `ConversationSessionOptions` — Optional session configuration

#### Returns

`SessionStream`

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

### updateById()

> **updateById**(`id`: `string`, `options`: `ConversationUpdateOptions`): `Promise`\<`ConversationUpdateResponse`>

Updates a conversation by ID

#### Parameters

- `id`: `string` — The conversation ID to update
- `options`: `ConversationUpdateOptions` — Fields to update

#### Returns

`Promise`\<`ConversationUpdateResponse`>

Promise resolving to [ConversationGetResponse](../../type-aliases/ConversationGetResponse/) with bound methods

#### Example

```
const updatedConversation = await conversationalAgent.conversations.updateById(conversationId, {
  label: 'Updated Name'
});
```

### uploadAttachment()

> **uploadAttachment**(`id`: `string`, `file`: `File`): `Promise`\<`ConversationAttachmentUploadResponse`>

Uploads a file attachment to a conversation

#### Parameters

- `id`: `string` — The ID of the conversation to attach the file to
- `file`: `File` — The file to upload

#### Returns

`Promise`\<`ConversationAttachmentUploadResponse`>

Promise resolving to attachment metadata with URI [ConversationAttachmentUploadResponse](../ConversationAttachmentUploadResponse/)

#### Example

```
const attachment = await conversationalAgent.conversations.uploadAttachment(conversationId, file);
console.log(`Uploaded: ${attachment.uri}`);
```
