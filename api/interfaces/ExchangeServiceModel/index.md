Service for retrieving exchanges and managing feedback within a [Conversation](../ConversationServiceModel/)

An exchange represents a single request-response cycle — typically one user question and the agent's reply. Each exchange response includes its [Messages](../MessageServiceModel/), making this the primary way to retrieve conversation history. For real-time streaming of exchanges, see [ExchangeStream](../ExchangeStream/).

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';

const exchanges = new Exchanges(sdk);
const conversationExchanges = await exchanges.getAll(conversationId);
```

## Methods

### createFeedback()

> **createFeedback**(`conversationId`: `string`, `exchangeId`: `string`, `options`: [`CreateFeedbackOptions`](../CreateFeedbackOptions/)): `Promise`\<[`FeedbackCreateResponse`](../FeedbackCreateResponse/)>

Creates feedback for an exchange

#### Parameters

| Parameter        | Type                                                 | Description                                         |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `conversationId` | `string`                                             | The conversation containing the exchange            |
| `exchangeId`     | `string`                                             | The exchange to provide feedback for                |
| `options`        | [`CreateFeedbackOptions`](../CreateFeedbackOptions/) | Feedback data including rating and optional comment |

#### Returns

`Promise`\<[`FeedbackCreateResponse`](../FeedbackCreateResponse/)>

Promise resolving to the feedback creation response [FeedbackCreateResponse](../FeedbackCreateResponse/)

#### Example

```
await exchanges.createFeedback(
  conversationId,
  exchangeId,
  { rating: FeedbackRating.Positive, comment: 'Very helpful!' }
);
```

______________________________________________________________________

### getAll()

> **getAll**\<`T`>(`conversationId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ExchangeGetResponse`](../ExchangeGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ExchangeGetResponse`](../ExchangeGetResponse/)>>

Gets all exchanges for a conversation with optional filtering and pagination

#### Type Parameters

| Type Parameter                                                                     | Default type                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `T` *extends* [`ExchangeGetAllOptions`](../../type-aliases/ExchangeGetAllOptions/) | [`ExchangeGetAllOptions`](../../type-aliases/ExchangeGetAllOptions/) |

#### Parameters

| Parameter        | Type     | Description                                                             |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| `conversationId` | `string` | The conversation ID to get exchanges for                                |
| `options?`       | `T`      | Options for querying exchanges including optional pagination parameters |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`ExchangeGetResponse`](../ExchangeGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`ExchangeGetResponse`](../ExchangeGetResponse/)>>

Promise resolving to either an array of exchanges [NonPaginatedResponse](../NonPaginatedResponse/)\<[ExchangeGetResponse](../ExchangeGetResponse/)> or a [PaginatedResponse](../PaginatedResponse/)\<[ExchangeGetResponse](../ExchangeGetResponse/)> when pagination options are used

#### Example

```
// Get all exchanges (non-paginated)
const conversationExchanges = await exchanges.getAll(conversationId);

// First page with pagination
const firstPageOfExchanges = await exchanges.getAll(conversationId, { pageSize: 10 });

// Navigate using cursor
if (firstPageOfExchanges.hasNextPage) {
  const nextPageOfExchanges = await exchanges.getAll(conversationId, {
    cursor: firstPageOfExchanges.nextCursor
  });
}
```

______________________________________________________________________

### getById()

> **getById**(`conversationId`: `string`, `exchangeId`: `string`, `options?`: [`ExchangeGetByIdOptions`](../ExchangeGetByIdOptions/)): `Promise`\<[`ExchangeGetResponse`](../ExchangeGetResponse/)>

Gets an exchange by ID with its messages

#### Parameters

| Parameter        | Type                                                   | Description                              |
| ---------------- | ------------------------------------------------------ | ---------------------------------------- |
| `conversationId` | `string`                                               | The conversation containing the exchange |
| `exchangeId`     | `string`                                               | The exchange ID to retrieve              |
| `options?`       | [`ExchangeGetByIdOptions`](../ExchangeGetByIdOptions/) | Optional parameters for message sorting  |

#### Returns

`Promise`\<[`ExchangeGetResponse`](../ExchangeGetResponse/)>

Promise resolving to [ExchangeGetResponse](../ExchangeGetResponse/)

#### Example

```
const exchange = await exchanges.getById(conversationId, exchangeId);

// Access messages
for (const message of exchange.messages) {
  console.log(message.role, message.contentParts);
}
```
