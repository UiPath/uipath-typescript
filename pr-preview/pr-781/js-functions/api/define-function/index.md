# defineFunction

Declares a JS Function. Returns a `FunctionDefinition` that the runtime dispatches on.

```
import { defineFunction } from "@uipath/coded-functions-js-sdk";
```

## Signature

```
function defineFunction<I extends ContractSchema, O extends ContractSchema>(
  options: HttpFunctionOptions<I, O>
): FunctionDefinition

function defineFunction<I extends ContractSchema, O extends ContractSchema>(
  options: JobFunctionOptions<I, O>
): FunctionDefinition
```

A helper that wraps `defineFunction` types its options as `HttpFunctionOptions` or `JobFunctionOptions` and calls `defineFunction` with that type.

## Options

| Property      | Type                                              | Required    | Description                                                                           |
| ------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `name`        | `string`                                          | yes         | Logical name, used in the manifest and Studio                                         |
| `method`      | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE"` | HTTP only\* | HTTP method                                                                           |
| `path`        | `string`                                          | HTTP only\* | URL path, must start with `/`. Supports `:param` segments                             |
| `input`       | [`ContractSchema`](#declaring-contracts)          | no          | Request contract — validates and types input                                          |
| `output`      | [`ContractSchema`](#declaring-contracts)          | no          | Response contract: types the return value. Omit it for a handler that returns nothing |
| `handler`     | `(input, ctx) => result \| Promise<result>`       | yes         | Business logic                                                                        |
| `description` | `string`                                          | no          | Human-readable description, shown in Studio                                           |
| `tags`        | `string[]`                                        | no          | Tags for grouping in Studio                                                           |

*\* An HTTP function declares `method` and `path` together; a job-only function declares neither.*

## HTTP vs. job-only functions

Every function **runs as a job** — callable from a Trigger, a Maestro process, a Flow, or the Orchestrator API — regardless of whether it declares HTTP semantics.

- **Declare `method` + `path`** to *additionally* expose the function as an HTTP endpoint. This is what local `serve` routes to, and the use case for **Coded Apps** backends and API-style integrations.
- **Omit both** for a **job-only** function. It stays in the manifest and is fully invokable as a job, but gets no HTTP route. Its handler receives a [`JobContext`](../function-context/#jobcontext) and returns the declared output.

## handler

An HTTP function's handler:

```
handler: async (input: HandlerInput<I>, ctx: HttpContext) =>
  | T                                                      // the declared output, serialized as JSON with status 200
  | FunctionResponse<T>                                    // { status, body?, headers? } carrying the declared output
  | FunctionResponse<{ error: string; details?: unknown }> // an error body, e.g. badRequest(...)
```

`T` is the declared output. Without an `output`, `T` is `void`: the handler returns nothing, `noContent()`, or an error response.

A job-only function's handler returns the declared output, or nothing when it declares no `output`. To fail the job, throw a [`FunctionError`](../function-error/).

```
handler: async (input: HandlerInput<I>, ctx: JobContext) => T
```

The runtime fails a job-only function's job with `OutputValidationFailed` when the handler returns a `Response`, or an object with a numeric `status` that no declared `output` accepts.

The handler's `input` parameter is typed from the declared contract: for `defineSchema<T>()` it is `T`; for a JSON Schema literal it is the type derived from the literal. If `output` is declared, `T` must match it the same way.

## Declaring contracts

A contract is a **curated JSON Schema subset** — inert data, statically extractable without executing your code. Two authoring variants feed the same runtime validation path:

**TypeScript — declare the contract as a type with `defineSchema<T>()`:**

```
import { defineFunction, defineSchema } from "@uipath/coded-functions-js-sdk";

interface CreateOrderInput {
  customerId: string;
  items: { sku: string; qty: number }[];
  note?: string;
}

interface CreateOrderOutput {
  ok: boolean;
}

export default defineFunction({
  name: "create-order",
  method: "POST",
  path: "/orders",
  input: defineSchema<CreateOrderInput>(),
  output: defineSchema<CreateOrderOutput>(),
  handler: async (input) => ({ ok: true }), // input is CreateOrderInput
});
```

`defineSchema<T>()` is inert at runtime. At build time (`pack`/`serve`/`run`) the type is **lowered** to the equivalent JSON Schema literal, which is what the runtime validates and what lands in the manifest. Write it in place in the `defineFunction(...)` call that the file default-exports, as above; that call may also sit in a `const` the file exports as default and uses nowhere else. Anywhere else, declare `input`/`output` as a JSON Schema literal or a validator.

**JavaScript — write the JSON Schema literal directly:**

```
// @ts-check
import { defineFunction } from "@uipath/coded-functions-js-sdk";

export default defineFunction({
  name: "create-order",
  method: "POST",
  path: "/orders",
  input: {
    type: "object",
    properties: {
      customerId: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { sku: { type: "string" }, qty: { type: "number" } },
          required: ["sku", "qty"],
          additionalProperties: false,
        },
      },
      note: { type: "string" },
    },
    required: ["customerId", "items"],
    additionalProperties: false,
  },
  output: {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  },
  handler: async (input) => ({ ok: true }), // input type is derived from the literal
});
```

Both variants above declare the **same contract** — the TS type lowers to exactly that literal.

### How types map to schemas

| TypeScript                                              | JSON Schema                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `string` / `number` / `boolean`                         | `{ "type": "string" \| "number" \| "boolean" }`                                       |
| `"draft" \| "sent"` (literal union)                     | `{ "type": "string", "enum": [...] }` — numeric literal unions likewise               |
| String / numeric TS `enum`                              | `{ "type": "string" \| "number", "enum": [...] }`                                     |
| `T[]`                                                   | `{ "type": "array", "items": ... }`                                                   |
| `interface` / object type                               | closed object — `additionalProperties: false`, non-optional props in `required`       |
| `foo?: T`                                               | property present, not in `required`                                                   |
| `Record<string, T>`                                     | `{ "type": "object", "additionalProperties": <schema of T> }`                         |
| `unknown` (value position)                              | `{}` — accepts any JSON value (e.g. `Record<string, unknown>` for arbitrary job args) |
| `string` tagged `/** @format date-time */`              | `{ "type": "string", "format": "date-time" }` (see [Dates](#dates))                   |
| `A \| B` (non-literal)                                  | `{ "anyOf": [...] }`                                                                  |
| `any`, `bigint`, tuples, functions, top-level `unknown` | rejected at build time with an actionable diagnostic                                  |
| `Date`                                                  | rejected at build time with `unsupported-date` (see [Dates](#dates))                  |

### JSDoc `@default`

A TS type cannot express a default value, so the derivation reads it from JSDoc:

```
interface HelloInput {
  /**
   * Name to greet — filled in by the runtime when omitted.
   * @default "World"
   */
  name?: string;
}
```

This lowers to `{ "type": "string", "default": "World" }`; the runtime fills the field when the caller omits it. The tag text is parsed as JSON (`"World"` → string, `3` → number, `true` → boolean).

### JSDoc `@format`

A `@format` tag on a `string` property adds a `format` to its schema. The supported formats are `date-time`, `date`, `time`, `email`, `uri` and `uuid`.

```
interface ContactInput {
  /** @format email */
  email: string;
}
```

This lowers to `{ "type": "string", "format": "email" }`. The runtime rejects a value outside the format with a `400` on input and a `500` on output. The tag goes on a `string` or `string | null` property; any other format or placement stops the build with `unsupported-format`. Put the tag on its own line above the property: TypeScript drops a JSDoc written on the same line as the opening `{`.

### Dates

JSON carries a date as an ISO 8601 string. Declare it as a `string` tagged `@format date-time`, and build the `Date` in the handler:

```
import { badRequest, defineFunction, defineSchema } from "@uipath/coded-functions-js-sdk";

interface ReminderInput {
  /** @format date-time */
  dueAt: string;
}

interface ReminderOutput {
  /** @format date-time */
  remindAt: string;
}

export default defineFunction({
  name: "remind",
  method: "POST",
  path: "/reminders",
  input: defineSchema<ReminderInput>(),
  output: defineSchema<ReminderOutput>(),
  handler: async (input) => {
    const dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime())) return badRequest("dueAt is not a representable date");
    const remindAt = new Date(dueAt.getTime() - 60 * 60 * 1000);
    return { remindAt: remindAt.toISOString() };
  },
});
```

The runtime validates `dueAt` as a date-time before the handler runs. Check the parsed `Date` as well: a leap second such as `23:59:60` passes the format and parses to an invalid date.

### The curated subset

Hand-written literals may use the full subset — including validation keywords a TS type cannot express:

| Group       | Keywords                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Types       | `type`: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`                         |
| Annotations | `title`, `description`, `default`                                                                   |
| Literals    | `const`, `enum`                                                                                     |
| Strings     | `format` (`date-time`, `date`, `time`, `email`, `uri`, `uuid`), `minLength`, `maxLength`, `pattern` |
| Numbers     | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`                          |
| Arrays      | `items`, `minItems`, `maxItems`, `uniqueItems`                                                      |
| Objects     | `properties`, `required`, `additionalProperties`                                                    |
| Composition | `anyOf`, `oneOf`, `allOf`                                                                           |

No `$ref`/`$defs`, no custom keywords, no custom format functions — a contract stays inert, portable data. The literal must also be **static**: no spreads, computed keys, or identifier references.

### Runtime validation

The runtime compiles the contract with ajv (ajv never appears in your project):

- **Input** is validated before the handler runs; failures return `400` with per-field errors.
- **Values are validated as they arrive.** Query and path values are strings; declare them as `string` and convert in the handler (see [path parameters](../../platform-context/#path-parameters)).
- **`default`** values are filled into missing input fields.
- **Output** (when declared) is validated after the handler; failures return `500`.

### Backwards compatibility: validator schemas

`input`/`output` may still be a [Standard Schema](https://standardschema.dev/) object (`zod` >= 4.2, `arktype` >= 2.1.28, `valibot` >= 1.2 with `@valibot/to-json-schema` >= 1.5). These keep working unchanged, but require **executing** your module to obtain the contract — so they don't work with static tooling (Studio Web contract extraction) and need the validator as a runtime dependency. Prefer `defineSchema<T>()` / literals for new functions.

## Examples

### Minimal POST

```
import { defineFunction, defineSchema } from "@uipath/coded-functions-js-sdk";

interface HelloInput {
  /** @default "World" */
  name?: string;
}

interface HelloOutput {
  message: string;
}

export default defineFunction({
  name: "hello",
  method: "POST",
  path: "/hello",
  input: defineSchema<HelloInput>(),
  output: defineSchema<HelloOutput>(),
  handler: async (input) => ({ message: `Hello, ${input.name}!` }),
});
```

### Job-only (no HTTP route)

Omit `method` and `path` for a function invoked purely as a job — from a Trigger, Maestro, Flow, or the Orchestrator API. Run it locally with [`uip functions run`](../../cli-reference/#run).

```
import { defineFunction, defineSchema } from "@uipath/coded-functions-js-sdk";

interface ProcessInvoiceInput {
  invoiceId: string;
}

interface ProcessInvoiceOutput {
  status: string;
}

export default defineFunction({
  name: "process-invoice",
  input: defineSchema<ProcessInvoiceInput>(),
  output: defineSchema<ProcessInvoiceOutput>(),
  handler: async (input, ctx) => {
    // Called as a job: there is no caller identity (ctx.user?.accessToken is undefined);
    // use ctx.robot?.accessToken, which the platform provides for a deployed job.
    return { status: "processed" };
  },
});
```

### GET with path parameter

```
interface Invoice {
  id: string;
}

export default defineFunction({
  name: "get-invoice",
  method: "GET",
  path: "/invoices/:id",
  output: defineSchema<Invoice>(),
  handler: async (input, ctx) => {
    return { id: ctx.params.id };
  },
});
```

`GET /invoices/INV-001` binds `ctx.params.id` to `"INV-001"` in local `serve` and when deployed alike. The `path` is registered as the trigger's slug verbatim, pattern included, and the deployed trigger resolves it by route matching. See [Platform Context — path parameters](../../platform-context/#path-parameters) for the full pattern syntax and the matching rules.

### Custom status

Return a `FunctionResponse` to control the HTTP status:

```
handler: async (input) => {
  return { status: 201, body: { id: "new-id" } };
}
```

### FunctionResponse with headers

```
handler: async (input) => {
  return {
    status: 200,
    body: { ok: true },
    headers: { "X-Custom-Header": "value" },
  };
}
```

## Validation

`defineFunction` throws at module load time if:

- only one of `method` / `path` is provided (supply both, or omit both for a job-only function)
- `method` is not one of the five allowed HTTP methods
- `path` does not start with `/`
