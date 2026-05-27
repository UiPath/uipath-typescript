# Traces Service — Integration Tests

*2026-05-27T21:40:22Z by Showboat 0.6.1*
<!-- showboat-id: bcca6b16-7e26-4c0d-a44a-f572f4a49871 -->

Integration tests for the TracesService, running against alpha.uipath.com (org: procodeapps, tenant: DefaultTenant). Tests cover three public methods: getById, getSpansByIds, and getSpansByAgentId. The suite uses a real trace (e2f6d735-9369-45e1-b8f3-96c4d60e728b) and seeds spanId/agentId dynamically in beforeAll. The suite skips cleanly when TRACES_TEST_TRACE_ID is not set (CI environment).

## getById — retrieve all spans for a trace ID

Fetches all spans for a trace UUID. Tests verify response shape, camelCase transform (no raw PascalCase), enum mapping, pageSize option, and ValidationError on empty input.

```bash
npm run test:integration -- --run --reporter=verbose tests/integration/shared/observability/traces.integration.test.ts 2>&1 | grep -E '(✓|↓|✗|getById)'
```

```output
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should retrieve spans for a trace 169ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should return SpanResponse objects with required fields 149ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should return camelCase fields — raw PascalCase fields absent 400ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should respect pageSize option 201ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should map status to a known SpanStatus enum value 194ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getById > should throw ValidationError when traceId is empty 1ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByIds > should retrieve specific spans by span IDs 157ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByIds > should return camelCase fields — raw PascalCase fields absent 171ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByIds > should return empty array for unknown span IDs 154ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByIds > should throw ValidationError when traceId is empty 0ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should retrieve spans for an agent 938ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should return SpanResponse objects with required fields 1056ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should respect pageSize option 644ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should support cursor-based pagination 1648ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should support time range filtering 727ms
 ✓ tests/integration/shared/observability/traces.integration.test.ts > Traces [v1] > getSpansByAgentId > should throw ValidationError when agentId is empty 1ms
```

All 6 getById tests passed. The transform validation test confirms the live API returns camelCase-transformed fields and no raw PascalCase keys.

## getSpansByIds — retrieve specific spans by span IDs

Fetches a subset of spans by their IDs within a trace. Tests verify correct span retrieval, transform correctness, empty-array behaviour for unknown IDs, and ValidationError on empty traceId.

All 4 getSpansByIds tests passed.

## getSpansByAgentId — paginated spans by agent

Fetches all spans for a specific agent ID with pagination and optional time-range filtering. Tests cover basic retrieval, response shape, pageSize option, cursor-based pagination across 2+ pages, time range filtering, and ValidationError on empty agentId.

All 6 getSpansByAgentId tests passed — including cursor-based pagination (confirmed 2+ pages exist for this agent) and time range filtering.
