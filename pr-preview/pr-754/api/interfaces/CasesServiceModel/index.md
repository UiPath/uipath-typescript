Service for managing UiPath Maestro Cases

UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.

### Usage

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);
const allCases = await cases.getAll();
```

## Methods

### getAll()

> **getAll**(`options?`: `CaseGetAllOptions`): `Promise`\<`CaseGetAllWithMethodsResponse`[]>

Get all case management processes with their instance statistics.

Returns every case process with aggregated instance counts by status. Pass `options` to narrow the results by process key, package, or the time range their instances started in.

#### Parameters

- `options?`: `CaseGetAllOptions` — Optional filters (processKey, packageId, startTime, endTime)

#### Returns

`Promise`\<`CaseGetAllWithMethodsResponse`[]>

Promise resolving to an array of [CaseGetAllWithMethodsResponse](../../type-aliases/CaseGetAllWithMethodsResponse/)

#### Examples

```
// Get all case management processes
const allCases = await cases.getAll();

// Access case information
for (const caseProcess of allCases) {
  console.log(`Case Process: ${caseProcess.processKey}`);
  console.log(`Running instances: ${caseProcess.runningCount}`);
  console.log(`Completed instances: ${caseProcess.completedCount}`);
}
```

```
// Filter by package and the time range instances started in
const filtered = await cases.getAll({
  packageId: '<packageId>',
  startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endTime: new Date(),
});
```

### getElementStats()

> **getElementStats**(`request`: `MaestroProcessStatsRequest`): `Promise`\<`ElementStats`[]>

Get element stats for case instances

Returns per-element execution counts (success, fail, terminated, paused, in-progress) and duration percentile metrics (min, max, avg, p50, p95, p99) for BPMN elements within a case.

#### Parameters

- `request`: `MaestroProcessStatsRequest` — Process scope + time range to aggregate over

#### Returns

`Promise`\<`ElementStats`[]>

Promise resolving to an array of [ElementStats](../ElementStats/)

#### Example

```
// First, list cases to find the processKey, packageId, and available versions
const allCases = await cases.getAll();
const caseItem = allCases[0];

// Get element metrics for that case
const elements = await cases.getElementStats({
  processKey: caseItem.processKey,
  packageId: caseItem.packageId,
  packageVersion: caseItem.packageVersions[0],
  startTime: new Date('2026-04-01'),
  endTime: new Date(),
});

// Find elements with failures
const failedElements = elements.filter(e => e.failCount > 0);
for (const element of failedElements) {
  console.log(`Failed element: ${element.elementId}, failures: ${element.failCount}`);
}

// Using bound method on a case — auto-fills processKey and packageId
const boundElements = await caseItem.getElementStats(
  new Date('2026-04-01'),
  new Date(),
  caseItem.packageVersions[0]
);
```

### getIncidentsTimeline()

> **getIncidentsTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TimelineOptions`): `Promise`\<`IncidentTimelineResponse`[]>

Get incident counts aggregated by time bucket for case management processes.

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
const incidents = await cases.getIncidentsTimeline(sevenDaysAgo, now);

for (const incident of incidents) {
  console.log(`${incident.startTime} → ${incident.endTime}: ${incident.count} incidents`);
}
```

```
import { TimeInterval } from '@uipath/uipath-typescript/cases';

// Get weekly breakdown
const incidents = await cases.getIncidentsTimeline(startTime, endTime, {
  groupBy: TimeInterval.Week,
});
```

```
// Filter to a specific case process
const filtered = await cases.getIncidentsTimeline(startTime, endTime, {
  processKeys: ['<processKey>'],
});
```

### getInstanceStats()

> **getInstanceStats**(`request`: `MaestroProcessStatsRequest`): `Promise`\<`InstanceStats`>

Get instance stats for a case.

Returns total instance counts broken down by status (running, completed, faulted, etc.) and the average execution duration for all instances of a case within a time range.

#### Parameters

- `request`: `MaestroProcessStatsRequest` — Process scope + time range to aggregate over

#### Returns

`Promise`\<`InstanceStats`>

Promise resolving to [InstanceStats](../InstanceStats/)

#### Example

```
// First, list cases to find the processKey, packageId, and available versions
const allCases = await cases.getAll();
const caseItem = allCases[0];

// Get instance status breakdown for that case
const counts = await cases.getInstanceStats({
  processKey: caseItem.processKey,
  packageId: caseItem.packageId,
  packageVersion: caseItem.packageVersions[0],
  startTime: new Date('2026-04-01'),
  endTime: new Date(),
});

console.log(`Total: ${counts.totalCount}`);
console.log(`Completed: ${counts.completedCount}, Faulted: ${counts.faultedCount}`);

