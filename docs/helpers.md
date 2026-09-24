# Helper Methods

Standalone helper functions that you call directly. Unlike the SDK's services, they need no `UiPath` instance and no `initialize()` call — just import them from `@uipath/uipath-typescript/core`.

| Helper | Description |
|--------|-------------|
| [`httpRequest()`](/uipath-typescript/api/functions/httpRequest) | Calls any URL, with optional retries and backoff |
| [`wait()`](/uipath-typescript/api/functions/wait) | Pauses for a given duration, useful between calls you are pacing yourself |

!!! warning "For third-party endpoints"
    `httpRequest` sends no UiPath authentication and adds no UiPath headers. Use the SDK's service methods for UiPath APIs.

## httpRequest()

Takes a URL and optional [`HttpRequestInit`](/uipath-typescript/api/interfaces/HttpRequestInit), and resolves to an [`HttpResponse`](/uipath-typescript/api/interfaces/HttpResponse). A status the server returned does not by itself throw, even a 4xx or 5xx, so check `ok` to spot a failed request. A few conditions do throw — see [Error Handling](#error-handling).

```typescript
import { httpRequest } from '@uipath/uipath-typescript/core';

const response = await httpRequest('https://api.example.com/v1/orders');

if (response.ok) {
  console.log(response.data);
} else {
  console.log('Request failed with status', response.status);
}
```

### Retries and Backoff

By default, the idempotent methods — `GET`, `HEAD`, `PUT`, `DELETE`, and `OPTIONS`, per [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2) — are retried up to twice on a transient failure: a transport error, or a `408`, `429`, `500`, `502`, `503`, or `504`. `POST` and `PATCH` are not retried, since a replayed `POST` can create the same resource twice.

Pass `retry` to change any of that. See [`RetryOptions`](/uipath-typescript/api/interfaces/RetryOptions) for every setting and its default.

```typescript
import { httpRequest } from '@uipath/uipath-typescript/core';

await httpRequest('https://api.example.com/v1/orders', {
  method: 'POST',
  body: { sku: 'ABC-123' },
  retry: {
    maxRetries: 4,
    initialDelayMs: 1000,
    backoffStrategy: 'exponential',
    backoffFactor: 2,
    backoffMaxDelayMs: 30000,
    retryMethods: ['GET', 'HEAD', 'POST']
  }
});
```

A request that never reached the server is retried too, as long as its method is retryable. Set `retryNetworkErrors` to `false` to retry only on response status codes, leaving connection failures, DNS errors, and timeouts to fail on the first attempt. `timeoutMs` bounds a single attempt rather than the call as a whole, so each retry gets a fresh one.

### Backoff Strategies

`backoffStrategy` controls how the delay grows, given an `initialDelayMs` of `d` and a `backoffFactor` of `f`:

| Strategy | Delays |
|----------|--------|
| `constant` | `d, d, d, …` |
| `linear` | `d, 2d, 3d, …` |
| `exponential` (default) | `d, d×f, d×f², …` |

`backoffFactor` applies only to `exponential`; the other strategies ignore it. Every computed delay is capped at `backoffMaxDelayMs`.

### Retry-After Header

A `Retry-After` response header overrides the computed delay unless `respectRetryAfter` is `false`. It is applied exactly as the server sent it — `backoffMaxDelayMs` does not apply to it — so set `maxRetryAfterMs` if you need a ceiling on how long a server can ask you to wait.

### Sending a Body and Query Parameters

Objects and arrays are sent as JSON. Array values in `params` are sent as repeated query parameters.

```typescript
import { httpRequest } from '@uipath/uipath-typescript/core';

await httpRequest('https://api.example.com/v1/orders', {
  method: 'POST',
  headers: { 'x-api-key': '<apiKey>' },
  params: { region: 'emea', status: ['open', 'shipped'] },
  body: { sku: 'ABC-123' }
});
```

### Error Handling

Because it makes arbitrary third-party calls, `httpRequest` handles errors differently from the SDK's service methods, which throw on any failed status. See the [Error Handling guide](/uipath-typescript/error-handling) for the SDK-wide error types.

| Condition | Behavior |
|-----------|----------|
| The server returned a 4xx or 5xx | Resolves with `ok: false`. Branch on `ok` or `status` |
| The request never produced a response | Throws [`NetworkError`](/uipath-typescript/api/classes/NetworkError) |
| `responseType: 'json'` is set explicitly and the body does not parse | Throws [`ServerError`](/uipath-typescript/api/classes/ServerError) |
| `body` is a `ReadableStream` | Throws [`ValidationError`](/uipath-typescript/api/classes/ValidationError) — streaming request bodies are not supported |

DNS failures, refused connections, and timeouts all surface as a [`NetworkError`](/uipath-typescript/api/classes/NetworkError). Handling both a failed status and a failed connection looks like this:

```typescript
import { httpRequest, isNetworkError } from '@uipath/uipath-typescript/core';

try {
  const response = await httpRequest('https://api.example.com/v1/orders');

  if (response.ok) {
    console.log(response.data);
  } else {
    // The server answered, with a 404 or a 500 for example
    console.log('Request failed with status', response.status);
  }
} catch (error) {
  if (isNetworkError(error)) {
    // No response at all
    console.log('The request never reached the server:', error.message);
  }
}
```

Without an explicit `responseType`, an unparseable body is returned as raw text instead — auto-detection is a guess, and a host can label an HTML error page as JSON.

`data` is typed as `unknown` because the body is whatever the server sent: the shape you expect on a success, an error payload on a 4xx or 5xx, and nothing at all on a 204.

## wait()

Pauses for a duration in milliseconds. Useful for pacing calls of your own, separate from the automatic waits `httpRequest` inserts between retries.

```typescript
import { wait } from '@uipath/uipath-typescript/core';

await wait(1000); // pause for one second
```
