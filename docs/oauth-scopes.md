# OAuth Scopes Reference

This page lists the specific OAuth scopes required in external app for each SDK method.

## Assets

| Method | OAuth Scope |
|--------|-------------|
| `sdk.assets.getAll` | `OR.Assets` or `OR.Assets.Read` |
| `sdk.assets.getById` | `OR.Assets` or `OR.Assets.Read` |

## Buckets

| Method | OAuth Scope |
|--------|-------------|
| `sdk.buckets.getAll` | `OR.Administration` or `OR.Administration.Read` |
| `sdk.buckets.getById` | `OR.Administration` or `OR.Administration.Read` |
| `sdk.buckets.getFileMetaData` | `OR.Administration` or `OR.Administration.Read` |
| `sdk.buckets.getReadUri` | `OR.Administration` or `OR.Administration.Read` |
| `sdk.buckets.uploadFile` | `OR.Administration` or `OR.Administration.Read` |

## Entities

| Method | OAuth Scope |
|--------|-------------|
| `sdk.entities.getAll` | `DataFabric.Schema.Read` |
| `sdk.entities.getRecordsById` | `DataFabric.Data.Read` |
| `sdk.entities.insertById` or `entity.insert` | `DataFabric.Data.Write` |
| `sdk.entities.batchInsertById` or `entity.batchInsert` | `DataFabric.Data.Write` |
| `sdk.entities.deleteById` or `entity.delete` | `DataFabric.Data.Write` |
| `sdk.entities.updateById` or `entity.update` | `DataFabric.Data.Write` |

## Maestro

| Method | OAuth Scope |
|--------|-------------|
| `sdk.maestro.processes.getAll` | `PIMS` |
| `sdk.maestro.processes.instances.getAll` | `PIMS` |
| `sdk.maestro.processes.instances.getExecutionHistory` | `PIMS` |
| `sdk.maestro.processes.instances.getById` | `PIMS` |
| `sdk.maestro.processes.instances.getbpmn` | `OR.Execution.Read` |
| `sdk.maestro.processes.instances.cancel` | `PIMS` |
| `sdk.maestro.processes.instances.pause` | `PIMS` |
| `sdk.maestro.processes.instances.resume` | `PIMS` |
| `sdk.maestro.cases.getAll` | `PIMS` |
| `sdk.maestro.cases.instances.getAll` | `PIMS` |
| `sdk.maestro.cases.instances.getById` | `PIMS` |
| `sdk.maestro.cases.instances.close` | `PIMS` |
| `sdk.maestro.cases.instances.pause` | `PIMS` |
| `sdk.maestro.cases.instances.resume` | `PIMS` |
| `sdk.maestro.cases.instances.getExecutionHistory` | `PIMS` |
| `sdk.maestro.cases.instances.getStages` | `PIMS` |
| `sdk.maestro.cases.instances.getActionTasks` | `OR.Tasks` or `OR.Tasks.Read` |

## Processes

| Method | OAuth Scope |
|--------|-------------|
| `sdk.processes.getAll` | `OR.Execution` or `OR.Execution.Read` |
| `sdk.processes.start` | `OR.Jobs` or `OR.Jobs.Write` |
| `sdk.processes.getById` | `OR.Execution` or `OR.Execution.Read` |

## Queues

| Method | OAuth Scope |
|--------|-------------|
| `sdk.queues.getAll` | `OR.Queues` or `OR.Queues.Read` |
| `sdk.queues.getById` | `OR.Queues` or `OR.Queues.Read` |

## Tasks

| Method | OAuth Scope |
|--------|-------------|
| `sdk.tasks.create` | `OR.Tasks` or `OR.Tasks.Write` |
| `sdk.tasks.getUsers` | `OR.Tasks` or `OR.Tasks.Read` |
| `sdk.tasks.getAll` | `OR.Tasks` or `OR.Tasks.Read` |
| `sdk.tasks.getById` | `OR.Tasks` or `OR.Tasks.Read` |
| `sdk.tasks.assign` | `OR.Tasks` or `OR.Tasks.Write` |
| `sdk.tasks.reassign` | `OR.Tasks` or `OR.Tasks.Write` |
| `sdk.tasks.complete` | `OR.Tasks` or `OR.Tasks.Write` |
| `sdk.tasks.getFormTaskById` | `OR.Tasks` or `OR.Tasks.Read` |