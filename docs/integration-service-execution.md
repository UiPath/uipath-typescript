# Integration Service Execution

Functions that run an operation through an Integration Service connection. Integration Service adds the connection's authentication, so the vendor's key or token stays out of your code. Import them from `@uipath/uipath-typescript/connections` and pass a `UiPath` instance as the first argument.

| Function | Description |
|----------|-------------|
| [`execute()`](/uipath-typescript/api/functions/execute) | Calls one object of a connector with the given method |
| [`executeActivity()`](/uipath-typescript/api/functions/executeActivity) | Runs a connector activity, with body paths, file upload and download, and paging |

!!! warning "Preview"
    These functions are experimental and may change or be removed in future releases.

Each function takes a connection id, or a handle created with `resource.connection()` (see [Resource Declarations](resources.md)). A status the vendor returned does not throw, even a 4xx or 5xx, so check `ok` on the result.

## execute()

Takes a connection, an object name, a method and optional [`ExecuteOptions`](/uipath-typescript/api/interfaces/ExecuteOptions), and resolves to an [`ExecuteResult`](/uipath-typescript/api/interfaces/ExecuteResult).

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { execute } from '@uipath/uipath-typescript/connections';

const sdk = new UiPath(config);
await sdk.initialize();

const result = await execute(sdk, '<connectionId>', 'tickets', 'GET', {
  queryParams: { status: 'open' },
});

if (result.ok) {
  console.log(result.body);
} else {
  console.log('Request failed with status', result.status);
}
```

## executeActivity()

Takes the same arguments with [`ExecuteActivityOptions`](/uipath-typescript/api/interfaces/ExecuteActivityOptions), and resolves to an [`ExecuteActivityResult`](/uipath-typescript/api/interfaces/ExecuteActivityResult).

```typescript
import { executeActivity } from '@uipath/uipath-typescript/connections';

const created = await executeActivity(sdk, '<connectionId>', 'issue', 'POST', {
  body: { 'fields.summary': 'Login fails', 'fields.labels[0]': 'urgent' },
});
```

A top-level body key that contains `.` or `[` is a path: the call above sends `{ fields: { summary: 'Login fails', labels: ['urgent'] } }`.

### Paging

Pass `maxRecords` to gather records across pages; `-1` fetches every record. Without it one page is returned, and `page` on the result holds the token of the next one when more records exist.

When a `maxRecords` call stops with records left, `page` is set as well. Its token starts at the next page, so records cut from the last page read are skipped. A call follows at most 1000 pages and stops if the connector repeats a page token.

```typescript
const tickets = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', {
  maxRecords: 200,
});
```

### Files

Pass `files` to send the call as a multipart form. A file the vendor returns arrives as a `Uint8Array` in `body`; `fileResponse: true` reads any successful response that way.

```typescript
import { readFile } from 'node:fs/promises';

const uploaded = await executeActivity(sdk, '<connectionId>', 'files', 'POST', {
  files: [{ name: 'file', content: await readFile('<path-to-file>'), fileName: 'report.pdf' }],
  body: { folder: 'reports' },
});
```

### Version 4 Connectors

A connector of version 4 or later runs its activities on the version 4 engine. Pass `connectorVersion` and `connectorKey`; the object name is then the activity's script reference. A `resource.connection()` handle supplies the connector key.

```typescript
const sent = await executeActivity(sdk, '<connectionId>', 'SendMessageToChannel', 'POST', {
  connectorVersion: '4.0.0',
  connectorKey: 'uipath-salesforce-slack',
  body: { channel: '<channelId>', messageToSend: 'Hello' },
});
```

Each engine takes its own options, and passing one to the other engine throws a `ValidationError`:

| Engine | Options |
|--------|---------|
| Version 3 | `files`, `bodyPartName`, `urlInputFields`, `fileResponse`, `maxRecords` |
| Version 4 | `scriptRef`, `headers` |
