# Integration Service Execution

Functions that run an operation through an Integration Service connection. Integration Service adds the connection's authentication, so the vendor's key or token stays out of your code. Import them from `@uipath/uipath-typescript/integration-service` and pass a `UiPath` instance as the first argument.

| Function            | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `execute()`         | Calls one object of a connector with the given method                            |
| `executeActivity()` | Runs a connector activity, with body paths, file upload and download, and paging |
| `executeHttp()`     | Sends one HTTP request to the vendor behind a connection                         |

Preview

These functions are experimental and may change or be removed in future releases.

Each function takes a connection id, or a handle created with `resource.connection()` (see [Resource Declarations](../resources/)). A status the vendor returned does not throw, even a 4xx or 5xx, so check `ok` on the result.

## execute()

Takes a connection, an object name, a method and optional `ExecuteOptions`, and resolves to an `ExecuteResult`.

```
import { UiPath } from '@uipath/uipath-typescript/core';
import { execute } from '@uipath/uipath-typescript/integration-service';

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

Takes the same arguments with `ExecuteActivityOptions`, and resolves to an `ExecuteActivityResult`.

```
import { executeActivity } from '@uipath/uipath-typescript/integration-service';

const created = await executeActivity(sdk, '<connectionId>', 'issue', 'POST', {
  body: { 'fields.summary': 'Login fails', 'fields.labels[0]': 'urgent' },
});
```

A top-level body key that contains `.` or `[` is a path: the call above sends `{ fields: { summary: 'Login fails', labels: ['urgent'] } }`.

### Paging

Pass `maxRecords` to gather records across pages; `-1` fetches every record. Without it one page is returned, and `page` on the result holds the token of the next one when more records exist.

```
const tickets = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', {
  maxRecords: 200,
});
```

### Files

Pass `files` to send the call as a multipart form. A file the vendor returns arrives as a `Uint8Array` in `body`; `fileResponse: true` reads any successful response that way.

```
import { readFile } from 'node:fs/promises';

const uploaded = await executeActivity(sdk, '<connectionId>', 'files', 'POST', {
  files: [{ name: 'file', content: await readFile('<path-to-file>'), fileName: 'report.pdf' }],
  body: { folder: 'reports' },
});
```

### Version 4 Connectors

A connector of version 4 or later runs its activities on the version 4 engine. Pass `connectorVersion` and `connectorKey`; the object name is then the activity's script reference. A `resource.connection()` handle supplies the connector key.

```
const sent = await executeActivity(sdk, '<connectionId>', 'SendMessageToChannel', 'POST', {
  connectorVersion: '4.0.0',
  connectorKey: 'uipath-salesforce-slack',
  body: { channel: '<channelId>', messageToSend: 'Hello' },
});
```

Each engine takes its own options, and passing one to the other engine throws a `ValidationError`:

| Engine    | Options                                                                 |
| --------- | ----------------------------------------------------------------------- |
| Version 3 | `files`, `bodyPartName`, `urlInputFields`, `fileResponse`, `maxRecords` |
| Version 4 | `scriptRef`, `headers`                                                  |

## executeHttp()

Takes a connection, a vendor URL, a method and optional `ExecuteHttpOptions`, and resolves to an `ExecuteHttpResult`. Use it for a vendor endpoint the connector has no object for. A path such as `/v2/tickets` is resolved against the connection's base URL.

```
import { executeHttp } from '@uipath/uipath-typescript/integration-service';

const result = await executeHttp(sdk, '<connectionId>', '/v2/tickets', 'POST', {
  headers: { 'X-Request-Source': 'my-app' },
  queryParams: { notify: 'true' },
  body: { subject: 'New ticket', priority: 'high' },
});

if (result.ok) {
  console.log(result.body);
} else if (result.isVendorError) {
  console.log('Vendor returned status', result.status);
}
```

`status`, `headers` and `body` on the result are the vendor's. `isVendorError` is `true` when the vendor answered with a non-2xx status, and `false` when the call failed before reaching the vendor.
