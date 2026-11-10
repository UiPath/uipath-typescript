# Resource Declarations

Declare the Solution resources a coded project uses once, in a `uipath_resources.ts` file, and pass those declarations to the SDK instead of plain names. Each declaration is a small handle that names a resource and the folder it lives in. Tooling derives the project's `bindings_v2.json` from the declarations, and at run time the SDK resolves the handle through the same override lookup it uses for every name-based call.

| Factory | Declares | Folder |
|---------|----------|--------|
| `resource.asset({ name, folderPath?, type? })` | An Orchestrator asset; `type` is the value type (`text`, `integer`, `bool`, `credential`, `secret`, `json`) | Optional |
| `resource.bucket({ name, folderPath?, type? })` | A storage bucket; `type` is the provider (`orchestrator`, `amazon`, `azure`) | Optional |
| `resource.queue({ name, folderPath? })` | A queue | Optional |
| `resource.process({ name, folderPath?, type? })` | A process; `type` is the process kind | Optional |
| `resource.entity({ name })` | A Data Fabric entity | None |
| `resource.connection({ id, connector, name? })` | An Integration Service connection, identified by its id; `connector` is the connector key, `name` a label only | None |

Import the factories from `@uipath/uipath-typescript/resources`.

## Declaring resources

Keep every declaration in one class so the handles have stable, discoverable names. Pass literal strings only: the tooling that derives the bindings reads the file statically and skips anything it cannot read.

```typescript
// uipath_resources.ts
import { resource } from '@uipath/uipath-typescript/resources';

export class ProjectResources {
  static readonly invoiceThreshold = resource.asset({ name: 'InvoiceThreshold', folderPath: 'Finance/Shared', type: 'text' });
  static readonly invoiceFiles = resource.bucket({ name: 'InvoiceFiles', folderPath: 'Finance/Shared' });
  static readonly invoiceReview = resource.queue({ name: 'InvoiceReview', folderPath: 'Finance/Shared' });
  static readonly nightlySync = resource.process({ name: 'NightlySync', folderPath: 'Finance/Shared' });
  static readonly invoices = resource.entity({ name: 'Invoices' });
  static readonly financeSlack = resource.connection({ id: '3121165f-ce9b-4503-8c10-289ae6b21bd8', connector: 'uipath-slack', name: 'Finance Slack' });
}
```

A declaration without `folderPath` names a resource that deploys next to the project, in the project's own folder. Entities are tenant-scoped and never carry a folder.

A connection is declared by its id, not its name: Solutions, Orchestrator and the deployment overrides all key a connection binding by the connection id, and a connection name is unique only within one folder and connector. `uip resources add <name> --kind connection` looks the name up and writes the id for you. The id already pins the connection's folder, so a connection declaration takes no `folderPath`.

## Using a handle

Every `getByName` on assets, buckets, queues, processes and entities accepts a handle in place of the name. The handle supplies both the name and the folder, so no folder option is needed.

```typescript
import { Assets } from '@uipath/uipath-typescript/assets';
import { ProjectResources } from '../uipath_resources';

const assets = new Assets(sdk);
const threshold = await assets.getByName(ProjectResources.invoiceThreshold);
```

An explicit `folderId`, `folderKey` or `folderPath` option still wins over the handle's folder when you pass one.

A connection handle goes wherever a connection id does: `connections.getById()`, `execute()` and the `elements.getInstance*()` methods.

```typescript
import { Connections, execute } from '@uipath/uipath-typescript/connections';
import { ProjectResources } from '../uipath_resources';

const slack = await new Connections(sdk).getById(ProjectResources.financeSlack);
const result = await execute(sdk, ProjectResources.financeSlack, 'channels', 'GET');
```

### What the handle resolves to

`handle.value` is the name and folder the SDK will actually send, after any override published for the binding has been applied. It is computed on each read, so it always reflects the current overrides. An override whose folder is `'.'` or empty points at the folder the code runs in, so `value` carries no `folderPath` and the call uses the SDK's own folder context.

```typescript
ProjectResources.invoiceThreshold.value;
// { name: 'InvoiceThreshold', folderPath: 'Finance/Shared' } without an override
// { name: 'ProdThreshold', folderPath: 'Production' } when an admin mapped the binding
```

A connection handle's `value` is `{ id, folderKey? }` instead: the connection an admin mapped the id to, and that connection's folder when the override names one. Without an override it is just the declared `id`. The SDK applies the same override when you pass a plain connection id.

```typescript
ProjectResources.financeSlack.value;
// { id: '3121165f-…' } without an override
// { id: '<mapped connection id>', folderKey: '<its folder>' } when an admin mapped the binding
```

A handle also carries what was declared: `kind`, `name`, `folderPath` and `type`, or `id`, `connector` and `name` for a connection. The kind guards `isAssetResource`, `isBucketResource`, `isQueueResource`, `isProcessResource`, `isEntityResource`, `isConnectionResource` and `isResourceHandle(value, kind)` narrow a handle of unknown kind.

## Where the bindings come from

The SDK never reads `bindings_v2.json`. The file exists for Solutions and Orchestrator, which use it to list the project's dependencies and to offer overrides at deployment. Tooling writes it from the declarations:

- `uip resources add` and `uip resources sync` write declarations into `uipath_resources.ts` and nothing else. No tool writes `bindings_v2.json` into the project: push registers the declared resources with the solution, and packing and debugging derive the bindings from the declarations.
- Entries derived from declarations carry `metadata.Source: "code"`. A hand-written `bindings_v2.json` already in a project is the base: derivation keeps its entries, unless a declaration has the same kind and key.

## How overrides reach the code

Overrides are delivered by the host, not fetched by the SDK. A coded app's page carries a `<script id="uipath-overrides">` block that the platform injects at install; other hosts install an accessor on `globalThis[Symbol.for('uipath.resourceOverwrites.v1')]`. The SDK reads whichever is present, looks up `kind.name.folderPath` and then `kind.name`, and uses the mapped name and folder. A connection is looked up as `connection.<id>`, whose entry carries the mapped `ConnectionId` and its `folderKey`. See [Authentication](authentication.md) for how a coded app is configured in the first place.

## Limits

- Arguments must be string literals. A computed name, a spread or a template with `${}` is reported by the tooling and skipped.
- A handle is a declaration, not a lookup. It does not check that the resource exists; `getByName` does, when it runs.
- `getByName` is the method that accepts resource handles in this version, plus the connection-taking methods for connection handles. Other name-taking methods still take a name and folder option.
