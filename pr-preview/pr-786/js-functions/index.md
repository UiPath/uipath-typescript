# UiPath JS Functions

**JS Functions** lets you write server-side TypeScript or JavaScript with typed input and output that **runs as a UiPath job** — callable from any UiPath surface: as a **Job**, from a **Trigger**, a **Maestro** process, or a **Flow** (the same execution model as [Python Functions](https://uipath.github.io/uipath-python/)). Functions integrate natively with the platform: they receive the caller's identity, can call Orchestrator on behalf of the user or with a workload token, and are deployed as `.nupkg` packages to any process feed.

A function can *additionally* declare **HTTP semantics** — an HTTP `method` and `path` — which exposes it as an HTTP endpoint. This is the primary use case for **Coded Apps** backends and API-style integrations, and it's what powers local `serve` for development.

## What you build

A function is a single exported `defineFunction` call. The CLI scaffolds the project, runs a local dev server with hot reload, and packs + publishes to Orchestrator.

**With HTTP semantics** — callable as a job *and* over HTTP (Coded Apps, APIs):

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

Contracts are declared **schema-first**: in TypeScript as a type via `defineSchema<T>()` (lowered to a JSON Schema at build time), in JavaScript as a JSON Schema literal — see [defineFunction — Declaring contracts](api/define-function/#declaring-contracts). Nothing executes to extract a contract, and validation runs in the platform runtime.

**Job-only** — omit `method` and `path` for a function invoked purely as a job (Trigger, Maestro, Flow, Orchestrator):

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
    // When run by the platform, ctx.robot?.accessToken is available for Orchestrator calls.
    return { status: "processed" };
  },
});
```

## How it fits together

```
Your .ts files
     │
     ▼
uip functions serve   ←  local dev (hot reload, Node or Deno)
uip functions pack    ←  builds .nupkg
uip functions publish ←  uploads to Orchestrator feed
uip functions push    ←  syncs to Studio Web project
```

## Packages

| Package                               | Purpose                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `@uipath/coded-functions-js-sdk`      | `defineFunction`, `FunctionError`, `FunctionContext` types, response helpers |
| `@uipath/functions-tool`              | Functions plugin for the `uip` CLI — `uip functions <cmd>`                   |
| `@uipath/coded-functions-js-packager` | Shared packager (used internally by the CLI)                                 |

## JS Functions vs Python Functions

UiPath supports two Functions runtimes. Both **run as jobs** and are invoked the same way from the platform (Job, Trigger, Maestro, Flow), but they target different developer profiles and use cases. JS Functions additionally support **HTTP semantics** for Coded Apps backends.

|                          | JS Functions (this site)                                | [Python Functions](https://uipath.github.io/uipath-python/) |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| Language                 | TypeScript / JavaScript                                 | Python                                                      |
| Runs as a job            | Yes (Job, Trigger, Maestro, Flow)                       | Yes (Job, Trigger, Maestro, Flow)                           |
| HTTP semantics           | Yes — Coded Apps backends, APIs                         | —                                                           |
| Use when                 | Coded Apps backends, HTTP APIs, integrations            | Data processing, ML inference, scripting                    |
| Contracts                | TS types via `defineSchema<T>()` / JSON Schema literals | pydantic / dataclasses                                      |
| Local dev                | `uip functions serve` (Node or Deno, hot reload)        | `uip functions run main.py`                                 |
| Same `uip functions` CLI | Yes                                                     | Yes                                                         |

## Next steps

- [Getting Started](getting-started/) — scaffold, run, deploy
- [Platform Context](platform-context/) — tokens, identity, context forwarding
- [Calling Orchestrator](calling-orchestrator/) — asset access patterns
- [Deployment](deployment/) — pack, publish, trigger URL, Orchestrator sync
- [Production Rules](production-rules/) — import paths, dependencies, runtime globals, etc.
- [CLI Reference](cli-reference/) — all commands and options
