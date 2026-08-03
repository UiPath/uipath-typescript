Service for managing UiPath Maestro Processes

UiPath Maestro is a cloud-native orchestration layer that coordinates bots, AI agents, and humans for seamless, intelligent automation of complex workflows. [UiPath Maestro Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/introduction-to-maestro)

### Usage

```
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const maestroProcesses = new MaestroProcesses(sdk);
const allProcesses = await maestroProcesses.getAll();
```

## Methods

### getAll()

> **getAll**(`options?`: `MaestroProcessGetAllOptions`): `Promise`\<`MaestroProcessGetAllResponse`[]>

Get all processes with their instance statistics.

Returns every Maestro process with aggregated instance counts by status. Pass `options` to narrow the results by process key, package, or the time range their instances started in.

#### Parameters

- `options?`: `MaestroProcessGetAllOptions` — Optional filters (processKey, packageId, startTime, endTime)

#### Returns

`Promise`\<`MaestroProcessGetAllResponse`[]>

Promise resolving to array of MaestroProcess objects with methods [MaestroProcessGetAllResponse](../../type-aliases/MaestroProcessGetAllResponse/)

#### Examples

```
// Get all processes
const allProcesses = await maestroProcesses.getAll();

// Access process information and incidents
for (const process of allProcesses) {
  console.log(`Process: ${process.processKey}`);
  console.log(`Running instances: ${process.runningCount}`);
  console.log(`Faulted instances: ${process.faultedCount}`);

  // Get incidents for this process
  const incidents = await process.getIncidents();
  console.log(`Incidents: ${incidents.length}`);
}
```

```
// Filter by package and the time range instances started in
const filtered = await maestroProcesses.getAll({
  packageId: '<packageId>',
  startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endTime: new Date(),
});
```

### getElementStats()

> **getElementStats**(`request`: `MaestroProcessStatsRequest`): `Promise`\<`ElementStats`[]>

Get element stats for process instances

Returns per-element execution counts (success, fail, terminated, paused, in-progress) and duration percentile metrics (min, max, avg, p50, p95, p99) for BPMN elements within a process.

#### Parameters

- `request`: `MaestroProcessStatsRequest` — Process scope + time range to aggregate over

#### Returns

`Promise`\<`ElementStats`[]>

Promise resolving to an array of [ElementStats](../ElementStats/)

#### Example

```
// First, list processes to find the processKey, packageId, and available versions
const processes = await maestroProcesses.getAll();
const process = processes[0];

// Get element metrics for that process
const elements = await maestroProcesses.getElementStats({
  processKey: process.processKey,
  packageId: process.packageId,
  packageVersion: process.packageVersions[0],
  startTime: new Date('2026-04-01'),
  endTime: new Date(),
});

// Analyze element performance
for (const element of elements) {
  console.log(`Element: ${element.elementId}`);
  console.log(`  Success: ${element.successCount}, Failed: ${element.failCount}`);
  console.log(`  Avg duration: ${element.avgDurationMs}ms, P95: ${element.p95DurationMs}ms`);
}

// Using bound method on a process — auto-fills processKey and packageId
const boundElements = await process.getElementStats(
  new Date('2026-04-01'),
  new Date(),
  process.packageVersions[0]
);
```

### getIncidents()

> **getIncidents**(`processKey`: `string`, `folderKey`: `string`): `Promise`\<`ProcessIncidentGetResponse`[]>

Get incidents for a specific process

#### Parameters

- `processKey`: `string` — The key of the process to get incidents for
- `folderKey`: `string` — The folder key for authorization

#### Returns

`Promise`\<`ProcessIncidentGetResponse`[]>

Promise resolving to array of incidents for the process [ProcessIncidentGetResponse](../ProcessIncidentGetResponse/)

#### Example

```
// Get incidents for a specific process
const incidents = await maestroProcesses.getIncidents('<processKey>', '<folderKey>');

// Access incident details
for (const incident of incidents) {
  console.log(`Element: ${incident.incidentElementActivityName} (${incident.incidentElementActivityType})`);
  console.log(`Status: ${incident.incidentStatus}`);
  console.log(`Error: ${incident.errorMessage}`);
}
```

