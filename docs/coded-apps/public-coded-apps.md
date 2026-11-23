# Public Coded Apps

A **public** coded app opens without a sign-in. The visitor has no UiPath account and no token: the Apps service holds the app's identity (its confidential external application) and makes each call on the app's behalf, limited to the resources the app declares in its bindings.

!!! warning "Preview"
    Public coded apps are in preview. They are built and deployed through Solutions only, and need `@uipath/uipath-typescript` `1.9.0-preview.0` or later. For the product overview, see [Public coded apps](https://docs.uipath.com/apps/automation-cloud/latest/user-guide-ca/public-coded-apps).

---

## Turning it on

Nothing changes in your code or SDK setup. When an app is deployed as public, the deployment adds a `uipath:app-key` meta tag to the page, and the SDK switches to public mode on its own:

```typescript
import { UiPath } from '@uipath/uipath-typescript';

const sdk = new UiPath(); // reads the meta tags, including uipath:app-key
await sdk.initialize();   // no sign-in in public mode
```

`initialize()` opens the visitor's session, and the SDK opens a new one when it expires.

## What a public app can call

| Call | Notes |
|---|---|
| `processes.start(...)` | Starts one job as the app. |
| `jobs.getOutput(jobKey)` | Only for jobs this session started, or of a process open to all. |
| `entities.insertRecord({ name }, data)` | The record belongs to this session. |
| `entities.getRecordByName(name, recordId)` | Only for records this session created, or of an entity open to all. |
| `entities.getRecordsByName(name, options?)` | Only for an entity open to all. Supports `pageSize`, `jumpToPage` and `cursor`. |
| `buckets.uploadFile({ name }, fileName, content, options?)` | The service picks the stored path and returns it as `path`, so an upload never overwrites another file. |

Any other call throws a `ValidationError` before it reaches the network.

## Naming resources

Resources are named by their **binding**, the way they appear in `bindings_v2.json`, not by id or key:

```typescript
// Binding "Invoices" scoped to folder "Shared" (key "Invoices.Shared" in bindings_v2.json)
await sdk.processes.start({ name: 'Invoices' }, { folderPath: 'Shared', inputArguments: '{"amount":12}' });

// Entity binding "Orders" (key "Orders"; `uip resources` keys entities by name only)
await sdk.entities.insertRecord({ name: 'Orders' }, { Title: 'First order' });
const orders = await sdk.entities.getRecordsByName('Orders', { pageSize: 20 });

const { path } = await sdk.buckets.uploadFile({ name: 'Uploads' }, 'report.pdf', file, { folderPath: 'Shared' });
```

Pass the same `name` the binding was declared with, plus its `folderPath` for processes and buckets. A handle from `uipath_resources.ts` carries both: pass it to `processes.start`, `entities.insertRecord` and `buckets.uploadFile` as is, and pass its `.name` to `entities.getRecordByName` and `entities.getRecordsByName`, which take the entity name as a string. Solution overrides are applied by the service, so the code does not change when an admin points a binding at another resource.

## Who can read what

Set per resource in `uipath.json` who may read it, using the binding key:

```json
{
  "scope": "OR.Execution OR.Jobs DataFabric.Data.Read DataFabric.Data.Write",
  "access": [
    { "resource": "entity", "key": "Orders", "mode": "session" },
    { "resource": "process", "key": "Invoices.Shared", "mode": "all" }
  ]
}
```

- `session`: only the visitor who created the record or started the job can read it.
- `all`: every visitor can read it.

A resource missing from `access` is open to all visitors, so list every resource the app reads and use `session` for anything personal. Writes are never shared: a visitor can add records and start jobs, but can't change or delete anything.

`scope` must list what the app calls and include `OR.Execution`.

## Running it locally

The `@uipath/coded-apps-dev` plugin can run the app as a public app on your machine, so you can test it the way a visitor uses it before you deploy. Vite only.

Needs `@uipath/coded-apps-dev` `1.0.0-beta.2` or later.

Put the confidential external application in `.env.local`, and keep that file out of source control:

```bash title=".env.local"
UIPATH_PUBLIC_APP=true
UIPATH_PUBLIC_APP_CLIENT_ID=<external app id>
UIPATH_PUBLIC_APP_CLIENT_SECRET=<client secret>
# Optional: the folder you deploy to, used for resources declared without a folder
UIPATH_PUBLIC_APP_FOLDER_KEY=<folder key>
```

Then start the dev server as usual:

```bash
npm run dev
```

The page opens without a sign-in, and its calls go to the dev server instead of the Apps service. The dev server holds the secret, gets the external application's token with the `scope` from `uipath.json`, and applies the same rules as a deployed public app before it calls Orchestrator and Data Fabric:

- Only the resources declared in `uipath_resources.ts`. Anything else is refused with `403`.
- `session` and `all` from `uipath.json` `access`.
- Visitors can add records, start jobs and upload files, but can't change or delete anything.

The secret and the token never reach the browser. To test as a second visitor, open the app in a private window.

A local run differs from a deployed app in three ways:

- Resources use the name and folder declared in `uipath_resources.ts`. Solution overrides apply only after you deploy.
- Sessions live in the dev server's memory, so restarting it starts new sessions.
- The external application still needs a role in the folders that hold the resources, as it does after deploy.

Set `UIPATH_PUBLIC_APP=false`, or remove it, to go back to signing in as yourself.

## Deploying

A public app lives in a solution and is deployed with it. Pack and publish the solution with the preview CLI (`npm install -g @uipath/cli@preview`). At deploy, set the app's runtime auth mode to **Application**, pick a **confidential** external application with application scopes for everything the app calls, and enter its client secret. The same package deploys as a sign-in app with the auth mode set to **User**.

From the CLI:

```bash
uip solution deploy config get "<Solution>" -d config.json
uip solution deploy config set config.json <app> routingName <routing-name> --output-filter Property
uip solution deploy config set config.json <app> externalClientId "<external app id>" --output-filter Property
uip solution deploy config set config.json <app> runtimeAuthMode application --output-filter Property
uip solution deploy config set config.json <app> clientSecret "$APP_CLIENT_SECRET" --output-filter Property
uip solution deploy run -n "<Solution>" --package-name "<Solution>" --package-version 1.0.0 \
  --folder-name "<Solution>" --parent-folder-path "Shared" --config-file config.json
```

Keep `config.json` out of source control: it holds the secret. See [Coded App inside Solution](ci-cd-github-actions.md#coded-app-inside-solution) for building, packing and publishing the solution.

For Data Fabric entities, give the external app a role in the deployment folder with Entity Records View and Create, for example **Automation User**.
