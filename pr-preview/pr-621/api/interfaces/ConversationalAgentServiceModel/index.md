Service for managing UiPath Conversational Agents — AI-powered chat interfaces that enable natural language interactions with UiPath automation. Discover agents, create conversations, and stream real-time responses over WebSocket. [UiPath Conversational Agents Guide](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/conversational-agents)

## How It Works

### Lifecycle

```
graph TD
    A["Agent"] -->|conversations.create| B["Conversation"]
    B -->|startSession| C["Session"]
    B -->|exchanges.getAll| F(["History"])
    C -->|onSessionStarted| D["Ready"]
    D -->|startExchange| E["Exchange"]
    E -->|sendMessage| G["Message"]
```

### Real-Time Event Flow

Once a session is started, events flow through a nested stream hierarchy:

```
graph TD
    S["SessionStream"]
    S -->|onExchangeStart| E["ExchangeStream"]
    S -->|onSessionEnd| SE(["session closed"])
    E -->|onMessageStart| M["MessageStream"]
    E -->|sendExchangeEnd| STOP(["stop response"])
    E -->|onExchangeEnd| EE(["exchange complete"])
    M -->|onContentPartStart| CP["ContentPartStream"]
    M -->|onToolCallStart| TC["ToolCallStream"]
    M -->|onInterruptStart| IR(["awaiting approval"])
    CP -->|onChunk| CH(["streaming data"])
    TC -->|onToolCallEnd| TCE(["tool result"])
```

## Usage

```
import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';

const conversationalAgent = new ConversationalAgent(sdk);

// 1. Discover agents
const agents = await conversationalAgent.getAll();
const agent = agents[0];

// 2. Create a conversation
const conversation = await agent.conversations.create({ label: 'My Chat' });

// 3. Start real-time session and listen for responses
const session = conversation.startSession();

session.onExchangeStart((exchange) => {
  exchange.onMessageStart((message) => {
    if (message.isAssistant) {
      message.onContentPartStart((part) => {
        if (part.isMarkdown) {
          part.onChunk((chunk) => process.stdout.write(chunk.data ?? ''));
        }
      });
    }
  });
});

// 4. Wait for session to be ready, then send a message
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({ data: 'Hello!' });
});

// 5. Stop a response mid-stream
// Use sendExchangeEnd() on any active exchange to stop the agent
session.onSessionStarted(() => {
  const exchange = session.startExchange();
  exchange.sendMessageWithContentPart({ data: 'Tell me a long story' });

  // Stop after 5 seconds
  setTimeout(() => exchange.sendExchangeEnd(), 5000);
});

// 6. End session when done
conversation.endSession();

// 7. Retrieve conversation history (offline)
const exchanges = await conversation.exchanges.getAll();
```

## App-scoped authentication (anonymous, sign-in-free chat)

