# OAuth Scopes Reference

This page lists the specific OAuth scopes required in external app for each SDK method.

## Assets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Assets` or `OR.Assets.Read` |
| `getById()` | `OR.Assets` or `OR.Assets.Read` |

## Buckets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Administration` or `OR.Administration.Read` |
| `getById()` | `OR.Administration` or `OR.Administration.Read` |
| `getFileMetaData()` | `OR.Administration` or `OR.Administration.Read` |
| `getReadUri()` | `OR.Administration` or `OR.Administration.Read` |
| `uploadFile()` | `OR.Administration` or `OR.Administration.Read` |

## Entities

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `DataFabric.Schema.Read` |
| `getById()` | `DataFabric.Schema.Read` |
| `getAllRecords()` | `DataFabric.Data.Read` |
| `getRecordById()` / `getRecord()`  | `DataFabric.Data.Read` |
| `insertRecordById()` / `insertRecord()` | `DataFabric.Data.Write` |
| `insertRecordsById()` / `insertRecords()` | `DataFabric.Data.Write` |
| `deleteRecordsById()` / `deleteRecords()` | `DataFabric.Data.Write` |
| `updateRecordsById()` / `updateRecords()` | `DataFabric.Data.Write` |
| `downloadAttachment()` | `DataFabric.Data.Read` |

## ChoiceSets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `DataFabric.Schema.Read` |
| `getById()` | `DataFabric.Data.Read` |

## Maestro Processes

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |
| `getIncidents()` | `PIMS` |

## Maestro Process Instances

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |
| `getById()` | `PIMS` |
| `getExecutionHistory()` | `PIMS` |
| `getBpmn()` | `OR.Execution.Read` |
| `getVariables()` | `PIMS` |
| `getIncidents()` | `PIMS` |
| `cancel()` | `PIMS` |
| `pause()` | `PIMS` |
| `resume()` | `PIMS` |

## Maestro Cases

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |

## Maestro Case Instances

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS OR.Execution.Read` |
| `getById()` | `PIMS OR.Execution.Read` |
| `close()` | `PIMS` |
| `pause()` | `PIMS` |
| `resume()` | `PIMS` |
| `reopen()` | `PIMS` |
| `getExecutionHistory()` | `PIMS` |
| `getStages()` | `PIMS OR.Execution.Read` |
| `getActionTasks()` | `OR.Tasks` or `OR.Tasks.Read` |

## Processes

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Execution` or `OR.Execution.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read` |
| `start()` | `OR.Jobs` or `OR.Jobs.Write` |

## Queues

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Queues` or `OR.Queues.Read` |
| `getById()` | `OR.Queues` or `OR.Queues.Read` |

## Tasks

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getById()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getUsers()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getFormTaskById()` | `OR.Tasks` or `OR.Tasks.Read` |
| `create()` | `OR.Tasks` or `OR.Tasks.Write` |
| `assign()` | `OR.Tasks` or `OR.Tasks.Write` |
| `reassign()` | `OR.Tasks` or `OR.Tasks.Write` |
| `unassign()` | `OR.Tasks` or `OR.Tasks.Write` |
| `complete()` | `OR.Tasks` or `OR.Tasks.Write` |

## Conversational Agent

Combined scopes needed: `OR.Execution` · `OR.Folders` · `OR.Jobs` · `ConversationalAgents` · `Traces.Api`

### Agents

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Execution` or `OR.Execution.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read` |

### Conversations

| Method | OAuth Scope |
|--------|-------------|
| `create()` | `OR.Execution`, `OR.Folders`, `OR.Jobs` |
| `getAll()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
| `updateById()` | `OR.Execution`, `OR.Jobs` |
| `deleteById()` | `OR.Execution`, `OR.Jobs` |
| `startSession()` | `OR.Execution`, `OR.Jobs`, `ConversationalAgents` |
| `uploadAttachment()` | `OR.Execution`, `OR.Jobs` |

### Exchanges

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
| `createFeedback()` | `OR.Execution`, `OR.Jobs`, `Traces.Api` |

### Messages

| Method | OAuth Scope |
|--------|-------------|
| `getById()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
| `getContentPartById()` | `OR.Execution` or `OR.Execution.Read`, `OR.Jobs` or `OR.Jobs.Read` |
