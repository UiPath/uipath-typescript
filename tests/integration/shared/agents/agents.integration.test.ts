import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Agents } from '../../../../src/services/agents';
import { AgentType, AgentExecutionType } from '../../../../src/models/agents/agents.types';
import { JobState } from '../../../../src/models/common/types';
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

  describe('getErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve the errors timeline', async () => {
      const result = await agents.getErrorsTimeline(startTime, endTime);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'No error timeline points in the test tenant for the configured window — ' +
          'cannot verify response shape. Run errored agents in the tenant or widen the window.',
        );
      }
      const point = result[0];
      expect(typeof point.name).toBe('string');
      expect(typeof point.value).toBe('number');
      expect(typeof point.date).toBe('string');
      expect(Number.isNaN(new Date(point.date).getTime())).toBe(false);
    });

    it('should apply the limit filter', async () => {
      const result = await agents.getErrorsTimeline(startTime, endTime, { limit: 1 });

      expect(Array.isArray(result)).toBe(true);
      const agentNames = new Set(result.map((point) => point.name));
      expect(agentNames.size).toBeLessThanOrEqual(1);
    });
  });

  describe('getConsumptionTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve the Agent Units consumption timeline', async () => {
      const result = await agents.getConsumptionTimeline(startTime, endTime);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'No consumption timeline points in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const point = result[0];
      expect(typeof point.timeSlice).toBe('string');
      expect(typeof point.aguConsumption).toBe('number');
    });

    it('should scope to a single folder', async () => {
      const result = await agents.getConsumptionTimeline(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve the per-percentile latency timeline', async () => {
      const result = await agents.getLatencyTimeline(startTime, endTime);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'No latency timeline points in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const point = result[0];
      expect(typeof point.name).toBe('string');
      expect(typeof point.value).toBe('number');
      expect(typeof point.date).toBe('string');
      expect(Number.isNaN(new Date(point.date).getTime())).toBe(false);
    });

    it('should scope to a single agent', async () => {
      const result = await agents.getLatencyTimeline(startTime, endTime, {
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTopErrorCount', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve top-N agents ranked by error count', async () => {
      const result = await agents.getTopErrorCount(startTime, endTime);

      expect(result).toBeDefined();
      // totalErrors and data are always present — 0 / [] when nothing matched.
      expect(typeof result.totalErrors).toBe('number');
      expect(result.totalErrors).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data.length === 0) {
        throw new Error(
          'No errored agents in the test tenant for the configured window — ' +
          'cannot verify response shape. Run errored agents in the tenant or widen the window.',
        );
      }
      const entry = result.data[0];
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.count).toBe('number');
      expect(typeof entry.agentId).toBe('string');
      expect(typeof entry.firstSeenJob.jobKey).toBe('string');
      expect(entry.lastSeenJob).toBeDefined();
    });

    it('should respect the limit option', async () => {
      const result = await agents.getTopErrorCount(startTime, endTime, { limit: 3 });

      if (result.data.length === 0) {
        throw new Error(
          'No errored agents in the test tenant for the configured window — ' +
          'cannot verify limit option. Run errored agents in the tenant or widen the window.',
        );
      }
      expect(result.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getTopConsumption', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve top-N consuming agents with aggregate totals', async () => {
      const result = await agents.getTopConsumption(startTime, endTime);

      expect(result).toBeDefined();
      // Window dates are echoed as .NET-formatted strings (not ISO)
      if (result.startDate !== undefined) expect(typeof result.startDate).toBe('string');
      if (typeof result.totalConsumed === 'number') {
        expect(result.totalConsumed).toBeGreaterThanOrEqual(0);
      }
      if (!result.agents || result.agents.length === 0) {
        throw new Error(
          'No consuming agents in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const agent = result.agents[0];
      expect(typeof agent.agentId).toBe('string');
      expect(typeof agent.agentName).toBe('string');
      expect(agent.firstSeenJob).toBeDefined();
      expect(agent.lastSeenJob).toBeDefined();
    });

    it('should accept a limit and an agentTypes filter', async () => {
      const result = await agents.getTopConsumption(startTime, endTime, {
        limit: 3,
        agentTypes: [AgentType.Autonomous],
      });

      expect(result).toBeDefined();
      if (result.agents && result.agents.length > 0) {
        expect(result.agents.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('getIncidentDistribution', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve incident counts across categories without a pagination field', async () => {
      const result = await agents.getIncidentDistribution(startTime, endTime);

      expect(result).toBeDefined();
      expect((result as { pagination?: unknown }).pagination).toBeUndefined();
      if (typeof result.errorCount === 'number') {
        expect(result.errorCount).toBeGreaterThanOrEqual(0);
      }
      if (typeof result.escalationCount === 'number') {
        expect(result.escalationCount).toBeGreaterThanOrEqual(0);
      }
      if (typeof result.policyCount === 'number') {
        expect(result.policyCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should scope to a single folder', async () => {
      const result = await agents.getIncidentDistribution(startTime, endTime, {
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve an aggregate summary with a per-agent breakdown', async () => {
      const result = await agents.getSummary(startTime, endTime);

      expect(result).toBeDefined();
      expect(result.lookbackPeriodSummary).toBeUndefined();
      if (!result.currentPeriodSummary) {
        throw new Error(
          'No summary data in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const period = result.currentPeriodSummary;
      expect(typeof period.totalJobs).toBe('number');
      expect(typeof period.successRate).toBe('number');
      expect(Array.isArray(period.agents)).toBe(true);
      // Every lastJobStatus must be normalized to a valid JobState — no raw
      // labels (e.g. 'Success', 'Cancelled') leaking through the transform.
      const validStates = new Set<string>(Object.values(JobState));
      for (const agent of period.agents) {
        expect(validStates.has(agent.lastJobStatus)).toBe(true);
      }
    });

    it('should include a lookback summary when requested', async () => {
      const result = await agents.getSummary(startTime, endTime, {
        lookbackPeriodAnalysis: true,
        executionType: AgentExecutionType.Runtime,
      });

      if (!result.currentPeriodSummary) {
        throw new Error(
          'No summary data in the test tenant for the configured window — ' +
          'cannot verify lookback. Run agents in the tenant or widen the window.',
        );
      }
      expect(result.lookbackPeriodSummary).toBeDefined();
    });
  });

  describe('getUnitConsumptionSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve an aggregate Agent Units and Platform Units summary with a per-agent breakdown', async () => {
      const result = await agents.getUnitConsumptionSummary(startTime, endTime);

      expect(result).toBeDefined();
      expect(result.lookbackPeriodSummary).toBeUndefined();
      if (!result.currentPeriodSummary) {
        throw new Error(
          'No unit-consumption summary in the test tenant for the configured window — ' +
          'cannot verify response shape. Run agents in the tenant or widen the window.',
        );
      }
      const period = result.currentPeriodSummary;
      expect(typeof period.totalAgentUnitConsumption.completeJobs).toBe('number');
      expect(typeof period.totalPlatformUnitConsumption.completeJobs).toBe('number');
      expect(Array.isArray(period.agentConsumption)).toBe(true);
    });

    it('should include a lookback summary when requested', async () => {
      const result = await agents.getUnitConsumptionSummary(startTime, endTime, {
        lookbackPeriodAnalysis: true,
        executionType: AgentExecutionType.Runtime,
      });

      if (!result.currentPeriodSummary) {
        throw new Error(
          'No unit-consumption summary in the test tenant for the configured window — ' +
          'cannot verify lookback. Run agents in the tenant or widen the window.',
        );
      }
      expect(result.lookbackPeriodSummary).toBeDefined();
    });
  });
});