### getIncidentsTimeline()

> **getIncidentsTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TimelineOptions`): `Promise`\<`IncidentTimelineResponse`[]>

Get incident counts aggregated by time bucket for maestro processes.

Returns time-grouped counts of incidents that occurred within each bucket, useful for rendering incident time-series charts. Use `groupBy` to control the time bucket size (hour, day, or week) — defaults to day if not provided.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TimelineOptions` — Optional settings for filtering and time bucket granularity

#### Returns

`Promise`\<`IncidentTimelineResponse`[]>

Promise resolving to an array of [IncidentTimelineResponse](../IncidentTimelineResponse/)

#### Examples

```
// Get daily incident counts for the last 7 days
const now = new Date();
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const incidents = await maestroProcesses.getIncidentsTimeline(sevenDaysAgo, now);

for (const incident of incidents) {
  console.log(`${incident.startTime} → ${incident.endTime}: ${incident.count} incidents`);
}
```

```
import { TimeInterval } from '@uipath/uipath-typescript/maestro-processes';

// Get weekly breakdown
const incidents = await maestroProcesses.getIncidentsTimeline(startTime, endTime, {
  groupBy: TimeInterval.Week,
});
```

```
// Filter to a specific process
const filtered = await maestroProcesses.getIncidentsTimeline(startTime, endTime, {
  processKeys: ['<processKey>'],
});
```

### getInstanceStats()

> **getInstanceStats**(`request`: `MaestroProcessStatsRequest`): `Promise`\<`InstanceStats`>

Get instance stats for a process.

Returns total instance counts broken down by status (running, completed, faulted, etc.) and the average execution duration for all instances of a process within a time range.

#### Parameters

- `request`: `MaestroProcessStatsRequest` — Process scope + time range to aggregate over

#### Returns

`Promise`\<`InstanceStats`>

Promise resolving to [InstanceStats](../InstanceStats/)

#### Example

```
// First, list processes to find the processKey, packageId, and available versions
const processes = await maestroProcesses.getAll();
const process = processes[0];

// Get instance status breakdown for that process
const counts = await maestroProcesses.getInstanceStats({
  processKey: process.processKey,
  packageId: process.packageId,
  packageVersion: process.packageVersions[0],
  startTime: new Date('2026-04-01'),
  endTime: new Date(),
});

console.log(`Total: ${counts.totalCount}`);
console.log(`Running: ${counts.runningCount}, Completed: ${counts.completedCount}`);
console.log(`Faulted: ${counts.faultedCount}, Avg duration: ${counts.avgDurationMs}ms`);

// Using bound method on a process — auto-fills processKey and packageId
const boundCounts = await process.getInstanceStats(
  new Date('2026-04-01'),
  new Date(),
  process.packageVersions[0]
);
```

### getInstanceStatusTimeline()

> **getInstanceStatusTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TimelineOptions`): `Promise`\<`InstanceStatusTimelineResponse`[]>

Get all instances status counts aggregated by date for maestro processes.

Returns time-grouped counts of instances grouped by status (Completed, Faulted, Cancelled), useful for rendering time-series charts. Use `groupBy` to control the time bucket size (hour, day, or week) — defaults to day if not provided.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TimelineOptions` — Optional settings for filtering and time bucket granularity

#### Returns

`Promise`\<`InstanceStatusTimelineResponse`[]>

Promise resolving to an array of [InstanceStatusTimelineResponse](../InstanceStatusTimelineResponse/)

#### Examples

```
// Get daily instance status for the last 7 days
const now = new Date();
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const statuses = await maestroProcesses.getInstanceStatusTimeline(sevenDaysAgo, now);

for (const entry of statuses) {
  console.log(`${entry.startTime} — ${entry.status}: ${entry.count}`);
}
```

