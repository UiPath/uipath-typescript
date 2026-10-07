# Public Coded Apps

A **public** coded app opens without a sign-in. The visitor has no UiPath account and no token: the Apps service holds the app's identity (its confidential external application) and makes each call on the app's behalf, limited to the resources the app declares in its bindings.

!!! warning "Preview"
    Public coded apps are in preview and need the feature turned on for your organization.

---

## Turning it on

Nothing changes in your code or SDK setup. When an app is deployed as public, the deployment adds a `uipath:app-key` meta tag to the page, and the SDK switches to public mode on its own:

```typescript
import { UiPath } from '@uipath/uipath-typescript';

const sdk = new UiPath(); // reads the meta tags, including uipath:app-key
await sdk.initialize();   // no sign-in in public mode
```

The visitor's session is created on the first call and renewed automatically when it expires.

## What a public app can call

| Call | Notes |
|---|---|
| `processes.start(...)` | Starts one job as the app. |
| `jobs.getOutput(jobKey)` | Only for jobs this session started, or of a process declared shared. |
| `entities.insertRecord({ name }, data)` | The record belongs to this session. |
| `entities.getRecordByName(name, recordId)` | Only for records this session created, or of a shared entity. |
| `entities.getRecordsByName(name, options?)` | Only for a shared entity. Supports `pageSize`, `jumpToPage` and `cursor`. |
| `buckets.uploadFile({ name }, fileName, content, options?)` | The service picks the stored path and returns it as `path`, so an upload never overwrites another file. |

Any other call throws a `ValidationError` before it reaches the network.

## Naming resources

Resources are named by their **binding**, the way they appear in `bindings_v2.json`, not by id or key:

```typescript
// Binding "Invoices" scoped to folder "Shared" (key "Invoices.Shared" in bindings_v2.json)
await sdk.processes.start({ name: 'Invoices' }, { folderPath: 'Shared', inputArguments: '{"amount":12}' });

await sdk.entities.insertRecord({ name: 'Orders' }, { Title: 'First order' });

const { path } = await sdk.buckets.uploadFile({ name: 'Uploads' }, 'report.pdf', file, { folderPath: 'Shared' });
```

Pass the same `name` and `folderPath` the binding was declared with. Solution overrides are applied by the service, so the code does not change when an admin points a binding at another resource.

## Sharing reads across visitors

By default each visitor only sees what their own session created. To let every visitor read a resource, declare it in `uipath.json`:

```json
{
  "publicApp": {
    "shared": [{ "type": "entity", "key": "Orders" }]
  }
}
```

Writes are never shared.
