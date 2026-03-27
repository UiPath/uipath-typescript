Service for managing UiPath Orchestrator Jobs.

Jobs represent the execution of a process (automation) on a UiPath Robot. Each job tracks the lifecycle of a single process run, including its state, timing, input/output arguments, and associated resources. [UiPath Jobs Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs)

### Usage

Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)

```
import { Jobs } from '@uipath/uipath-typescript/jobs';

const jobs = new Jobs(sdk);
const allJobs = await jobs.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`JobGetResponse`](../JobGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`JobGetResponse`](../JobGetResponse/)>>

Gets all jobs across folders with optional filtering

#### Type Parameters

| Type Parameter                                                           | Default type                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `T` *extends* [`JobGetAllOptions`](../../type-aliases/JobGetAllOptions/) | [`JobGetAllOptions`](../../type-aliases/JobGetAllOptions/) |

#### Parameters

| Parameter  | Type | Description                                                      |
| ---------- | ---- | ---------------------------------------------------------------- |
| `options?` | `T`  | Query options including optional folderId and pagination options |

#### Returns

`Promise`\<`T` *extends* [`HasPaginationOptions`](../../type-aliases/HasPaginationOptions/)\<`T`> ? [`PaginatedResponse`](../PaginatedResponse/)\<[`JobGetResponse`](../JobGetResponse/)> : [`NonPaginatedResponse`](../NonPaginatedResponse/)\<[`JobGetResponse`](../JobGetResponse/)>>

Promise resolving to either an array of jobs [NonPaginatedResponse](../NonPaginatedResponse/)\<[JobGetResponse](../JobGetResponse/)> or a [PaginatedResponse](../PaginatedResponse/)\<[JobGetResponse](../JobGetResponse/)> when pagination options are used. [JobGetResponse](../JobGetResponse/)

#### Example

```
// Get all jobs
const allJobs = await jobs.getAll();

// Get all jobs in a specific folder
const folderJobs = await jobs.getAll({ folderId: <folderId> });

// With filtering
const runningJobs = await jobs.getAll({
  filter: "state eq 'Running'"
});

// First page with pagination
const page1 = await jobs.getAll({ pageSize: 10 });

// Navigate using cursor
if (page1.hasNextPage) {
  const page2 = await jobs.getAll({ cursor: page1.nextCursor });
}

// Jump to specific page
const page5 = await jobs.getAll({
  jumpToPage: 5,
  pageSize: 10
});
```
