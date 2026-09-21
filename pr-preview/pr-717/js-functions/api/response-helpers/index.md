# Response helpers

The SDK exports a set of typed response helpers. Use them instead of returning a plain `FunctionResponse` object when you want readable, self-documenting status codes.

```
import { ok, created, notFound, badRequest } from "@uipath/coded-functions-js-sdk";
```

## Success helpers

### `ok(body)`

```
ok<T>(body: T): FunctionResponse<T>
```

Returns `{ status: 200, body }`.

```
return ok({ message: "Hello" });
```

### `created(body)`

```
created<T>(body: T): FunctionResponse<T>
```

Returns `{ status: 201, body }`.

```
return created({ id: "new-resource-id" });
```

### `accepted(body?)`

```
accepted<T>(body?: T): FunctionResponse<T | undefined>
```

Returns `{ status: 202, body }`. Use for long-running operations where the result is not yet available.

### `noContent()`

```
noContent(): FunctionResponse<undefined>
```

Returns `{ status: 204 }`. No body.

## Error helpers

These return a `FunctionResponse` — they do **not** throw. Use them when you want to return a structured error response without stopping execution flow with an exception.

For errors that must halt execution (e.g. auth failures, validation errors that prevent the handler from continuing), throw [`FunctionError`](../function-error/) instead.

> **Run-as-job behavior:** when the function runs as a UiPath job (no HTTP caller), returning any response with status ≥ 400 reports the job as **Faulted**, with the message surfaced in Orchestrator's job error info (`{ error }` maps to the error title, `details` to its detail). On the HTTP path the response body is returned to the caller verbatim, exactly as written.

### `badRequest(message?, details?)`

```
badRequest(message?: string, details?: unknown): FunctionResponse<{ error: string; details?: unknown }>
```

Returns `{ status: 400, body: { error, details? } }`.

```
return badRequest("folderId is required");
return badRequest("Invalid input", { field: "folderId", reason: "must be positive" });
```

### `unauthorized(message?)`

```
unauthorized(message?: string): FunctionResponse<{ error: string }>
```

Returns `{ status: 401, body: { error } }`.

### `forbidden(message?)`

```
forbidden(message?: string): FunctionResponse<{ error: string }>
```

Returns `{ status: 403, body: { error } }`.

### `notFound(message?)`

```
notFound(message?: string): FunctionResponse<{ error: string }>
```

Returns `{ status: 404, body: { error } }`.

```
return notFound(`Invoice ${id} not found`);
```

### `conflict(message?)`

```
conflict(message?: string): FunctionResponse<{ error: string }>
```

Returns `{ status: 409, body: { error } }`.

## Generic helper

### `response(status, body?, headers?)`

```
response<T>(status: number, body?: T, headers?: Record<string, string>): FunctionResponse<T | undefined>
```

Full control over status, body, and headers.

```
return response(302, undefined, { Location: "https://example.com" });
```

## Response helpers vs FunctionError

|                     | Response helpers                                    | `FunctionError`                                         |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Throws              | No — returns a value                                | Yes — throws an exception                               |
| Execution continues | Yes                                                 | No                                                      |
| Use for             | Conditional branches that return different statuses | Auth failures, validation errors, unexpected conditions |

```
// ✅ FunctionError — stops execution immediately
if (!ctx.user) throw new FunctionError("Unauthorized", 401);

// ✅ Response helper — returns early from a conditional branch
if (!record) return notFound(`Record ${id} not found`);
return ok(record);
```
