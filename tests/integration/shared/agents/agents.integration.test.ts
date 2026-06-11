import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Agents } from '../../../../src/services/agents';
import { AgentExecutionType } from '../../../../src/models/agents/agents.types';
import { AGENT_TEST_CONSTANTS } from '../../../utils/constants';

/**
 * Integration tests for Agents (`/insightsrtm_/Agents/*`).
 *
 * Run with:
 *   npx vitest run tests/integration/shared/agents/agents.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

// skip: insightsrtm_ endpoints reject PAT tokens entirely (401 regardless of scopes) and require OAuth.
// Skipped at the outer level so the live-auth setup (setupUnifiedTests + beforeAll) does not run.
describe.skip.each(modes)('Agents - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let agents!: Agents;

  beforeAll(() => {
    const services = getServices();
    if (!services.agents) {
      throw new Error('Agents service not initialized');
    }
    agents = services.agents;
  });

  describe('getAll', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve the agent list with aggregate totals', async () => {
      const result = await agents.getAll(startTime, endTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length === 0) {
        throw new Error(
          'No agents in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const agent = result.items[0];
      expect(typeof agent.agentId).toBe('string');
      expect(typeof agent.agentName).toBe('string');
      expect(typeof agent.healthScore).toBe('number');
      expect(typeof agent.unitsQuantity).toBe('number');
      expect(typeof agent.lastRun).toBe('string');
      expect(Number.isNaN(new Date(agent.lastRun).getTime())).toBe(false);
    });

    it('should return paginated response with cursor navigation when pageSize is provided', async () => {
      const result = await agents.getAll(startTime, endTime, { pageSize: 2 });

      if (result.items.length === 0) {
        throw new Error(
          'No agents in the test tenant — cannot verify pagination. ' +
          'Run agents in the tenant or widen the window.',
        );
      }
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(typeof result.hasNextPage).toBe('boolean');
      expect(result.currentPage).toBe(1);
      if (result.hasNextPage) {
        expect(result.nextCursor).toBeDefined();
      }
    });

    it('should navigate to the next page via cursor', async () => {
      const first = await agents.getAll(startTime, endTime, { pageSize: 2 });

      if (!first.hasNextPage || !first.nextCursor) {
        throw new Error(
          'Need at least 3 agents in the tenant to verify cursor navigation.',
        );
      }

      const second = await agents.getAll(startTime, endTime, {
        cursor: first.nextCursor,
      });

      expect(second.items.length).toBeGreaterThan(0);
      expect(second.currentPage).toBe(2);
      expect(second.previousCursor).toBeDefined();
    });
  });

  describe('getErrors', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve a non-paginated list of errors', async () => {
      const result = await agents.getErrors(startTime, endTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length === 0) {
        throw new Error(
          'No errors in the test tenant for the configured window — ' +
          'cannot verify response shape. Run errored agents in the tenant or widen the window.',
        );
      }
      const error = result.items[0];
      expect(typeof error.type).toBe('string');
      expect(typeof error.description).toBe('string');
      expect(typeof error.agentId).toBe('string');
      expect(typeof error.count).toBe('number');
      expect(error.firstSeenJob).toBeDefined();
      expect(error.lastSeenJob).toBeDefined();
    });

    it('should return paginated response with cursor navigation when pageSize is provided', async () => {
      const result = await agents.getErrors(startTime, endTime, { pageSize: 2 });

      if (result.items.length === 0) {
        throw new Error(
          'No errors in the test tenant — cannot verify pagination. ' +
          'Run errored agents in the tenant or widen the window.',
        );
      }
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(typeof result.hasNextPage).toBe('boolean');
      expect(result.currentPage).toBe(1);
      if (result.hasNextPage) {
        expect(result.nextCursor).toBeDefined();
      }
    });

    it('should navigate to the next page via cursor', async () => {
      const first = await agents.getErrors(startTime, endTime, { pageSize: 2 });

      if (!first.hasNextPage || !first.nextCursor) {
        throw new Error(
          'Need at least 3 errors in the tenant to verify cursor navigation.',
        );
      }

      const second = await agents.getErrors(startTime, endTime, {
        cursor: first.nextCursor,
      });

      expect(second.items.length).toBeGreaterThan(0);
      expect(second.currentPage).toBe(2);
      expect(second.previousCursor).toBeDefined();
    });
  });

  describe('getTraceErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve a trace-level timeline of error counts grouped by error name', async () => {
      const result = await agents.getTraceErrorsTimeline(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const point = result.data[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await agents.getTraceErrorsTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getTraceLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve a trace-level latency timeline grouped by series', async () => {
      const result = await agents.getTraceLatencyTimeline(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const point = result.data[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await agents.getTraceLatencyTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getTraceUnitConsumption', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve per-agent trace-level unit consumption totals', async () => {
      const result = await agents.getTraceUnitConsumption(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const row = result.data[0];
        expect(typeof row.agentId).toBe('string');
        expect(typeof row.folderKey).toBe('string');
        expect(typeof row.agentVersion).toBe('string');
        expect(typeof row.agentUnitsConsumed).toBe('number');
        expect(typeof row.platformUnitsConsumed).toBe('number');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await agents.getTraceUnitConsumption(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getSpansByTraceId', () => {
    it('should retrieve the flat span array for a trace', async () => {
      const result = await agents.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'No spans for the configured TRACE_ID — cannot verify span shape. ' +
          'Point TRACE_ID at a trace that exists in the test tenant.',
        );
      }
      const span = result[0];
      expect(typeof span.id).toBe('string');
      expect(span.traceId).toBe(AGENT_TEST_CONSTANTS.TRACE_ID);
      expect(typeof span.name).toBe('string');
      expect(typeof span.startTime).toBe('string');
      expect(typeof span.attributes).toBe('string');
    });
  });

  describe('getSpansByReference', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve spans matching a reference id in the hierarchy', async () => {
      const result = await agents.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        const span = result.items[0];
        expect(typeof span.id).toBe('string');
        expect(typeof span.traceId).toBe('string');
        expect(typeof span.context === 'string' || span.context === null).toBe(true);
      }
    });

    it('should return a paginated response with cursor navigation when pageSize is provided', async () => {
      const result = await agents.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, {
        traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
        startTime,
        endTime,
        executionType: AgentExecutionType.Runtime,
        pageSize: 2,
      });

      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(typeof result.hasNextPage).toBe('boolean');
      expect(result.currentPage).toBe(1);
      if (result.hasNextPage) {
        expect(result.nextCursor).toBeDefined();
      }
    });
  });
});
