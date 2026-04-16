Service for managing UiPath Orchestrator Jobs.

Jobs represent the execution of a process (automation) on a UiPath Robot. Each job tracks the lifecycle of a single process run, including its state, timing, input/output arguments, and associated resources. [UiPath Jobs Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs)

### Usage

```
import { Jobs } from '@uipath/uipath-typescript/jobs';

const jobs = new Jobs(sdk);
const allJobs = await jobs.getAll();
```

## Methods

### getAll()

> **getAll**\<`T`>(`options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`JobGetResponse`> : `NonPaginatedResponse`\<`JobGetResponse`>>

Gets all jobs across folders with optional filtering and pagination.

Returns jobs with full details including state, timing, and input/output arguments. Pass `folderId` to scope the query to a specific folder.

Input and output fields are not included in `getAll` responses

The `inputArguments`, `inputFile`, `outputArguments`, and `outputFile` fields will always be `null` in the `getAll` response. To retrieve a job's output, use the [getOutput](#getoutput) method with the job's `key` and `folderId`.

#### Type Parameters

- `T` *extends* `JobGetAllOptions` = `JobGetAllOptions`

#### Parameters

- `options?`: `T` — Query options including optional folderId, filtering, and pagination options

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`JobGetResponse`> : `NonPaginatedResponse`\<`JobGetResponse`>>

Promise resolving to either an array of jobs [NonPaginatedResponse](../NonPaginatedResponse/)\<[JobGetResponse](../../type-aliases/JobGetResponse/)> or a [PaginatedResponse](../PaginatedResponse/)\<[JobGetResponse](../../type-aliases/JobGetResponse/)> when pagination options are used. [JobGetResponse](../../type-aliases/JobGetResponse/)

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

### getById()

> **getById**(`id`: `string`, `folderId`: `number`, `options?`: `JobGetByIdOptions`): `Promise`\<`JobGetResponse`>

Gets a job by its unique key (GUID).

Returns the full job details including state, timing, input/output arguments, and error information. Use `expand` to include related entities like `robot`, or `machine`.

#### Parameters

- `id`: `string` — The unique key (GUID) of the job to retrieve
- `folderId`: `number` — The folder ID where the job resides
- `options?`: `JobGetByIdOptions` — Optional query options for expanding or selecting fields

#### Returns

`Promise`\<`JobGetResponse`>

Promise resolving to a [JobGetResponse](../../type-aliases/JobGetResponse/) with full job details and bound methods

#### Examples

```
// Get a job by key
const job = await jobs.getById(<id>, <folderId>);
console.log(job.state, job.processName);
```

```
// With expanded related entities
const job = await jobs.getById(<id>, <folderId>, {
  expand: 'robot,machine'
});
console.log(job.robot?.name, job.machine?.name);
```

### getOutput()

> **getOutput**(`jobKey`: `string`, `folderId`: `number`): `Promise`\<`null` | `Record`\<`string`, `unknown`>>

Gets the output of a completed job.

Retrieves the job's output arguments, handling both inline output (stored directly on the job as a JSON string in `outputArguments`) and file-based output (stored as a blob attachment for large outputs). Returns the parsed JSON output or `null` if the job has no output.

#### Parameters

- `jobKey`: `string` — The unique key (GUID) of the job to retrieve output from
- `folderId`: `number` — The folder ID where the job resides

#### Returns

`Promise`\<`null` | `Record`\<`string`, `unknown`>>

Promise resolving to the parsed output as `Record<string, unknown>`, or `null` if no output exists

#### Examples

```
// Get output from a completed job
const output = await jobs.getOutput(<jobKey>, <folderId>);

if (output) {
  console.log('Job output:', output);
}
```

```
// Get output using bound method (jobKey and folderId are taken from the job object)
const allJobs = await jobs.getAll();
const completedJob = allJobs.items.find(j => j.state === JobState.Successful);

if (completedJob) {
  const output = await completedJob.getOutput();
}
```
