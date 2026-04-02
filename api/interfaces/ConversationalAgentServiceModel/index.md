Service for managing UiPath Conversational Agents — AI-powered chat interfaces that enable natural language interactions with UiPath automation. Discover agents, create conversations, and stream real-time responses over WebSocket. [UiPath Conversational Agents Guide](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/conversational-agents)

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

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

// 5. End session when done
conversation.endSession();

// 6. Retrieve conversation history (offline)
const exchanges = await conversation.exchanges.getAll();
```

## Properties

| Property        | Modifier   | Type                                                       | Description                                                                                                    |
| --------------- | ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `conversations` | `readonly` | [`ConversationServiceModel`](../ConversationServiceModel/) | Service for creating and managing conversations. See [ConversationServiceModel](../ConversationServiceModel/). |

## Methods

### getAll()

> **getAll**(`folderId?`: `number`): `Promise`\<[`AgentGetResponse`](../../type-aliases/AgentGetResponse/)[]>

Gets all available conversational agents

#### Parameters

| Parameter   | Type     | Description                         |
| ----------- | -------- | ----------------------------------- |
| `folderId?` | `number` | Optional folder ID to filter agents |

#### Returns

`Promise`\<[`AgentGetResponse`](../../type-aliases/AgentGetResponse/)[]>

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

______________________________________________________________________

### getById()

> **getById**(`id`: `number`, `folderId`: `number`): `Promise`\<[`AgentGetByIdResponse`](../../type-aliases/AgentGetByIdResponse/)>

Gets a specific agent by ID

#### Parameters

| Parameter  | Type     | Description                           |
| ---------- | -------- | ------------------------------------- |
| `id`       | `number` | ID of the agent release               |
| `folderId` | `number` | ID of the folder containing the agent |

#### Returns

`Promise`\<[`AgentGetByIdResponse`](../../type-aliases/AgentGetByIdResponse/)>

Promise resolving to the agent [AgentGetByIdResponse](../../type-aliases/AgentGetByIdResponse/)

#### Example

```
const agent = await conversationalAgent.getById(agentId, folderId);

// Create conversation directly from agent (agentId and folderId are auto-filled)
const conversation = await agent.conversations.create({ label: 'My Chat' });
```

______________________________________________________________________

### onConnectionStatusChanged()

> **onConnectionStatusChanged**(`handler`: (`status`: `ConnectionStatus`, `error`: `null` | `Error`) => `void`): () => `void`

Registers a handler that is called whenever the WebSocket connection status changes.

#### Parameters

| Parameter | Type                                           | Description        |
| --------- | ---------------------------------------------- | ------------------ |
| `handler` | (`status`: `ConnectionStatus`, `error`: `null` | `Error`) => `void` |

#### Returns

Cleanup function to remove the handler

> (): `void`

##### Returns

`void`

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
