# Feedback

Service for managing UiPath Agent Feedback. Collect and manage user feedback on AI agent responses,
including positive/negative ratings, comments, and categorized feedback.
This is useful for monitoring agent quality, identifying areas for improvement,
and building datasets for fine-tuning.

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

## Usage

```typescript
import { Feedback } from '@uipath/uipath-typescript/feedback';

const feedback = new Feedback(sdk);
const allFeedback = await feedback.getAll();
```

## Methods

### getAll()

> **getAll**(`options?`: [`FeedbackGetAllOptions`](../../api/interfaces/FeedbackGetAllOptions.md)): `Promise`&lt;[`NonPaginatedResponse`](../../api/interfaces/NonPaginatedResponse.md)&lt;[`FeedbackResponse`](../../api/interfaces/FeedbackResponse.md)&gt; | [`PaginatedResponse`](../../api/interfaces/PaginatedResponse.md)&lt;[`FeedbackResponse`](../../api/interfaces/FeedbackResponse.md)&gt;&gt;

Gets all feedback with optional filters.

Retrieves a list of feedback entries, optionally filtered by agent, trace, span,
status, or agent version.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`FeedbackGetAllOptions`](../../api/interfaces/FeedbackGetAllOptions.md) | Optional query parameters for filtering and pagination |

#### Returns

`Promise`&lt;[`NonPaginatedResponse`](../../api/interfaces/NonPaginatedResponse.md)&lt;[`FeedbackResponse`](../../api/interfaces/FeedbackResponse.md)&gt;&gt; when no pagination options are provided

`Promise`&lt;[`PaginatedResponse`](../../api/interfaces/PaginatedResponse.md)&lt;[`FeedbackResponse`](../../api/interfaces/FeedbackResponse.md)&gt;&gt; when pagination options (`pageSize`, `cursor`, or `jumpToPage`) are provided

#### Examples

```typescript
// Get all feedback
const allFeedback = await feedback.getAll();
```

```typescript
// Get feedback for a specific agent
const agentFeedback = await feedback.getAll({
  agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
});
```

```typescript
// First page with pagination
const page1 = await feedback.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await feedback.getAll({ cursor: page1.nextCursor });
}
```

```typescript
// Jump to specific page
const page5 = await feedback.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```

```typescript
// Filter by status
const activeFeedback = await feedback.getAll({
  status: FeedbackStatus.Pending,
});
```