Conversational Agents can be driven with an **app-scoped token** — one issued to an External App via the client-credentials grant, which carries no end-user identity. This lets an application offer chat without requiring each of its users to sign in to UiPath. For more information on creating External Apps, see the official UiPath documentation on [managing external OAuth applications](https://docs.uipath.com/automation-cloud/automation-cloud/latest/admin-guide/managing-external-applications); for details on how to request client-credentials tokens, see the official UiPath documentation on [the OAuth bearer token types](https://docs.uipath.com/automation-cloud/automation-cloud/latest/api-guide/accessing-uipath-resources-using-external-applications) issued to an External App.

To use it, pass an `externalUserId` — your application's own identifier for the end user — when constructing the service:

```
const conversationalAgent = new ConversationalAgent(sdk, {
  externalUserId: 'app-user-42'
});
```

The SDK forwards this identifier on every HTTP request and real-time WebSocket session. Each distinct `externalUserId` — scoped to the client ID of the External App the token was issued for — gets its own conversation history and user settings, and the same value always maps back to the same user.

### Limitations

- **App-scoped tokens only.** `externalUserId` takes effect only when the SDK is authenticated with an app-scoped External App token. With a standard UiPath user token the server ignores it and uses the token's own user identity — so omit it in that case.
- **Required with an app-scoped token.** When the token is app-scoped, `externalUserId` is mandatory; requests without it are rejected with a `401`. It is set once at construction and applies to all calls made through that service instance (including `conversations`, `exchanges`, `messages`, `user`, and WebSocket sessions).
- **Value constraints.** May contain only letters, digits, dot (`.`), underscore (`_`), and hyphen (`-`), and must be at most 255 characters. Other characters are rejected with a `400`.
- **Identity scope.** The derived identity is scoped per application: the same `externalUserId` under a different app is a different user.

## Properties

| Property        | Modifier   | Type                       | Description                                                                                                                                 |
| --------------- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | `readonly` | `ConversationServiceModel` | Service for creating and managing conversations. See [ConversationServiceModel](../ConversationServiceModel/).                              |
| `user`          | `readonly` | `UserSettingsServiceModel` | Service for reading and updating the current user's profile/context settings. See [UserSettingsServiceModel](../UserSettingsServiceModel/). |

## Methods

### downloadCitationSource()

> **downloadCitationSource**(`source`: `CitationSourceMedia`): `Promise`\<`Blob`>

Downloads the document behind a media citation as an authenticated `Blob`, fetching the source's `downloadUrl` with the SDK's access token. Use `source.title` as the file name.

The `Blob` type is resolved from the source `mimeType`, falling back to the response Content-Type then the title's file extension. HTML is returned as `application/octet-stream` so previewing it inline can't execute citation markup in your app's origin. The token is only sent to the tenant's configured origin; a missing, unparseable, or off-origin `downloadUrl` is rejected before any request is made.

#### Parameters

- `source`: `CitationSourceMedia` — A media citation source (`CitationSourceMedia`) with a `downloadUrl`

#### Returns

`Promise`\<`Blob`>

Promise resolving to the document as a `Blob`

#### Example

```
import { isCitationSourceMedia } from '@uipath/uipath-typescript/conversational-agent';

if (isCitationSourceMedia(source)) {
  const blob = await conversationalAgent.downloadCitationSource(source);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
```

### getAll()

> **getAll**(`folderId?`: `number`): `Promise`\<`AgentGetResponse`[]>

Gets all available conversational agents

#### Parameters

- `folderId?`: `number` — Optional folder ID to filter agents

#### Returns

`Promise`\<`AgentGetResponse`[]>

Promise resolving to an array of agents [AgentGetResponse](../../type-aliases/AgentGetResponse/)

#### Examples

```
const agents = await conversationalAgent.getAll();
const agent = agents[0];

// Create conversation directly from agent (agentId and folderId are auto-filled)
const conversation = await agent.conversations.create({ label: 'My Chat' });
```

```
const agents = await conversationalAgent.getAll(folderId);
```

### getById()

> **getById**(`id`: `number`, `folderId`: `number`): `Promise`\<`AgentGetByIdResponse`>

Gets a specific agent by ID

#### Parameters

- `id`: `number` — ID of the agent release
- `folderId`: `number` — ID of the folder containing the agent

#### Returns

`Promise`\<`AgentGetByIdResponse`>

Promise resolving to the agent [AgentGetByIdResponse](../../type-aliases/AgentGetByIdResponse/)

#### Example

```
const agent = await conversationalAgent.getById(agentId, folderId);

// Create conversation directly from agent (agentId and folderId are auto-filled)
const conversation = await agent.conversations.create({ label: 'My Chat' });
```

### onConnectionStatusChanged()

> **onConnectionStatusChanged**(`handler`: (`status`: `ConnectionStatus`, `error`: `null` | `Error`) => `void`): () => `void`

Registers a handler that is called whenever the WebSocket connection status changes.

#### Parameters

- `handler`: (`status`: `ConnectionStatus`, `error`: `null` | `Error`) => `void` — Callback receiving a ConnectionStatus (`'Disconnected'`

#### Returns

Cleanup function to remove the handler

#### Example

```
const cleanup = conversationalAgent.onConnectionStatusChanged((status, error) => {
  console.log('Connection status:', status);
  if (error) {
    console.error('Connection error:', error.message);
  }
});

// Later, remove the handler
cleanup();
```
