Service for retrieving exchanges and managing feedback within a [Conversation](../ConversationServiceModel/)

An exchange represents a single request-response cycle — typically one user question and the agent's reply. Each exchange response includes its [Messages](../MessageServiceModel/), making this the primary way to retrieve conversation history. For real-time streaming of exchanges, see [ExchangeStream](../ExchangeStream/).

### Usage

```
import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';

const exchanges = new Exchanges(sdk);
const conversationExchanges = await exchanges.getAll(conversationId);
```

## Methods

### createFeedback()

> **createFeedback**(`conversationId`: `string`, `exchangeId`: `string`, `options`: `CreateFeedbackOptions`): `Promise`\<`FeedbackCreateResponse`>

Creates feedback for an exchange

#### Parameters

- `conversationId`: `string` — The conversation containing the exchange
- `exchangeId`: `string` — The exchange to provide feedback for
- `options`: `CreateFeedbackOptions` — Feedback data including rating and optional comment

#### Returns

`Promise`\<`FeedbackCreateResponse`>

Promise resolving to the feedback creation response [FeedbackCreateResponse](../FeedbackCreateResponse/)

#### Example

```
await exchanges.createFeedback(
  conversationId,
  exchangeId,
  { rating: FeedbackRating.Positive, comment: 'Very helpful!' }
);
```

### getAll()

> **getAll**\<`T`>(`conversationId`: `string`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ExchangeGetResponse`> : `NonPaginatedResponse`\<`ExchangeGetResponse`>>

Gets all exchanges for a conversation with optional filtering and pagination

#### Type Parameters

- `T` *extends* `ExchangeGetAllOptions` = `ExchangeGetAllOptions`

#### Parameters

- `conversationId`: `string` — The conversation ID to get exchanges for
- `options?`: `T` — Options for querying exchanges including optional pagination parameters

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`ExchangeGetResponse`> : `NonPaginatedResponse`\<`ExchangeGetResponse`>>

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

### getById()

> **getById**(`conversationId`: `string`, `exchangeId`: `string`, `options?`: `ExchangeGetByIdOptions`): `Promise`\<`ExchangeGetResponse`>

Gets an exchange by ID with its messages

#### Parameters

- `conversationId`: `string` — The conversation containing the exchange
- `exchangeId`: `string` — The exchange ID to retrieve
- `options?`: `ExchangeGetByIdOptions` — Optional parameters for message sorting

#### Returns

`Promise`\<`ExchangeGetResponse`>

Promise resolving to [ExchangeGetResponse](../ExchangeGetResponse/)

#### Example

```
const exchange = await exchanges.getById(conversationId, exchangeId);

// Access messages
for (const message of exchange.messages) {
  console.log(message.role, message.contentParts);
}
```
