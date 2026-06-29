# OAuth Scopes Reference

This page lists the specific OAuth scopes required in external app for each SDK method.

## Integration Service — Connections

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `ConnectionService` or `ConnectionServiceUser` |
| `getById()` | `ConnectionService` or `ConnectionServiceUser` |
| `ping()` | `ConnectionService` or `ConnectionServiceUser` |
| `reauthenticate()` | `ConnectionService` |

## Assets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Assets` or `OR.Assets.Read` |
| `getById()` | `OR.Assets` or `OR.Assets.Read` |
| `getByName()` | `OR.Assets` or `OR.Assets.Read` |
| `updateValueById()` | `OR.Assets` or `OR.Assets.Write` |

## Jobs

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Jobs` or `OR.Jobs.Read` |
| `getById()` | `OR.Jobs` or `OR.Jobs.Read` |
| `getOutput()` | `OR.Jobs` or `OR.Jobs.Read`, `OR.Folders` or `OR.Folders.Read` |
| `stop()` | `OR.Jobs` |
| `resume()` | `OR.Jobs` or `OR.Jobs.Write` |
| `restart()` | `OR.Jobs` |
| `getAttachments()` | `OR.Jobs` or `OR.Jobs.Read` |
| `linkAttachment()` | `OR.Jobs` or `OR.Jobs.Write` |

## Functions

Coded functions are invoked through their HTTP endpoint, which requires the [`OR.Default`](https://docs.uipath.com/automation-cloud/automation-cloud/latest/api-guide/accessing-uipath-resources-using-external-applications#declaring-scopes) scope. It acts as a wildcard granting fine-grained access based on the app's assigned role, and must appear explicitly in the app's scope string.

Before running the function, `invoke()` also acquires a Studio Web license for the calling user. That call requires a valid Orchestrator token but no scope of its own, so it adds nothing to the table below.

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Default` |
| `invoke()` | `OR.Default`, `OR.Folders` or `OR.Folders.Read` |

## Attachments

| Method | OAuth Scope |
|--------|-------------|
| `getById()` | `OR.Folders` or `OR.Folders.Read` |
| `create()` | `OR.Folders` or `OR.Folders.Write` |

## Buckets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Buckets` or `OR.Buckets.Read` |
| `getById()` | `OR.Buckets` or `OR.Buckets.Read` |
| `getByName()` | `OR.Buckets` or `OR.Buckets.Read` |
| `getFileMetaData()` | `OR.Buckets` or `OR.Buckets.Read` |
| `getReadUri()` | `OR.Buckets` or `OR.Buckets.Read` |
| `uploadFile()` | `OR.Buckets` |
| `deleteFile()` | `OR.Buckets` or `OR.Buckets.Write` |
| `getFiles()` | `OR.Buckets` or `OR.Buckets.Read` |

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
| `deleteRecordById()` / `deleteRecord()` | `DataFabric.Data.Write` |
| `updateRecordById()` / `updateRecord()` | `DataFabric.Data.Write` |
| `updateRecordsById()` / `updateRecords()` | `DataFabric.Data.Write` |
| `downloadAttachment()` | `DataFabric.Data.Read` |
| `uploadAttachment()` | `DataFabric.Data.Write` |
| `deleteAttachment()` | `DataFabric.Data.Write` |
| `queryRecordsById()` / `queryRecords()` | `DataFabric.Data.Read` |
| `importRecordsById()` / `importRecords()` | `DataFabric.Data.Write` |
| `create()` | `DataFabric.Schema.Write` |
| `updateById()` / `update()` | `DataFabric.Schema.Write` |
| `deleteById()` / `delete()` | `DataFabric.Schema.Write` |

## ChoiceSets

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `DataFabric.Schema.Read` |
| `getById()` | `DataFabric.Data.Read` |
| `create()` | `DataFabric.Schema.Write` |
| `updateById()` | `DataFabric.Schema.Write` |
| `deleteById()` | `DataFabric.Schema.Write` |

## Maestro Processes

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |
| `getIncidents()` | `PIMS` |
| `getTopRunCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopFaultedCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopElementFailedCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getInstanceStatusTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getIncidentsTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopExecutionDuration()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getElementStats()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getInstanceStats()` | `Insights.RealTimeData Insights OR.Folders.Read` |

## Maestro Process Instances

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |
| `getById()` | `PIMS` |
| `getExecutionHistory()` | `PIMS` `Traces.Api` |
| `getBpmn()` | `OR.Execution.Read` |
| `getVariables()` | `PIMS OR.Execution.Read` |
| `getIncidents()` | `PIMS` |
| `cancel()` | `PIMS` |
| `pause()` | `PIMS` |
| `resume()` | `PIMS` |
| `retry()` | `PIMS` |