```
import { TimeInterval } from '@uipath/uipath-typescript/maestro-processes';

// Get hourly breakdown
const statuses = await maestroProcesses.getInstanceStatusTimeline(startTime, endTime, {
  groupBy: TimeInterval.Hour,
});
```

```
// Filter to a specific process
const filtered = await maestroProcesses.getInstanceStatusTimeline(startTime, endTime, {
  processKeys: ['<processKey>'],
});
```

```
// Get all-time data (from Unix epoch to now)
const allTime = await maestroProcesses.getInstanceStatusTimeline(new Date(0), new Date());
```

### getTopElementFailedCount()

> **getTopElementFailedCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`ElementGetTopFailedCountResponse`[]>

Get the top 10 BPMN elements ranked by failure count within a time range.

Returns an array of up to 10 elements sorted by how many times they failed, useful for identifying the most error-prone activities in processes.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`ElementGetTopFailedCountResponse`[]>

Promise resolving to an array of [ElementGetTopFailedCountResponse](../ElementGetTopFailedCountResponse/)

#### Examples

```
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const maestroProcesses = new MaestroProcesses(sdk);

// Get top failing elements for the last 7 days
const topFailing = await maestroProcesses.getTopElementFailedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const element of topFailing) {
  console.log(`${element.elementName} (${element.elementType}): ${element.failedCount} failures`);
}
```

```
// Get top failing elements for a specific process
const filtered = await maestroProcesses.getTopElementFailedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { processKey: '<processKey>' }
);
```

### getTopExecutionDuration()

> **getTopExecutionDuration**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`ProcessGetTopDurationResponse`[]>

Get the top 5 processes ranked by total duration within a time range.

Returns an array of up to 5 processes sorted by their total execution time, useful for identifying the longest-running processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`ProcessGetTopDurationResponse`[]>

Promise resolving to an array of [ProcessGetTopDurationResponse](../ProcessGetTopDurationResponse/)

#### Examples

```
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const maestroProcesses = new MaestroProcesses(sdk);

// Get top processes by duration for the last 7 days
const topProcesses = await maestroProcesses.getTopExecutionDuration(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topProcesses) {
  console.log(`${process.packageId}: ${process.duration}ms total`);
}
```

```
// Get top processes by duration for a specific package
const filtered = await maestroProcesses.getTopExecutionDuration(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```

### getTopFaultedCount()

> **getTopFaultedCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`ProcessGetTopFaultedCountResponse`[]>

Get the top 10 processes ranked by failure count within a time range.

Returns an array of up to 10 processes sorted by how many instances faulted, useful for identifying the most error-prone processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`ProcessGetTopFaultedCountResponse`[]>

Promise resolving to an array of [ProcessGetTopFaultedCountResponse](../ProcessGetTopFaultedCountResponse/)

#### Examples

```
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const maestroProcesses = new MaestroProcesses(sdk);

// Get top processes by faulted count for the last 7 days
const topFailing = await maestroProcesses.getTopFaultedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topFailing) {
  console.log(`${process.packageId}: ${process.faultedCount} failures`);
}
```

```
// Get top processes by faulted count for a specific package
const filtered = await maestroProcesses.getTopFaultedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```

### getTopRunCount()

> **getTopRunCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`ProcessGetTopRunCountResponse`[]>

Get the top 5 processes ranked by run count within a time range.

Returns an array of up to 5 processes sorted by how many times they were executed, useful for identifying the most active processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`ProcessGetTopRunCountResponse`[]>

Promise resolving to an array of [ProcessGetTopRunCountResponse](../ProcessGetTopRunCountResponse/)

#### Examples

```
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const maestroProcesses = new MaestroProcesses(sdk);

// Get top processes by run count for the last 7 days
const topProcesses = await maestroProcesses.getTopRunCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topProcesses) {
  console.log(`${process.packageId}: ${process.runCount} runs`);
}
```

```
// Get top processes by run count for a specific package
const filtered = await maestroProcesses.getTopRunCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```
