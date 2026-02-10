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
| `getRecordById()`  | `DataFabric.Data.Read` |
| `insertRecordById()` / `insert()` | `DataFabric.Data.Write` |
| `batchInsertRecordsById()` / `batchInsert()` | `DataFabric.Data.Write` |
| `deleteRecordsById()` / `delete()` | `DataFabric.Data.Write` |
| `updateRecordsById()` / `update()` | `DataFabric.Data.Write` |
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
| `getAll()` | `PIMS` |
| `getById()` | `PIMS` |
| `close()` | `PIMS` |
| `pause()` | `PIMS` |
| `resume()` | `PIMS` |
| `reopen()` | `PIMS` |
| `getExecutionHistory()` | `PIMS` |
| `getStages()` | `PIMS` |
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
