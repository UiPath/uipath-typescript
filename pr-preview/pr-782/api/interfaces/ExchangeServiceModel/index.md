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

> **getAll**(`conversationId`: `string`, `options?`: `ExchangeGetAllOptions`): `Promise`\<`PaginatedResponse`\<`ExchangeGetResponse`>>

Gets exchanges for a conversation with pagination and optional sort parameters

Returns a paginated response. When called without `pageSize`/`cursor`, the backend applies its default page size — inspect `hasNextPage`/`nextCursor` to navigate further pages.

#### Parameters

- `conversationId`: `string` — The conversation ID to get exchanges for
- `options?`: `ExchangeGetAllOptions` — Options for querying exchanges including optional pagination parameters

#### Returns

`Promise`\<`PaginatedResponse`\<`ExchangeGetResponse`>>

Promise resolving to a [PaginatedResponse](../PaginatedResponse/)\<[ExchangeGetResponse](../ExchangeGetResponse/)>

#### Examples

```
// First page
const firstPage = await exchanges.getAll(conversationId);

// Navigate using cursor
if (firstPage.hasNextPage) {
  const nextPage = await exchanges.getAll(conversationId, { cursor: firstPage.nextCursor });
}
```

```
import { SortOrder } from '@uipath/uipath-typescript/conversational-agent';

const firstPage = await exchanges.getAll(conversationId, {
  pageSize: 10,
  exchangeSort: SortOrder.Descending,
  messageSort: SortOrder.Ascending
});

// Navigate using cursor and same parameters
if (firstPage.hasNextPage) {
  const nextPage = await exchanges.getAll(conversationId, {
    pageSize: 10,
    exchangeSort: SortOrder.Descending,
    messageSort: SortOrder.Ascending,
    cursor: firstPage.nextCursor
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
