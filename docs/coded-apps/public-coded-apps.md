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
| `processes.start(...)` | Starts one job as the app. The job key is `result[0].key`. |
| `new Jobs(sdk).getOutput(jobKey)` | Only for jobs this session started, or of a process open to all. `Jobs` comes from `@uipath/uipath-typescript/jobs`. |
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

// Entity binding "Orders" (key "Orders"; entities are keyed by name only)
await sdk.entities.insertRecord({ name: 'Orders' }, { Title: 'First order' });
const orders = await sdk.entities.getRecordsByName('Orders', { pageSize: 20 });

const { path } = await sdk.buckets.uploadFile({ name: 'Uploads' }, 'report.pdf', file, { folderPath: 'Shared' });
```

Pass the same `name` the binding was declared with, plus its `folderPath` for processes and buckets. `entities.getRecordByName` and `entities.getRecordsByName` take the entity name as a string. Solution overrides are applied by the service, so the code does not change when an admin points a binding at another resource.

### Declaring the bindings

Write `bindings_v2.json` next to the app's `package.json`, or, for a project in a local solution, in the project folder next to `source/`. Add one entry per resource the app uses:

```json
{
  "version": "2.0",
  "resources": [
    {
      "resource": "process",
      "key": "Invoices.Shared",
      "value": {
        "name": { "defaultValue": "Invoices", "isExpression": false, "displayName": "Name" },
        "folderPath": { "defaultValue": "Shared", "isExpression": false, "displayName": "Folder Path" }
      },
      "metadata": { "BindingsVersion": "2.2" }
    },
    {
      "resource": "entity",
      "key": "Orders",
      "value": {
        "name": { "defaultValue": "Orders", "isExpression": false, "displayName": "Name" },
        "folderPath": { "defaultValue": ".", "isExpression": false, "displayName": "Folder Path" }
      },
      "metadata": { "BindingsVersion": "2.2" }
    }
  ]
}
```

`resource` is `process`, `entity` or `bucket`. `key` is `Name.FolderPath` for processes and buckets, and the name alone for entities. Run `uip solution resources refresh` from the solution root to add the resources to the solution; packing ships the file in the app package. A resource that isn't listed is refused with `403`.

## Who can read what

Set per resource in `uipath.json` who may read it, using the binding key. `uipath.json` must be in the build output so it is packed with the app (Vite: `public/uipath.json`):

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

The `@uipath/coded-apps-dev` plugin can run the app as a public app on your machine, so you can test it the way a visitor uses it before you deploy. It works with the Vite and webpack dev servers.

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

- Only the resources listed in `bindings_v2.json`. Anything else is refused with `403`.
- `session` and `all` from `uipath.json` `access`.
- Visitors can add records, start jobs and upload files, but can't change or delete anything.

The secret and the token never reach the browser. To test as a second visitor, open the app in a private window.

A local run differs from a deployed app in three ways:

- Resources use the name and folder in `bindings_v2.json`. Solution overrides apply only after you deploy.
- Sessions live in the dev server's memory, so restarting it starts new sessions.
- The external application still needs a role in the folders that hold the resources, as it does after deploy.

Set `UIPATH_PUBLIC_APP=false`, or remove it, to go back to signing in as yourself.

## Deploying

A public app lives in a solution and is deployed with it. The same package deploys as a sign-in app when **Authentication** is left at **User sign-in**.

### Before you deploy

- **External application.** An organization admin creates a **confidential** external application with application scopes for everything the app calls, for example `OR.Execution OR.Jobs OR.Buckets DataFabric.Data.Read DataFabric.Data.Write`, and shares its client secret with you.
- **Build output.** Run `npm run build`. Studio Web and `uip solution pack` package the built `dist` folder, so `uipath.json` has to be in it (Vite: `public/uipath.json`).
- **Bindings.** `bindings_v2.json` lists every resource the app uses (see [Declaring the bindings](#declaring-the-bindings)).

### Get the app into Studio Web

Use the preview CLI: `npm install -g @uipath/cli@preview`.

**Push the app.** From the app folder (the one with `package.json`), push the source and build output. On the first push the CLI creates the solution and the coded app project in Studio Web, saves the project id to `.env`, and adds the resources from `bindings_v2.json` to the solution:

```bash
uip codedapp push --solution-name "<Solution>" --project-name "<App>" --build-dir dist
```

Run `uip codedapp push` again after each change.

**Or upload a local solution.** When the app is a project in a local solution (`uip codedapp init` creates one around it), add its resources to the solution and upload the whole solution:

```bash
uip solution resources refresh --solution-folder <solution-folder>
uip solution upload <solution-folder>
```

The first upload imports the solution and writes its Studio Web id into the `.uipx` file. Later uploads overwrite it.

### Deploy from Studio Web

1. Open the solution in Studio Web, select the arrow on **Deploy**, and then select **Deploy**.
2. Check the version, the location and the solution folder name.
3. Select the arrow on the **Deploy** button at the bottom, and then select **Customize**. Studio Web packs and publishes the solution, then opens the resource settings.
4. Under **Apps**, select the coded app and set:
    - **Routing name**: the path the app is served at.
    - **Authentication**: **Public**. Set this before the next field: the **External application** list shows confidential applications only once **Public** is selected.
    - **External application**: the confidential external application.
    - **Client secret**: its secret.
5. Select **Validate**, and then **Continue**.

### Deploy from the CLI

Pack and publish the solution, set the same four values in its deployment configuration, and deploy:

```bash
uip solution pack <solution-folder> ./output --version 1.0.0
uip solution publish ./output/<Solution>_1.0.0.zip
uip solution deploy config get "<Solution>" -d config.json
uip solution deploy config set config.json <app> routingName <routing-name> --output-filter Property
uip solution deploy config set config.json <app> externalClientId "<external app id>" --output-filter Property
uip solution deploy config set config.json <app> runtimeAuthMode application --output-filter Property
uip solution deploy config set config.json <app> clientSecret "$APP_CLIENT_SECRET" --output-filter Property
uip solution deploy run -n "<Solution>" --package-name "<Solution>" --package-version 1.0.0 \
  --folder-name "<Solution>" --parent-folder-path "Shared" --config-file config.json
```

Keep `config.json` out of source control: it holds the secret. For a pipeline, see [Coded App inside Solution](ci-cd-github-actions.md#coded-app-inside-solution).

### After the first deploy

1. **Give the external application a role** in the folder the deployment created (`<location>/<solution folder>`): in Orchestrator, open the folder, select **Assign accounts/group/external app**, and assign a role such as **Automation User**. Data Fabric entities need **View** and **Create** on entity records.
2. **Open the app** at `https://<org>.uipath.host/<routing-name>` in a private window. It opens without a sign-in.

To upgrade, publish a new version and upgrade the deployment. The stored client secret and its scope are kept.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `ValidationError`, no request sent | The call isn't supported in public mode. See [What a public app can call](#what-a-public-app-can-call). |
| `403` on every call to a resource | The resource isn't in `bindings_v2.json`, or the code's name or folder doesn't match its entry. |
| `403` `Missing permissions: EntityRecords.Create` | The external application has no role in the deployment folder. |
| `403` on `getRecordsByName` | The entity is in `session` mode. |
| `404` reading a record or job output | Another visitor created it, or the visitor started a new session. |
| Access modes from `uipath.json` don't apply | `uipath.json` wasn't packed. It must be in `dist`. |
