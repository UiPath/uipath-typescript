# Getting Started

## Prerequisites

- Node.js v20+
- UiPath CLI with the functions tool installed:

```
npm install -g @uipath/cli
uip tools install --package-name @uipath/functions-tool
```

## 1. Create a project

```
uip functions new my-functions -l ts
cd my-functions
```

This scaffolds a TypeScript project with a `hello` function, installs dependencies, and creates `uipath.json`. Use `-l js` for JavaScript.

Python Functions

`uip functions new` also supports `--language py` for Python projects. Python Functions are a separate runtime with different capabilities — see the [Python Functions documentation](https://uipath.github.io/uipath-python/) for that path.

Options:

| Flag                    | Description                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `-l, --language <lang>` | `ts` (default) or `js` for this guide; `py`/`python` for [Python Functions](https://uipath.github.io/uipath-python/) |
| `--empty`               | Skip the hello world function (JS/TS only)                                                                           |

The generated project structure:

```
my-functions/
├── functions/
│   └── hello.ts          # your functions go here — one function per file
├── uipath.json           # maps function names → entry points
├── package.json
└── tsconfig.json
```

`uipath.json` example:

```
{
  "functions": {
    "hello": "functions/hello.ts:default"
  }
}
```

### The `functions/` folder is authoritative

You do not maintain the `functions` map by hand. `serve`, `debug`, `pack` and `push` all rewrite it from the folder contents first, so **hand edits are overwritten** — including in the deployed container, which re-syncs from the packaged `functions/` folder when it starts the server.

The rules discovery applies, in full:

|                              |                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Registered as a function** | every `.ts`/`.js` file directly inside `functions/`                                                                               |
| **Skipped**                  | names starting with `_` (e.g. `_helpers.ts`), and `.d.ts` files                                                                   |
| **Not discovered at all**    | subfolders — `functions/lib/util.ts` is never registered, and a hand-written map entry pointing at one is pruned on the next sync |
| **Key**                      | the filename without its extension, so `functions/create-order.ts` → `"create-order"`                                             |

Discovery is by filename, not by content: a file lands in the map whether or not it defines a function. Every registered file must therefore default-export its function definition, normally the result of `defineFunction(...)`; only the default export is served. The call may sit behind your own helper (`export default appFunction({...})` where `appFunction` returns `defineFunction(...)`); the CLI then reads the contract by executing the module instead of statically, and the runtime rejects the file by name if what it exports is not a function definition. `defineSchema<T>()` markers are lowered only inside a literal `defineFunction(...)` call — behind a helper, declare `input`/`output` as a JSON Schema literal or a zod schema.

Anything else that lives next to your functions is a **helper**, and needs to be either `_`-prefixed or moved out of `functions/` (e.g. to `lib/`). Both work; the `_` prefix is handy when you want the helper to stay beside its function.

```
functions/
├── create-order.ts       # registered → "create-order"
├── _validate.ts          # skipped (helper)
└── types.d.ts            # skipped
lib/
└── http.ts               # not in functions/, so never registered
```

`serve`, `debug`, `pack` and `push` check for the default export and **fail with the offending file named** before generating or uploading anything, so a stray helper cannot reach a deployment. Left unchecked it would break the whole package rather than one route: the generated aggregator imports every registered file, and one unloadable import takes down every endpoint.

## 2. Run locally

```
uip functions serve
```

Starts a hot-reload server on `http://localhost:7070`. The function is immediately callable:

```
curl -X POST http://localhost:7070/hello \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'
# {"message":"Hello, Alice!"}
```

For local access to Orchestrator, your function handlers read credentials from environment variables (`UIPATH_ACCESS_TOKEN`, `UIPATH_BASE_URL`, `UIPATH_ORG_ID`, `UIPATH_TENANT_ID`). Set them in your shell before starting the server.

**Option A — Deno runtime (recommended for local dev with credentials):**

```
uip functions serve --runtime deno
```

Deno reads `.env` natively. Create a `.env` file:

```
UIPATH_ACCESS_TOKEN=<OAuth token>
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_ID=<org-UUID>
UIPATH_TENANT_ID=<tenant-UUID>
```

**Option B — Node runtime, load env vars in shell first:**

```
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
  }
}
uip functions serve
```

```
set -a && source .env && set +a
uip functions serve
```

Known limitation

`uip functions serve` (Node runtime) cannot auto-load `.env` via `--env-file` in some environments. If you see `node: --env-file= is not allowed in NODE_OPTIONS`, use Option A (Deno) or Option B (manual shell loading).

## 3. Pack

```
uip functions pack
```

Creates `.uipath/<name>.<version>.nupkg` from `package.json` `name` and `version`. Re-packing the same version overwrites the file.

## 4. Publish to Orchestrator

Log in first — `uip login` stores your session and publish picks it up automatically:

```
uip login
uip functions publish
```

Fetches available process feeds and prompts for selection. For CI, pass credentials explicitly and skip the interactive picker with `--feed-id`:

```
uip functions publish \
  --url https://cloud.uipath.com \
  --org <org> \
  --tenant <tenant> \
  --token $UIPATH_ACCESS_TOKEN \
  --feed-id <feed-uuid>
```

After publishing, go to **Orchestrator → Automations → Processes**, find your package, and update the release to the latest version. This triggers Orchestrator to read the new manifest and sync API Triggers. See [Deployment — After publish](../deployment/#after-publish-update-the-function-release).

## 5. Push to Studio Web (optional)

```
uip functions push --project-id <studio-web-project-id>
```

Diffs local files against the Studio Web project and uploads only what changed. Create the project in Studio Web first to get the project ID.

## Full workflow

```
uip functions new my-functions -l ts && cd my-functions
uip functions serve                    # develop
uip functions pack
uip login
uip functions publish
```
