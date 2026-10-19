Service for writing to UiPath Orchestrator's execution logs.

Lets coded apps, coded functions and scripts push log entries into Orchestrator alongside the entries robots write. Submitted entries appear under Orchestrator **Automations > Logs** for the folder they were submitted to.

### Usage

```
import { Logs } from '@uipath/uipath-typescript/logs';

const logs = new Logs(sdk);
await logs.submit({ message: 'Invoice batch started' }, { folderKey: '<folderKey>' });
```

## Methods

### submit()

> **submit**(`entries`: `LogEntry` | `LogEntry`[], `options?`: `LogSubmitOptions`): `Promise`\<`void`>

Submits one or more log entries to Orchestrator's execution logs.

Entries are stored under the folder given in `options` (`folderId`, `folderKey` or `folderPath`), which must grant the caller `Logs.Create`; when no folder is given the SDK's init-time folder (coded-app meta tag or coded-function context) is used. Every entry needs a non-empty `message`; the SDK fills in `level` ([LogEntryLevel.Info](../../enumerations/LogEntryLevel/#info)), `timestamp` (now) and `fingerprint` (a random UUID) when they are omitted. See [LogEntry](../LogEntry/) for the fields.

Orchestrator validates each entry silently: an entry whose `timestamp` is more than 30 days in the past or more than 24 hours in the future, whose serialised form exceeds 524,000 bytes (about 512 KB) by default, or which carries one of the reserved property names `@rawMessage`, `@encryption` or `@compression` is discarded while the request still succeeds. The call returns as soon as Orchestrator has accepted the batch — entries are indexed asynchronously and show up after a short delay in the folder's Logs view (Automations > Logs, and a job's View Logs when `jobKey` matches) — the same execution-log store that robots write to.

Rejects with `ValidationError` before any request is made when `entries` is an empty array, when an entry has no non-empty string `message`, a `timestamp` that is not a valid `Date`, or `jobId` / `timeStamp` in place of `jobKey` / `timestamp`, or when no folder context can be resolved.

#### Parameters

- `entries`: `LogEntry` | `LogEntry`[] — A single log entry or an array of entries to submit in one request
- `options?`: `LogSubmitOptions` — Folder scoping (`folderId` / `folderKey` / `folderPath`)

#### Returns

`Promise`\<`void`>

Promise that resolves once Orchestrator has accepted the entries

#### Examples

```
// Submit a single entry
await logs.submit({ message: 'Invoice batch started' }, { folderKey: '<folderKey>' });
```

```
// Submit several entries with levels, a process name and a custom field
import { Logs, LogEntryLevel } from '@uipath/uipath-typescript/logs';

const logs = new Logs(sdk);
await logs.submit(
  [
    { message: 'Invoice 123 processed', level: LogEntryLevel.Info, processName: 'InvoiceApp', invoiceId: '123' },
    { message: 'Invoice 124 rejected', level: LogEntryLevel.Error, timestamp: new Date(), processName: 'InvoiceApp' },
  ],
  { folderId: <folderId> },
);
```

```
// Mark the entry as written by the automation itself, scoped by folder path
import { Logs, LogEntryType } from '@uipath/uipath-typescript/logs';

const logs = new Logs(sdk);
await logs.submit(
  { message: 'Approval requested by the operator', logType: LogEntryType.User, processName: 'InvoiceApp' },
  { folderPath: 'Shared/Finance' },
);
```
