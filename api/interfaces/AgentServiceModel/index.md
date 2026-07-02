Service for retrieving runtime data for UiPath Agents.

See [About Agents](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/about-agents) for an overview of UiPath Agents.

## Methods

### getAll()

> **getAll**\<`T`>(`startTime`: `Date`, `endTime`: `Date`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AgentListItem`> : `NonPaginatedResponse`\<`AgentListItem`>>

Retrieves the list of agents on the tenant with consumption and health metadata over the requested window.

Returns a [PaginatedResponse](../PaginatedResponse/) when pagination options (`pageSize`, `cursor`, or `jumpToPage`) are provided, otherwise a [NonPaginatedResponse](../NonPaginatedResponse/).

#### Type Parameters

- `T` *extends* `AgentGetAllOptions` = `AgentGetAllOptions`

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `T` — Optional pagination, sort, and filters

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AgentListItem`> : `NonPaginatedResponse`\<`AgentListItem`>>

Promise resolving to a paginated or non-paginated list of [AgentListItem](../AgentListItem/)

#### Example

```
import { Agents, AgentListSortColumn } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Non-paginated — returns the server default page
const result = await agents.getAll(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2026-05-14T00:00:00Z'),
);
result.items.forEach((agent) => {
  console.log(`${agent.agentName} — ${agent.unitsQuantity} units, health=${agent.healthScore}`);
});

// Paginated — sorted by health score descending
const page = await agents.getAll(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2026-05-14T00:00:00Z'),
  {
    pageSize: 25,
    orderBy: { column: AgentListSortColumn.HealthScore, desc: true },
    folderKeys: ['<folderKey1>'],
  },
);

if (page.hasNextPage && page.nextCursor) {
  const next = await agents.getAll(
    new Date('2025-05-01T00:00:00Z'),
    new Date('2026-05-14T00:00:00Z'),
    { cursor: page.nextCursor },
  );
}
```

### getConsumptionTimeline()

> **getConsumptionTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetConsumptionTimelineOptions`): `Promise`\<`AgentGetConsumptionTimelineResponse`[]>

Retrieves a time-series of Agent Units consumption over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetConsumptionTimelineOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetConsumptionTimelineResponse`[]>

Promise resolving to an array of [AgentGetConsumptionTimelineResponse](../AgentGetConsumptionTimelineResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Agent Units consumption timeline in May 2025
const result = await agents.getConsumptionTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
result.forEach((point) => {
  console.log(`${point.timeSlice}: ${point.aguConsumption} Agent Units`);
});
```

```
// Scope to specific folders and agents
const result = await agents.getConsumptionTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    folderKeys: ['<folderKey1>'],
    agentNames: ['JokeAgent'],
  },
);
```

### getErrors()

> **getErrors**\<`T`>(`startTime`: `Date`, `endTime`: `Date`, `options?`: `T`): `Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AgentError`> : `NonPaginatedResponse`\<`AgentError`>>

Retrieves agent errors (error-classes observed for agents) over the requested window.

Returns a [PaginatedResponse](../PaginatedResponse/) when pagination options (`pageSize`, `cursor`, or `jumpToPage`) are provided, otherwise a [NonPaginatedResponse](../NonPaginatedResponse/).

#### Type Parameters

- `T` *extends* `AgentGetErrorsOptions` = `AgentGetErrorsOptions`

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `T` — Optional pagination, sort/group, and filters

#### Returns

`Promise`\<`T` *extends* `HasPaginationOptions`\<`T`> ? `PaginatedResponse`\<`AgentError`> : `NonPaginatedResponse`\<`AgentError`>>

Promise resolving to a paginated or non-paginated list of [AgentError](../AgentError/)

#### Example

```
import { Agents, AgentErrorSortColumn } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Non-paginated — errors in the window
const result = await agents.getErrors(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2026-05-14T00:00:00Z'),
);
result.items.forEach((error) => {
  console.log(`${error.type}: ${error.description} (count=${error.count})`);
});

// Paginated — sorted by execution count descending
const page = await agents.getErrors(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2026-05-14T00:00:00Z'),
  {
    pageSize: 25,
    orderBy: { column: AgentErrorSortColumn.ExecutionCount, desc: true },
  },
);

if (page.hasNextPage && page.nextCursor) {
  const next = await agents.getErrors(
    new Date('2025-05-01T00:00:00Z'),
    new Date('2026-05-14T00:00:00Z'),
    { cursor: page.nextCursor },
  );
}
```

### getErrorsTimeline()

> **getErrorsTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetErrorsTimelineOptions`): `Promise`\<`AgentGetErrorsTimelineResponse`[]>

Retrieves a time-series of error counts grouped by agent over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetErrorsTimelineOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetErrorsTimelineResponse`[]>

Promise resolving to an array of [AgentGetErrorsTimelineResponse](../AgentGetErrorsTimelineResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// All errors in May 2025
const result = await agents.getErrorsTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
result.forEach((point) => {
  console.log(`${point.date} ${point.name}: ${point.value} errors`);
});
```

```
// Scope to specific folders and top 5 agents
const result = await agents.getErrorsTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    folderKeys: ['<folderKey1>'],
    agentNames: ['JokeAgent', 'StoryAgent'],
    limit: 5,
  },
);
```

### getIncidentDistribution()

