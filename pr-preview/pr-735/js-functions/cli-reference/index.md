# CLI Reference

`@uipath/functions-tool` is a plugin for the UiPath unified CLI (`uip`). Install the CLI first, then install the functions tool:

```
npm install -g @uipath/cli
uip tools install --package-name @uipath/functions-tool
uip functions --help
```

______________________________________________________________________

## `new`

Scaffold a new JS/TS Functions project.

```
uip functions new [name] [options]
```

| Option                  | Default        | Description                                                                                                     |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `[name]`                | `my-functions` | Project name and directory                                                                                      |
| `--name <name>`         |                | Alias for positional name                                                                                       |
| `-l, --language <lang>` | `ts`           | `ts` (default) or `js` for JS/TS; `py`/`python` for [Python Functions](https://uipath.github.io/uipath-python/) |
| `--empty`               |                | Skip the hello world function (JS/TS only)                                                                      |

Creates the project directory, scaffolds `uipath.json`, `package.json`, `tsconfig.json`, and (unless `--empty`) a hello world function. Then installs with the package manager the machine resolves to: npm when both npm and bun are present, and that manager writes the project's lock file.

______________________________________________________________________

## `serve`

Start local function server with hot reload.

```
uip functions serve [options]
```

| Option                   | Default | Description                                                                    |
| ------------------------ | ------- | ------------------------------------------------------------------------------ |
| `--runtime <node\|deno>` | `node`  | JavaScript runtime                                                             |
| `--port <port>`          | `7070`  | Port to listen on                                                              |
| `--production`           |         | Skip server-runner install and freePort check (used by the platform container) |

Auto-syncs the `functions` map in `uipath.json` before starting. Deno runtime reads `.env` natively; Node runtime cannot auto-load `.env` via `--env-file` in some environments — use `--runtime deno` or load env vars in your shell before running `serve` (see [Getting Started — local dev](../getting-started/#2-run-locally)).

______________________________________________________________________

## `run`

Execute a single coded function once (one-shot job) and report the result. Unlike `serve`, this runs the function directly without a long-lived HTTP server — the same code path the platform uses to execute a job.

```
uip functions run [options]
```

| Option                   | Default | Description                                                                                   |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `--runtime <node\|deno>` | `node`  | JavaScript runtime                                                                            |
| `--entrypoint <path>`    |         | Path to the function file                                                                     |
| `--function <name>`      |         | Function name resolved via `uipath.json`                                                      |
| `--input <json>`         | `{}`    | JSON input payload                                                                            |
| `--input-file <path>`    |         | Path to a JSON input file (takes priority over `--input`)                                     |
| `--context <json>`       |         | JSON runtime-context payload (used when `--context-file` is absent)                           |
| `--context-file <path>`  |         | Path to the runtime-context JSON file (takes priority over `--context`)                       |
| `--production`           |         | Run under production context; skip the `.uipath/server-runner` install when it already exists |

Provide the target with exactly one of `--entrypoint` (path to the file) or `--function` (name resolved through `uipath.json`). Bootstraps runtime dependencies into `.uipath/server-runner` on first run. The process exit code reflects the job outcome (non-zero on failure).

```
uip functions run --function hello --input '{"name":"world"}'
```

______________________________________________________________________

## `invoke`

Invoke a function against the local `serve` endpoint over HTTP (dev convenience). Requires `uip functions serve` to be running.

```
uip functions invoke <path> [options]
```

| Option           | Default | Description                                                                                      |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `<path>`         |         | The function's HTTP `path`, e.g. `/hello` or `/invoices/INV-1` (leading `/` optional). Required. |
| `--port <port>`  | `7070`  | Port the local server is running on                                                              |
| `--input <json>` | `{}`    | JSON request body                                                                                |

Sends `POST http://localhost:<port>/<path>` with the JSON body and prints the response status and body. It always uses `POST`; for `GET`/`PUT`/`PATCH`/`DELETE` routes use a tool like `curl`. Exits non-zero if the server is unreachable or the function returns a non-2xx status.

```
uip functions invoke /hello --input '{"name":"world"}'
```

______________________________________________________________________

## `pack`

Pack the project into a `.nupkg` for deployment.

```
uip functions pack [options]
```

| Option     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `--nolock` | Deprecated and ignored — the project's lock file is always packaged |

Reads `name` and `version` from `package.json`. Writes `.uipath/<name>.<version>.nupkg`. Re-packing the same version overwrites the file.

The project must be ready to package: `node_modules/` present, exactly one supported lock file — `package-lock.json` (npm) or `bun.lock` (bun) — and that lock still current, which the package manager itself confirms via `npm ci --dry-run` / `bun install --frozen-lockfile --dry-run` (neither installs nor writes anything). When the manager cannot answer, because the registry is unreachable or unauthenticated, `pack` stops as well — reported as the check failing, not as a stale lock. `pack` never installs for you. Any other lock file (`yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`) is dropped so the pod's installer cannot prefer it. `serve`, `run` and `debug` do not check the lock at all — Node does not read one.

Steps performed:

1. Check the project is installed
1. Sync `uipath.json` functions map
1. Generate aggregator
1. Extract function manifest → `entry-points.json`, `bindings_v2.json`
1. Build content folder via packager
1. Zip to `.nupkg`

______________________________________________________________________

## `publish`

Upload the packed `.nupkg` to an Orchestrator process feed.

```
uip functions publish [options]
```

| Option              | Env var                    | Description                                 |
| ------------------- | -------------------------- | ------------------------------------------- |
| `--url <url>`       | `UIPATH_URL`               | Platform base URL                           |
| `--org <org>`       | `UIPATH_ORGANIZATION_NAME` | Organization name                           |
| `--tenant <tenant>` | `UIPATH_TENANT_NAME`       | Tenant name                                 |
| `--token <token>`   | `UIPATH_ACCESS_TOKEN`      | Access token                                |
| `--feed-id <id>`    |                            | Feed ID — skips interactive picker (for CI) |

Picks the most recently modified `.nupkg` in `.uipath/`. Without `--feed-id`, shows an interactive numbered list of available process feeds (press ESC to cancel).

______________________________________________________________________

## `push`

Sync the local project to a Studio Web project.

```
uip functions push [options]
```

| Option              | Env var                    | Description                      |
| ------------------- | -------------------------- | -------------------------------- |
| `--url <url>`       | `UIPATH_URL`               | Platform base URL                |
| `--org <org>`       | `UIPATH_ORGANIZATION_NAME` | Organization name                |
| `--tenant <tenant>` | `UIPATH_TENANT_NAME`       | Tenant name                      |
| `--token <token>`   | `UIPATH_ACCESS_TOKEN`      | Access token                     |
| `--project-id <id>` | `UIPATH_PROJECT_ID`        | Studio Web project ID (required) |

Auto-syncs the `functions` map in `uipath.json`, generates `entry-points.json`, diffs local files against remote by hash, and uploads only what changed. Create the project in Studio Web first to get the project ID.

The remote layout mirrors the local project root; Studio Web system files (`project.uiproj`, `.project/`, `.settings/`) are never touched, and neither is anything under `.uipath/` apart from `studio_metadata.json`.

Each push also updates `.uipath/studio_metadata.json`, which Studio Web uses to detect the push (offering a Reload in an open editor) and to display the version and last-pushed-by author in the Properties panel. The version increments automatically on every push that carries a change; a push with no changes reports "Already up to date." and leaves it alone.

______________________________________________________________________

## `setup` *(hidden)*

Verify and cache the Node.js runtime.

```
uip functions setup [--runtime node|deno|both]
```

Called automatically by `new` as a prerequisite. Run explicitly to set up Deno:

```
uip functions setup --runtime deno
```

Requires Node.js v20+. Installs `tsx` globally if not found.

______________________________________________________________________

## Environment variables

All commands that contact the UiPath platform read credentials from environment variables. During `serve`, the Deno runtime reads `.env` automatically; the Node runtime requires env vars to be loaded in your shell first.

| Variable                   | Used by                                                 |
| -------------------------- | ------------------------------------------------------- |
| `UIPATH_URL`               | `publish`, `push`                                       |
| `UIPATH_ORGANIZATION_NAME` | `publish`, `push`                                       |
| `UIPATH_TENANT_NAME`       | `publish`, `push`                                       |
| `UIPATH_ACCESS_TOKEN`      | `publish`, `push`, local dev token fallback in handlers |
| `UIPATH_PROJECT_ID`        | `push`                                                  |
| `UIPATH_BASE_URL`          | handler fallback for Orchestrator SDK calls             |
| `UIPATH_ORG_ID`            | handler fallback for Orchestrator SDK calls             |
| `UIPATH_TENANT_ID`         | handler fallback for Orchestrator SDK calls             |
