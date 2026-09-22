# Deployment

From `defineFunction` to a live HTTP trigger — what happens at each stage and what you need to do.

## The pipeline

```
defineFunction() calls in .ts files
         │
         ▼
  uip functions pack
         │
         ├─ generates entry-points.json      (one entry per function)
         ├─ generates bindings_v2.json       (one HttpTrigger per function)
         └─ produces .uipath/<name>.<ver>.nupkg
                          │
                          ▼
             uip functions publish
                          │
                          ▼
              Orchestrator reads the .nupkg
              → creates / updates one API Trigger per function
```

______________________________________________________________________

## Pack

`uip functions pack` reads your `defineFunction` calls and generates two manifest files before zipping everything into a `.nupkg`.

### What pack generates

#### entry-points.json

One entry per function. The `uniqueId` is stable across re-packs — preserved from the previous file if one exists. Re-packing does not create duplicate triggers; Orchestrator updates existing ones in place.

```
{
  "$schema": "https://cloud.uipath.com/draft/2024-12/entry-point",
  "$id": "entry-points.json",
  "entryPoints": [
    {
      "filePath": "content/functions/hello.ts",
      "uniqueId": "a1b2c3d4-…",
      "type": "function",
      "input":  { "type": "object", "properties": { "name": { "type": "string" } } },
      "output": { "type": "object", "properties": { "message": { "type": "string" } } }
    }
  ]
}
```

#### bindings_v2.json

One `HttpTrigger` resource per function. Non-HttpTrigger resources (Storage, Queue, etc.) and non-function entries are preserved verbatim and never overwritten.

```
{
  "$schema": "https://cloud.uipath.com/draft/2024-12/bindings",
  "version": "2.0",
  "resources": [
    {
      "resource": "HttpTrigger",
      "key": "stable-uuid-…",
      "id":  "stable-uuid-…",
      "value": {
        "EntryPointUniqueId": {
          "DefaultValue": "a1b2c3d4-…",
          "IsExpression": false
        }
      },
      "metadata": {
        "BindingsVersion": "2.1",
        "Name":        "hello",
        "Method":      "POST",
        "Slug":        "/hello",
        "CallingMode": "LongPolling",
        "Description": "Returns a greeting message."
      }
    }
  ]
}
```

### defineFunction → API Trigger field mapping

Each `defineFunction` call maps directly to one API Trigger in Orchestrator:

| `defineFunction` field | Orchestrator API Trigger field                 |
| ---------------------- | ---------------------------------------------- |
| `name`                 | Trigger name (display name in Orchestrator)    |
| `method`               | Verb (GET, POST, PUT, …)                       |
| `path`                 | Slug (appears in the trigger URL)              |
| `description`          | Description                                    |
| `input` schema         | Input JSON Schema (shown in Runtime Arguments) |
| `output` schema        | Output JSON Schema                             |
| source file path       | Entry point (`content/functions/my-fn.ts`)     |

Calling mode is always **Sync (long-polling)**. Account is always **Run as HTTP Caller**.

### When you add, rename, or remove a function

| Change                          | What happens on next publish                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| New `defineFunction`            | New entry-point + new binding → Orchestrator creates a new API Trigger                      |
| Renamed `name` or `path`        | Existing binding drops, new one appears → Orchestrator deletes old trigger, creates new one |
| Removed `defineFunction`        | Entry-point and binding removed → Orchestrator deletes the trigger                          |
| Changed `input`/`output` schema | Updated JSON Schema in entry-points.json → Orchestrator updates trigger Input/Output        |

### Lockfile

The `.nupkg` always includes the project's lock file — `package-lock.json` or `bun.lock` — and it is the only lock file that ships: the production worker installs from it with bun, which reads either format. `pack` refuses to run when the lock is missing or no longer matches `package.json`, and `publish` refuses a package that carries no lock. Always re-run your package manager's install locally after any `package.json` change before packing.

______________________________________________________________________

## Publish

