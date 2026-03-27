Service for retrieving individual messages within an [Exchange](../ExchangeServiceModel/)

A message is a single turn from a user, assistant, or system. Each message includes a role, contentParts (text, audio, images), toolCalls, and interrupts. Messages are also returned as part of exchange responses — use this service when you need to fetch a specific message by ID or retrieve external content parts. For real-time streaming of messages, see [MessageStream](../MessageStream/).

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Messages } from '@uipath/uipath-typescript/conversational-agent';

const message = new Messages(sdk);
const messageDetails = await message.getById(conversationId, exchangeId, messageId);
```

## Methods

### getById()

> **getById**(`conversationId`: `string`, `exchangeId`: `string`, `messageId`: `string`): `Promise`\<[`MessageGetResponse`](../MessageGetResponse/)>

Gets a message by ID

Returns the message including its content parts, tool calls, and interrupts.

#### Parameters

| Parameter        | Type     | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `conversationId` | `string` | The conversation containing the message |
| `exchangeId`     | `string` | The exchange containing the message     |
| `messageId`      | `string` | The message ID to retrieve              |

#### Returns

`Promise`\<[`MessageGetResponse`](../MessageGetResponse/)>

Promise resolving to [MessageGetResponse](../MessageGetResponse/)

#### Example

```
const message = await messages.getById(conversationId, exchangeId, messageId);

console.log(message.role);
console.log(message.contentParts);
console.log(message.toolCalls);
```

______________________________________________________________________

### getContentPartById()

> **getContentPartById**(`conversationId`: `string`, `exchangeId`: `string`, `messageId`: `string`, `contentPartId`: `string`): `Promise`\<[`ContentPartGetResponse`](../ContentPartGetResponse/)>

Gets an external content part by ID

#### Parameters

| Parameter        | Type     | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `conversationId` | `string` | The conversation containing the content |
| `exchangeId`     | `string` | The exchange containing the content     |
| `messageId`      | `string` | The message containing the content part |
| `contentPartId`  | `string` | The content part ID to retrieve         |

#### Returns

`Promise`\<[`ContentPartGetResponse`](../ContentPartGetResponse/)>

Promise resolving to [ContentPartGetResponse](../ContentPartGetResponse/)

#### Example

```
const contentPart = await messages.getContentPartById(
  conversationId,
  exchangeId,
  messageId,
  contentPartId
);
```
