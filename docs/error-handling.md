# Error Handling

The SDK provides a comprehensive error handling system that helps you handle different types of errors gracefully and get meaningful error information for debugging.

## Error Types

The SDK defines several specific error types that inherit from a base [`UiPathError`](/uipath-typescript/api/classes/UiPathError) class:

### [`AuthenticationError`](/uipath-typescript/api/classes/AuthenticationError)
Thrown when authentication fails (401 status codes).

**Common scenarios:**
- Invalid credentials
- Expired token
- Missing authentication

```typescript
import { UiPath, AuthenticationError, isAuthenticationError } from '@uipath/uipath-typescript/core';

const sdk = new UiPath(config);

try {
  await sdk.initialize();
} catch (error) {
  if (isAuthenticationError(error)) {
    console.log('Authentication failed:', error.message);
    // Handle re-authentication
  }
}
```

### [`AuthorizationError`](/uipath-typescript/api/classes/AuthorizationError)
Thrown when access is denied (403 status codes).

**Common scenarios:**
- Insufficient permissions
- Access denied to specific folder
- Scope limitations

```typescript
import { UiPath, AuthorizationError, isAuthorizationError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  const folderAssets = await assets.getAll({ folderId: 12345 });
} catch (error) {
  if (isAuthorizationError(error)) {
    console.log('Access denied:', error.message);
    // Handle permission error
  }
}
```

### [`ValidationError`](/uipath-typescript/api/classes/ValidationError)
Thrown when validation fails (400 status codes).

**Common scenarios:**
- Invalid input parameters
- Missing required fields
- Invalid data format

```typescript
import { UiPath, ValidationError, isValidationError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.start({
    releaseKey: 'invalid-key'
  }, folderId);
} catch (error) {
  if (isValidationError(error)) {
    console.log('Validation failed:', error.message);
    // Handle validation errors
  }
}
```

### [`NotFoundError`](/uipath-typescript/api/classes/NotFoundError)
Thrown when requested resources are not found (404 status codes).

**Common scenarios:**
- Resource doesn't exist
- Folder not found
- Process not found

```typescript
import { UiPath, NotFoundError, isNotFoundError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  const asset = await assets.getById(99999, folderId);
} catch (error) {
  if (isNotFoundError(error)) {
    console.log('Asset not found:', error.message);
    // Handle missing resource
  }
}
```

### [`RateLimitError`](/uipath-typescript/api/classes/RateLimitError)
Thrown when rate limits are exceeded (429 status codes).

**Common scenarios:**
- Too many requests
- API rate limiting

```typescript
import { UiPath, RateLimitError, isRateLimitError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  await assets.getAll();
} catch (error) {
  if (isRateLimitError(error)) {
    console.log('Rate limit exceeded:', error.message);
    // Implement retry logic with backoff
  }
}
```

### [`ServerError`](/uipath-typescript/api/classes/ServerError)
Thrown when server errors occur (5xx status codes).

**Common scenarios:**
- Internal server error
- Service unavailable
- Gateway timeout

```typescript
import { UiPath, ServerError, isServerError } from '@uipath/uipath-typescript/core';
import { Queues } from '@uipath/uipath-typescript/queues';

const sdk = new UiPath(config);
await sdk.initialize();
const queues = new Queues(sdk);

try {
  await queues.getAll();
} catch (error) {
  if (isServerError(error)) {
    console.log('Server error:', error.message);
    // Handle server-side errors
  }
}
```

### [`NetworkError`](/uipath-typescript/api/classes/NetworkError)
Thrown when network-related errors occur.

**Common scenarios:**
- Connection timeout
- Request aborted
- DNS resolution failure
- Network connectivity issues

```typescript
import { UiPath, NetworkError, isNetworkError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.getAll();
} catch (error) {
  if (isNetworkError(error)) {
    console.log('Network error:', error.message);
    // Handle network issues
  }
}
```

## Error Information

### Getting Error Details
```typescript
import { UiPath, getErrorDetails } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  await assets.getAll();
} catch (error) {
  const details = getErrorDetails(error);
  console.log('Error message:', details.message);
  console.log('Status code:', details.statusCode);
}
```

### Accessing All Error Properties
```typescript
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const sdk = new UiPath(config);
await sdk.initialize();
const maestroProcesses = new MaestroProcesses(sdk);

try {
  const allProcesses = await maestroProcesses.getAll();
} catch (error) {
  if (error instanceof UiPathError) {
    // Access common error properties
    console.log('Error Type:', error.type);
    console.log('Message:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Request ID:', error.requestId);
    console.log('Timestamp:', error.timestamp);
    console.log('error stack trace:', error.stack);

    // Get detailed debug information including stack trace
    const debugInfo = error.getDebugInfo();
  }
}
```

### Debug Information
```typescript
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.start({ releaseKey: 'test' }, folderId);
} catch (error) {
  if (error instanceof UiPathError) {
    const debugInfo = error.getDebugInfo();
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  }
}
```
## The `httpRequest` Helper

`httpRequest` is a general-purpose HTTP utility for calling any URL. It carries no UiPath
authentication, so it follows a different error contract from the SDK's service methods.

**A status the server returned is never an exception.** A 404 or a 500 comes back as a resolved
response with `ok: false` — branch on the status rather than catching:

```typescript
import { httpRequest } from '@uipath/uipath-typescript';

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
import { httpRequest, NetworkError } from '@uipath/uipath-typescript';

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

### Retries and backoff

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

Two cases never retry, regardless of settings: a `ReadableStream` body (it is consumed by the first
attempt and cannot be replayed) and a request cancelled through `signal`.

Use `wait` to pause between calls of your own:

```typescript
import { wait } from '@uipath/uipath-typescript';

await wait(1000); // milliseconds
```