```
uip functions publish
```

Uploads the `.nupkg` to an Orchestrator process feed. After upload, **Orchestrator does not immediately sync triggers** — you must update the Function Release manually (see below).

______________________________________________________________________

## After publish: update the Function Release

Publishing uploads a new `.nupkg` version, but the **Function Release** in Orchestrator may still be pinned to the previous version. After every publish:

1. Go to **Orchestrator → Automations → Processes**
1. Find your package
1. Update the release to the latest version

> **API note:** The Orchestrator UI calls these "Processes" but the REST API endpoint is `/odata/Releases`.

Orchestrator then re-reads the manifest and syncs triggers (adds new ones, removes deleted ones, updates changed schemas).

```
uip functions publish  →  nupkg uploaded
                           ↓
                    Orchestrator: new version available
                           ↓  (manual step today)
                    Update Function Release to latest version
                           ↓
                    Triggers created / updated / deleted
```

______________________________________________________________________

## Calling your function

Once the Function Release is updated, each function is reachable at its HTTP trigger URL.

### Trigger URL

```
https://<api-host>/<org>/<tenant>/orchestrator_/t/<folder-key>/<package-id>/<slug>
```

- `<api-host>`: the `api.*` subdomain — **not** the portal domain (see warning below)
- `<org>` / `<tenant>`: org and tenant identifiers — UUIDs are recommended for browser-callable URLs; slugs also work from `curl`
- `<folder-key>`: the **Key of the folder the function is published into** (a GUID). For the Personal-Workspace flow, this is the Personal Workspace folder's Key. It is **not** a per-trigger or per-tenant key — see the note below on how to discover it.
- `<package-id>`: your `package.json` `name` (sanitized)
- `<slug>`: the `path` from your `defineFunction`, **without** the leading slash (e.g. `hello`)

`<package-id>` and `<slug>` are **two separate path segments** (e.g. `.../t/<folder-key>/my-functions/hello`).

Always send `Content-Type: application/json` and a JSON body — send `{}` for a function that takes no input. A `GET`-verb function receives its input as query-string parameters instead of a body.

```
curl -X POST \
  "https://api.uipath.com/<org>/<tenant>/orchestrator_/t/<folder-key>/my-functions/hello" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
# → {"message":"Hello, Alice!"}
```

The portal domain maps to the API domain:

| Portal domain      | API domain (use this) |
| ------------------ | --------------------- |
| `cloud.uipath.com` | `api.uipath.com`      |

Portal domain causes CORS errors in the browser

The trigger URL shown in the Orchestrator UI uses the portal domain and org/tenant slugs. Calling that URL from a browser (coded app) produces a CORS error — the portal domain has no `Access-Control-Allow-Origin` header. The `api.*` subdomain does. Prefer UUIDs over slugs in the browser-callable URL. `curl` does not enforce CORS, so the portal URL works from the command line.

Discovering the folder key and slug

`<folder-key>` is the **Key of the folder** the function is published into. It is the same for every function in that folder — it is *not* generated per trigger. Discover it (and each function's slug) from the folder's HTTP triggers:

```
GET /orchestrator_/odata/HttpTriggers
X-UIPATH-OrganizationUnitId: <folder-id>
```

Each row exposes:

- `Method` and `Slug` — the function's HTTP verb and slug
- `Release.Name` — the `<package-id>`
- `ExternalReference` — of the form `<Method> <package-id>/<slug> <FOLDER-KEY>`; the trailing GUID is the `<folder-key>` you put in the URL

Do **not** use the trigger's own `Id` as `<folder-key>` — that returns `404 {"errorCode": 1623, "message": "HTTP trigger not found..."}`.

The older `odata/ApiTriggers` discovery query does **not** work: `ApiTriggerDto` has no `ProcessKey`, `Key`, or `Url` property, so `?$filter=ProcessKey eq '…'&$select=Key,Name,Url` fails with `400 {"errorCode": 1000}`.