## Maestro Cases

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS` |
| `getTopRunCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopFaultedCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopElementFailedCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getInstanceStatusTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getIncidentsTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopExecutionDuration()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getElementStats()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getInstanceStats()` | `Insights.RealTimeData Insights OR.Folders.Read` |

## Maestro Case Instances

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `PIMS OR.Execution.Read` |
| `getById()` | `PIMS OR.Execution.Read` |
| `close()` | `PIMS` |
| `pause()` | `PIMS` |
| `resume()` | `PIMS` |
| `reopen()` | `PIMS` |
| `sendMessage()` | `PIMS` |
| `getExecutionHistory()` | `PIMS` |
| `getVariables()` | `PIMS OR.Execution.Read` |
| `getStages()` | `PIMS OR.Execution.Read` |
| `getActionTasks()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getSlaSummary()` | `Insights.RealTimeData Insights OR.Folders.Read PIMS` |
| `getStagesSlaSummary()` | `Insights.RealTimeData Insights OR.Folders.Read PIMS` |

## Conversational Agent

To use the full Conversational Agent functionality (discover agents, manage conversations, stream real-time responses via WebSocket sessions, retrieve history, and manage personal connections), your external app needs the following combined scopes:

`OR.Execution` · `OR.Folders` · `OR.Users` · `OR.Jobs` · `ConversationalAgents` · `Traces.Api` · `IS.Connections.Read` · `IS.Connectors.Read`

/// note
The `ConversationalAgents` scope is required for real-time WebSocket sessions (`startSession()`). Without it, REST API calls for agents and conversations will work, but the socket connection will fail.
///

### Agents

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Execution` or `OR.Execution.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read` |
| `downloadCitationSource()` | NA |

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

### Connections

| Method | OAuth Scope |
|--------|-------------|
| `getAvailableConnections()` | `OR.Execution` or `OR.Execution.Read`, `IS.Connections.Read`, `IS.Connectors.Read` |
| `updateConnectionSelections()` | `OR.Execution`, `IS.Connections.Read` |
| `getAddConnectionUrl()` | `OR.Execution` or `OR.Execution.Read` |

### User Settings

| Method | OAuth Scope |
|--------|-------------|
| `getSettings()` | `OR.Users` or `OR.Users.Read` |
| `updateSettings()` | `OR.Users` |

### Feedback

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `Traces.Api` |
| `getById()` | `Traces.Api` |
| `submit()` | `Traces.Api` |
| `updateById()` | `Traces.Api` |
| `deleteById()` | `Traces.Api` |
| `createCategory()` | `Traces.Api` |
| `getCategories()` | `Traces.Api` |
| `deleteCategory()` | `Traces.Api` |

### Agent Memory

| Method | OAuth Scope |
|--------|-------------|
| `getTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getCallsTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopSpaces()` | `Insights.RealTimeData Insights OR.Folders.Read` |

## Traces

| Method | OAuth Scope |
|--------|-------------|
| `getById()` | `Traces.Api` |
| `getSpansByIds()` | `Traces.Api` |

## Governance

| Method | OAuth Scope |
|--------|-------------|
| `getPolicyTraces()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getOperationSummary()` | `Insights.RealTimeData Insights OR.Folders.Read` |

## Platform

| Method | OAuth Scope |
|--------|-------------|
| `getUserSettings()` | `PM.Setting` or `PM.Setting.Read` |
| `updateUserSettings()` | `PM.Setting` or `PM.Setting.Write` |

## Processes

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Execution` or `OR.Execution.Read` |
| `getById()` | `OR.Execution` or `OR.Execution.Read` |
| `getByName()` | `OR.Execution` or `OR.Execution.Read` |
| `start()` | `OR.Jobs` or `OR.Jobs.Write` |

## Queues

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Queues` or `OR.Queues.Read` |
| `getById()` | `OR.Queues` or `OR.Queues.Read` |
| `getByName()` | `OR.Queues` or `OR.Queues.Read` |
| `getByKey()` | `OR.Queues` or `OR.Queues.Read` |
| `getAllItems()` | `OR.Queues` or `OR.Queues.Read` |
| `insertItemByName()` / `insertItem()` | `OR.Queues` or `OR.Queues.Write` |
| `startTransaction()` | `OR.Queues` or `OR.Queues.Write` |
| `completeTransaction()` | `OR.Queues` or `OR.Queues.Write` |

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
| `getDataById()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getDataByKey()` | `OR.Tasks` or `OR.Tasks.Read` |
| `saveData()` | `OR.Tasks` or `OR.Tasks.Write` |
| `saveTags()` | `OR.Tasks` or `OR.Tasks.Write` |
| `editMetadata()` | `OR.Tasks` or `OR.Tasks.Write` |
| `getComments()` | `OR.Tasks` or `OR.Tasks.Read` |
| `createComment()` | `OR.Tasks` or `OR.Tasks.Write` |

## TaskCatalogs

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getById()` | `OR.Tasks` or `OR.Tasks.Read` |
| `getByName()` | `OR.Tasks` or `OR.Tasks.Read` |
| `create()` | `OR.Tasks` or `OR.Tasks.Write` |
| `updateById()` | `OR.Tasks` or `OR.Tasks.Write` |
| `updateByName()` | `OR.Tasks` or `OR.Tasks.Write` |

## Agents

| Method | OAuth Scope |
|--------|-------------|
| `getAll()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getErrors()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getErrorsTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getConsumptionTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getLatencyTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopErrorCount()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getTopConsumption()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getIncidentDistribution()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getSummary()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getUnitConsumptionSummary()` | `Insights.RealTimeData Insights OR.Folders.Read` |

## Agent Traces

| Method | OAuth Scope |
|--------|-------------|
| `getErrorsTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getLatencyTimeline()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getUnitConsumption()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getSpansByTraceId()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getSpansByReference()` | `Insights.RealTimeData Insights OR.Folders.Read` |
| `getGovernanceDecisions()` | `Traces.Api Insights.RealTimeData Insights OR.Folders.Read` |
| `getGovernanceSummary()` | `Traces.Api Insights.RealTimeData Insights OR.Folders.Read` |
