# Helper Methods

Standalone helper functions that you call directly. Unlike the SDK's services, they need no `UiPath` instance and no `initialize()` call — just import them from `@uipath/uipath-typescript/core`.

| Helper          | Description                                                               |
| --------------- | ------------------------------------------------------------------------- |
| `httpRequest()` | Calls any URL, with optional retries and backoff                          |
| `wait()`        | Pauses for a given duration, useful between calls you are pacing yourself |

For third-party endpoints

`httpRequest` sends no UiPath authentication and adds no UiPath headers. Use the SDK's service methods for UiPath APIs.

## httpRequest()

Takes a URL and optional `HttpRequestInit`, and resolves to an `HttpResponse`. A status the server returned resolves rather than throwing, even a 4xx or 5xx, so check `ok` to spot a failed request. A call that never reached the server does throw — see [Error Handling](#error-handling).

```
import { httpRequest } from '@uipath/uipath-typescript/core';

const response = await httpRequest('https://api.example.com/v1/orders');

if (response.ok) {
  console.log(response.data);
} else {
  console.log('Request failed with status', response.status);
}
```

### Retries and Backoff

By default, the idempotent methods — `GET`, `HEAD`, `PUT`, `DELETE`, and `OPTIONS`, per RFC 9110 — are retried up to twice on a transient failure: a transport error, or a `408`, `429`, `500`, `502`, `503`, or `504`. `POST` and `PATCH` are not retried, since a replayed `POST` can create the same resource twice.

Pass `retry` to change any of that. See `RetryOptions` for every setting and its default.

```
import { httpRequest } from '@uipath/uipath-typescript/core';

const response = await httpRequest('https://api.example.com/v1/orders', {
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

Requests that never reached the server are retried too. Set `retryNetworkErrors` to `false` to retry only on response status codes, leaving connection failures and DNS errors to fail on the first attempt. `timeoutMs` bounds a single attempt rather than the call as a whole, so each retry gets a fresh one.

#### Backoff Strategies

`backoffStrategy` controls how the delay grows, given an `initialDelayMs` of `d` and a `backoffFactor` of `f`:

| Strategy                | Delays            |
| ----------------------- | ----------------- |
| `constant`              | `d, d, d, …`      |
| `linear`                | `d, 2d, 3d, …`    |
| `exponential` (default) | `d, d×f, d×f², …` |

`backoffFactor` applies only to `exponential`; the other strategies ignore it. Every computed delay is capped at `backoffMaxDelayMs`.

#### Retry-After Header

A `Retry-After` response header overrides the computed delay unless `respectRetryAfter` is `false`. It is applied exactly as the server sent it — `backoffMaxDelayMs` does not apply to it — so set `maxRetryAfterMs` if you need a ceiling on how long a server can ask you to wait.

### Sending a Body and Query Parameters

Objects and arrays are sent as JSON. Array values in `params` are sent as repeated query parameters.

```
import { httpRequest } from '@uipath/uipath-typescript/core';

const response = await httpRequest('https://api.example.com/v1/orders', {
  method: 'POST',
  headers: { 'x-api-key': apiKey },
  params: { region: 'emea' },
  body: { sku: 'ABC-123' }
});
```

### Error Handling

Because it proxies arbitrary third-party calls, `httpRequest` handles errors differently from the SDK's service methods, which always throw. See the [Error Handling guide](/uipath-typescript/error-handling/) for the SDK-wide error types.

| Condition                                                            | Behavior                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| The server returned a status, including 4xx and 5xx                  | Resolves with `ok: false`, no exception. Branch on `ok` or `status` |
| The request never produced a response                                | Throws `NetworkError`                                               |
| `responseType: 'json'` is set explicitly and the body does not parse | Throws `ServerError`                                                |

DNS failures, refused connections, and timeouts all surface as a `NetworkError`. Handling both a failed status and a failed connection looks like this:

```
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

```
import { wait } from '@uipath/uipath-typescript/core';

await wait(1000); // milliseconds
```
