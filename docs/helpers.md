# Helper Methods

Standalone functions you call directly — no `UiPath` instance, no service class.

- **`httpRequest`** calls any URL, with optional retries, backoff, and a per-attempt timeout. It
  sends no UiPath authentication and adds no UiPath headers, so it is for third-party endpoints —
  use the SDK's service methods for UiPath itself.
- **`wait`** pauses for a duration, useful between calls you are pacing yourself.

## Error contract

Because it proxies arbitrary third-party calls, `httpRequest` follows a different contract from the
SDK's service methods.

**A status the server returned is never an exception.** A 404 or a 500 comes back as a resolved
response with `ok: false` — branch on the status rather than catching:

```typescript
import { httpRequest } from '@uipath/uipath-typescript/core';

const response = await httpRequest('https://api.example.com/v1/orders');

if (response.ok) {
  console.log(response.data);
} else {
  console.log('Request failed with status', response.status);
}
```

**`data` is `unknown`.** The body is whatever the server sent — the shape you expect on a success,
an error payload on a 4xx or 5xx, and nothing at all on a 204. Give it a type once you know which
you have:

```typescript
if (response.ok) {
  const order = response.data as { id: string };
  console.log(order.id);
}
```

**A request that never produced a response still throws.** DNS failures, refused connections,
a timeout, and caller cancellation all surface as a `NetworkError`:

```typescript
import { httpRequest, NetworkError } from '@uipath/uipath-typescript/core';

try {
  await httpRequest('https://api.example.com/v1/orders', { timeoutMs: 5000 });
} catch (error) {
  if (error instanceof NetworkError) {
    console.log('The request never reached the server:', error.message);
  }
}
```

One other case throws: asking for `responseType: 'json'` explicitly when the body does not parse
raises a `ServerError`. Without an explicit `responseType`, an unparseable body is returned as raw
text instead — auto-detection is a guess, and a host can label an HTML error page as JSON.

## Retries and backoff

The idempotent methods — `GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`, per RFC 9110 — are retried up
to twice by default on a transient failure: a transport error, or a `408`, `429`, `500`, `502`,
`503`, or `504`. `POST` and `PATCH` are not retried, since a replayed `POST` can create the same
resource twice. Pass `retry` to change any of that:

```typescript
const response = await httpRequest('https://api.example.com/v1/orders', {
  method: 'POST',
  body: { sku: 'ABC-123' },
  timeoutMs: 10000,              // bounds one attempt; each retry gets a fresh timeout
  retry: {
    maxRetries: 4,
    initialDelayMs: 1000,   // the first delay; later ones grow from it
    backoffStrategy: 'exponential',     // 1s, 2s, 4s, 8s
    backoffFactor: 2,
    backoffMaxDelayMs: 30000,
    retryMethods: ['GET', 'HEAD', 'POST']
  }
});
```

`backoffStrategy` controls how the delay grows, given an `initialDelayMs` of `d` and a `backoffFactor` of `f`:

| Strategy | Delays |
|---|---|
| `constant` | `d, d, d, …` |
| `linear` | `d, 2d, 3d, …` |
| `exponential` (default) | `d, d×f, d×f², …` |

`backoffFactor` applies only to `exponential`; the other strategies ignore it. Every computed delay
is capped at `backoffMaxDelayMs`.

A `Retry-After` response header overrides the computed delay unless `respectRetryAfter` is `false`.
It is honoured as the server sent it — `backoffMaxDelayMs` does not apply to it — so set
`maxRetryAfterMs` if you need a ceiling on how long a server can ask you to wait.

Set `retryNetworkErrors: false` to retry only on response status codes, leaving connection
failures, DNS errors, and timeouts to fail on the first attempt.

`timeoutMs` sits outside `retry` deliberately — it bounds a single attempt whether or not
retrying is enabled, so a call that just needs a deadline does not have to open a bag of retry
options to get one:

```typescript
// one attempt, five second ceiling, no retrying involved
const response = await httpRequest('https://api.example.com/v1/orders', { timeoutMs: 5000 });
```

A request cancelled through `signal` never retries, regardless of settings.

Use `wait` to pause between calls of your own:

```typescript
import { wait } from '@uipath/uipath-typescript/core';

await wait(1000); // milliseconds
```
