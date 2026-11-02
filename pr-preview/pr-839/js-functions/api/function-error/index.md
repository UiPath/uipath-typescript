# FunctionError

Throw `FunctionError` from a handler to return a specific HTTP status code. The runtime catches it and sends the error response instead of a 500.

```
import { FunctionError } from "@uipath/coded-functions-js-sdk";
```

## Constructor

```
// HTTP-style form
new FunctionError(errorMessage: string, status: number, errorCode?: string, details?: unknown)

// Status-less form — for job-only functions, where an HTTP status has no meaning
new FunctionError(errorMessage: string, options?: { status?: number; errorCode?: string; details?: unknown })
```

| Parameter      | Type      | Required | Description                                                                                           |
| -------------- | --------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `errorMessage` | `string`  | yes      | Human-readable error message                                                                          |
| `status`       | `number`  | no       | HTTP status code to return when called over HTTP (defaults to 500 there). Omit for job-only functions |
| `errorCode`    | `string`  | no       | Machine-readable error code for the caller                                                            |
| `details`      | `unknown` | no       | Additional structured data (serialized to JSON)                                                       |

## Properties

| Property    | Type                  |
| ----------- | --------------------- |
| `message`   | `string`              |
| `status`    | `number \| undefined` |
| `errorCode` | `string \| undefined` |
| `details`   | `unknown`             |
| `name`      | `"FunctionError"`     |

## Examples

### 404 Not found

```
throw new FunctionError("Invoice not found", 404);
```

### 403 with error code

```
throw new FunctionError("Access denied", 403, "INSUFFICIENT_PERMISSIONS");
```

### 400 with validation details

```
throw new FunctionError(
  "Invalid input",
  400,
  "VALIDATION_ERROR",
  { field: "folderId", reason: "must be a positive integer" },
);
```

### Job-only function — no HTTP status to invent

```
throw new FunctionError("Contract already renewed", { errorCode: "ALREADY_RENEWED" });
```

### Guard pattern

```
if (!ctx.user?.accessToken) {
  throw new FunctionError(
    "User access token not available — invoke from a logged-in coded app",
    403,
  );
}
```

## What each surface receives

**HTTP call** — the error body keeps the `{error, details?}` wire contract, with the thrown `status` as the HTTP status (500 when none was given):

```
{ "error": "Invoice not found", "details": { "invoiceId": "INV-042" } }
```

A `FunctionError` fills them with the author's message and `details`; an unanticipated throw renders its message with the stack as `details`. (`errorCode` is not part of the HTTP body — it is a job-surface field.)

**Job run** — the job reports `Faulted` and the error is rendered as the standard contract in Orchestrator's job error info:

```
{ "code": "INVOICE_NOT_FOUND", "title": "Invoice not found", "detail": "...", "category": "User", "status": 404 }
```

A `FunctionError` populates it deliberately: `errorCode` → `code`, `message` → `title`, `details` (JSON-stringified) → `detail`, `status` → `status`; `category` is `User` — raised by function code.

## Unanticipated errors

Any other throw (a plain `Error`, a failed `fetch`, a string) forwards in full too: over HTTP the caller gets `{"error": "<message>", "details": "<stack>"}` with status 500; on a job run the error info shows `code: "JsCodedFunction.HandlerError"`, the message as `title` and the stack in `detail`. Prefer `FunctionError` anyway — it gives the error a meaningful code and status instead of the generic `HandlerError`/500.

The one exception is a failure of the runtime itself (category `System`): those are reported generically, with the real error kept in the runtime logs.

## Constructor argument order

The arguments are `(message, status)` — not `(status, message)`. Both are valid TypeScript, but the wrong order produces a confusing error:

```
throw new FunctionError("Not found", 404);   // ✅ correct
throw new FunctionError(404, "Not found");   // ❌ compiles, misbehaves at runtime
```