// Using bound method on a case — auto-fills processKey and packageId
const boundCounts = await caseItem.getInstanceStats(
  new Date('2026-04-01'),
  new Date(),
  caseItem.packageVersions[0]
);
```

### getInstanceStatusTimeline()

> **getInstanceStatusTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TimelineOptions`): `Promise`\<`InstanceStatusTimelineResponse`[]>

Get all instances status counts aggregated by date for case management processes.

Returns time-grouped counts of case instances grouped by status (Completed, Faulted, Cancelled), useful for rendering time-series charts. Use `groupBy` to control the time bucket size (hour, day, or week) — defaults to day if not provided.

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
const statuses = await cases.getInstanceStatusTimeline(sevenDaysAgo, now);

for (const entry of statuses) {
  console.log(`${entry.startTime} — ${entry.status}: ${entry.count}`);
}
```

```
import { TimeInterval } from '@uipath/uipath-typescript/cases';

// Get weekly breakdown
const statuses = await cases.getInstanceStatusTimeline(startTime, endTime, {
  groupBy: TimeInterval.Week,
});
```

```
// Filter to a specific case process
const filtered = await cases.getInstanceStatusTimeline(startTime, endTime, {
  processKeys: ['<processKey>'],
});
```

```
// Get all-time data (from Unix epoch to now)
const allTime = await cases.getInstanceStatusTimeline(new Date(0), new Date());
```

### getTopElementFailedCount()

> **getTopElementFailedCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`ElementGetTopFailedCountResponse`[]>

Get the top 10 BPMN elements ranked by failure count within a time range.

Returns an array of up to 10 elements sorted by how many times they failed, useful for identifying the most error-prone activities in case processes.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`ElementGetTopFailedCountResponse`[]>

Promise resolving to an array of [ElementGetTopFailedCountResponse](../ElementGetTopFailedCountResponse/)

#### Examples

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);

// Get top failing elements for the last 7 days
const topFailing = await cases.getTopElementFailedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const element of topFailing) {
  console.log(`${element.elementName} (${element.elementType}): ${element.failedCount} failures`);
}
```

```
// Get top failing elements for a specific process
const filtered = await cases.getTopElementFailedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { processKey: '<processKey>' }
);
```

### getTopExecutionDuration()

> **getTopExecutionDuration**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`CaseGetTopDurationResponse`[]>

Get the top 5 case processes ranked by total duration within a time range.

Returns an array of up to 5 case processes sorted by their total execution time, useful for identifying the longest-running case processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`CaseGetTopDurationResponse`[]>

Promise resolving to an array of [CaseGetTopDurationResponse](../CaseGetTopDurationResponse/)

#### Examples

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);

// Get top case processes by duration for the last 7 days
const topProcesses = await cases.getTopExecutionDuration(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topProcesses) {
  console.log(`${process.packageId}: ${process.duration}ms total`);
}
```

```
// Get top case processes by duration for a specific package
const filtered = await cases.getTopExecutionDuration(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```

### getTopFaultedCount()

> **getTopFaultedCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`CaseGetTopFaultedCountResponse`[]>

Get the top 10 case processes ranked by failure count within a time range.

Returns an array of up to 10 case processes sorted by how many instances faulted, useful for identifying the most error-prone case processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`CaseGetTopFaultedCountResponse`[]>

Promise resolving to an array of [CaseGetTopFaultedCountResponse](../CaseGetTopFaultedCountResponse/)

#### Examples

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);

// Get top case processes by faulted count for the last 7 days
const topFailing = await cases.getTopFaultedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topFailing) {
  console.log(`${process.packageId}: ${process.faultedCount} failures`);
}
```

```
// Get top case processes by faulted count for a specific package
const filtered = await cases.getTopFaultedCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```

### getTopRunCount()

> **getTopRunCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `TopQueryOptions`): `Promise`\<`CaseGetTopRunCountResponse`[]>

Get the top 5 case processes ranked by run count within a time range.

Returns an array of up to 5 case processes sorted by how many times they were executed, useful for identifying the most active case processes in a given period.

#### Parameters

- `startTime`: `Date` — Start of the time range to query
- `endTime`: `Date` — End of the time range to query
- `options?`: `TopQueryOptions` — Optional filters (packageId, processKey, version)

#### Returns

`Promise`\<`CaseGetTopRunCountResponse`[]>

Promise resolving to an array of [CaseGetTopRunCountResponse](../CaseGetTopRunCountResponse/)

#### Examples

```
import { Cases } from '@uipath/uipath-typescript/cases';

const cases = new Cases(sdk);

// Get top case processes by run count for the last 7 days
const topProcesses = await cases.getTopRunCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);

for (const process of topProcesses) {
  console.log(`${process.packageId}: ${process.runCount} runs`);
}
```

```
// Get top case processes by run count for a specific package
const filtered = await cases.getTopRunCount(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date(),
  { packageId: '<packageId>' }
);
```