> **getIncidentDistribution**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetIncidentDistributionOptions`): `Promise`\<`AgentGetIncidentDistributionResponse`>

Retrieves breakdown of agent incidents count — errors, escalations, and policy violations over a requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetIncidentDistributionOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetIncidentDistributionResponse`>

Promise resolving to [AgentGetIncidentDistributionResponse](../AgentGetIncidentDistributionResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Incident distribution in May 2025
const result = await agents.getIncidentDistribution(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
console.log(`Errors: ${result.errorCount}, Escalations: ${result.escalationCount}, Policy: ${result.policyCount}`);
```

```
// Scope to specific folders
const result = await agents.getIncidentDistribution(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    folderKeys: ['<folderKey1>'],
  },
);
```

### getLatencyTimeline()

> **getLatencyTimeline**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetLatencyTimelineOptions`): `Promise`\<`AgentGetLatencyTimelineResponse`[]>

Retrieves a time-series of agent latency (milliseconds) over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetLatencyTimelineOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetLatencyTimelineResponse`[]>

Promise resolving to an array of [AgentGetLatencyTimelineResponse](../AgentGetLatencyTimelineResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Latency timeline in May 2025
const result = await agents.getLatencyTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
result.forEach((point) => {
  console.log(`${point.date} ${point.name}: ${point.value} ms`);
});
```

```
// Scope to specific folders and a single agent
const result = await agents.getLatencyTimeline(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    folderKeys: ['<folderKey1>'],
    agentId: '<agentId>',
  },
);
```

### getSummary()

> **getSummary**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetSummaryOptions`): `Promise`\<`AgentGetSummaryResponse`>

Retrieves a job-execution summary for the requested window: overall totals (total jobs, successful jobs, success rate, average duration) alongside a per-agent breakdown. When `lookbackPeriodAnalysis` is enabled, a comparable summary for the preceding window of equal length is included too.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetSummaryOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetSummaryResponse`>

Promise resolving to [AgentGetSummaryResponse](../AgentGetSummaryResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Summary for May 2025
const result = await agents.getSummary(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
console.log(`Success rate: ${result.currentPeriodSummary.successRate}%`);
```

```
import { Agents, AgentExecutionType } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Runtime-only summary with lookback comparison
const result = await agents.getSummary(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    lookbackPeriodAnalysis: true,
    executionType: AgentExecutionType.Runtime,
  },
);
```

### getTopConsumption()

> **getTopConsumption**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetTopConsumptionOptions`): `Promise`\<`AgentGetTopConsumptionResponse`>

Retrieves the top-N agents ranked by unit consumption over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetTopConsumptionOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetTopConsumptionResponse`>

Promise resolving to [AgentGetTopConsumptionResponse](../AgentGetTopConsumptionResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Top agents by consumption in May 2025
const result = await agents.getTopConsumption(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
console.log(`Total consumed: ${result.totalConsumed}`);
result.agents.forEach((agent) => {
  console.log(`${agent.agentName}: ${agent.consumedQuantity}`);
});
```

```
import { Agents, AgentType } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Top 5 healthy autonomous agents by consumption
const result = await agents.getTopConsumption(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    limit: 5,
    healthy: true,
    agentTypes: [AgentType.Autonomous],
  },
);
```

### getTopErrorCount()

> **getTopErrorCount**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetTopErrorCountOptions`): `Promise`\<`AgentGetTopErrorCountResponse`>

Retrieves the top-N agents ranked by error count over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetTopErrorCountOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetTopErrorCountResponse`>

Promise resolving to [AgentGetTopErrorCountResponse](../AgentGetTopErrorCountResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Top agents by error count in May 2025
const result = await agents.getTopErrorCount(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
result.data.forEach((agent) => {
  console.log(`${agent.name}: ${agent.count} errors`);
});
```

```
// Scope to specific folders and top 5 agents
const result = await agents.getTopErrorCount(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    folderKeys: ['<folderKey1>'],
    limit: 5,
  },
);
```

### getUnitConsumptionSummary()

> **getUnitConsumptionSummary**(`startTime`: `Date`, `endTime`: `Date`, `options?`: `AgentGetUnitConsumptionSummaryOptions`): `Promise`\<`AgentGetUnitConsumptionSummaryResponse`>

Retrieves an aggregate Agent Units and Platform Units consumption summary per agent over the requested window.

#### Parameters

- `startTime`: `Date` — Inclusive lower bound for the query window
- `endTime`: `Date` — Exclusive upper bound for the query window
- `options?`: `AgentGetUnitConsumptionSummaryOptions` — Optional filters

#### Returns

`Promise`\<`AgentGetUnitConsumptionSummaryResponse`>

Promise resolving to [AgentGetUnitConsumptionSummaryResponse](../AgentGetUnitConsumptionSummaryResponse/)

#### Examples

```
import { Agents } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Unit consumption summary for May 2025
const result = await agents.getUnitConsumptionSummary(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
);
console.log(`Agent Units complete jobs: ${result.currentPeriodSummary.totalAgentUnitConsumption.completeJobs}`);
```

```
import { Agents, AgentExecutionType } from '@uipath/uipath-typescript/agents';

const agents = new Agents(sdk);

// Runtime-only summary with lookback comparison
const result = await agents.getUnitConsumptionSummary(
  new Date('2025-05-01T00:00:00Z'),
  new Date('2025-06-01T00:00:00Z'),
  {
    lookbackPeriodAnalysis: true,
    executionType: AgentExecutionType.Runtime,
  },
);
```
