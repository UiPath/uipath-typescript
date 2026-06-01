import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Agents } from '../../../../src/services/agents';
import { AgentType } from '../../../../src/models/agents/agents.types';
import { AGENT_TEST_CONSTANTS } from '../../../utils/constants';

/**
 * Integration tests for Agents (`/insightsrtm_/Agents/*`).
 *
 * Run with:
 *   npx vitest run tests/integration/shared/agents/agents.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

describe.each(modes)('Agents - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let agents!: Agents;

  beforeAll(() => {
    const services = getServices();
    if (!services.agents) {
      throw new Error('Agents service not initialized');
    }
    agents = services.agents;
  });

  describe('getNames', () => {
    it('should retrieve all distinct agent names for the tenant', async () => {
      const result = await agents.getNames();

      expect(result).toBeDefined();
      expect(result.agents).toBeDefined();
      expect(Array.isArray(result.agents)).toBe(true);
      result.agents.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    it('should accept folderKeys option without error', async () => {
      const result = await agents.getNames({ folderKeys: [] });

      expect(result).toBeDefined();
      expect(Array.isArray(result.agents)).toBe(true);
    });
  });

  describe('getErrorsTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve a timeline of error counts grouped by agent', async () => {
      const result = await agents.getErrorsTimeline(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const point = result.data[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
      }
    });

    it('should accept optional filters without error', async () => {
      const result = await agents.getErrorsTimeline(startTime, endTime, {
        folderKeys: [],
        limit: 5,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getTopErroredAgents', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve top-N agents ranked by error count', async () => {
      const result = await agents.getTopErroredAgents(startTime, endTime);

      expect(result).toBeDefined();
      if (typeof result.totalErrors === 'number') {
        expect(result.totalErrors).toBeGreaterThanOrEqual(0);
      }
      if (result.data && result.data.length > 0) {
        const entry = result.data[0];
        expect(typeof entry.name).toBe('string');
        expect(typeof entry.count).toBe('number');
        expect(typeof entry.agentId).toBe('string');
        expect(entry.firstSeenJob).toBeDefined();
        expect(typeof entry.firstSeenJob.jobKey).toBe('string');
        expect(typeof entry.firstSeenJob.folderKey).toBe('string');
        expect(entry.lastSeenJob).toBeDefined();
      }
    });

    it('should respect limit option', async () => {
      const result = await agents.getTopErroredAgents(startTime, endTime, {
        limit: 3,
      });

      if (!result.data || result.data.length === 0) {
        throw new Error(
          'No errored agents in the test tenant for the configured window — ' +
          'cannot verify limit option. Run errored agents in the tenant or widen the window.',
        );
      }
      expect(result.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getIncidents', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should return a non-paginated list of incidents when no pagination options are provided', async () => {
      const result = await agents.getIncidents(startTime, endTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      if (typeof result.totalErrorCount === 'number') {
        expect(result.totalErrorCount).toBeGreaterThanOrEqual(0);
      }
      if (result.items.length > 0) {
        const incident = result.items[0];
        expect(typeof incident.type).toBe('string');
        expect(typeof incident.description).toBe('string');
        expect(typeof incident.agentId).toBe('string');
        expect(typeof incident.jobKey).toBe('string');
        expect(typeof incident.firstSeen).toBe('string');
        expect(typeof incident.folderKey).toBe('string');
        expect(typeof incident.count).toBe('number');
        expect(incident.firstSeenJob).toBeDefined();
        expect(incident.lastSeenJob).toBeDefined();
      }
    });

    it('should return a paginated response with cursor navigation when pageSize is provided', async () => {
      const result = await agents.getIncidents(startTime, endTime, { pageSize: 2 });

      if (result.items.length === 0) {
        throw new Error(
          'No incidents in the test tenant for the configured window — ' +
          'cannot verify pagination. Run errored agents in the tenant or widen the window.',
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
      const first = await agents.getIncidents(startTime, endTime, { pageSize: 2 });

      if (!first.hasNextPage || !first.nextCursor) {
        throw new Error(
          'Need at least 3 incidents in the tenant to verify cursor navigation.',
        );
      }

      const second = await agents.getIncidents(startTime, endTime, {
        cursor: first.nextCursor,
      });

      expect(second.items.length).toBeGreaterThan(0);
      expect(second.currentPage).toBe(2);
      expect(second.previousCursor).toBeDefined();
    });
  });

  describe('getTopConsumingAgents', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve top-N consuming agents with aggregate totals', async () => {
      const result = await agents.getTopConsumingAgents(startTime, endTime);

      expect(result).toBeDefined();
      // Window dates are echoed as .NET-formatted strings (not ISO)
      if (result.startDate !== undefined) expect(typeof result.startDate).toBe('string');
      if (result.endDate !== undefined) expect(typeof result.endDate).toBe('string');
      if (typeof result.totalConsumed === 'number') {
        expect(result.totalConsumed).toBeGreaterThanOrEqual(0);
      }
      if (result.agents && result.agents.length > 0) {
        const agent = result.agents[0];
        expect(typeof agent.agentId).toBe('string');
        expect(typeof agent.agentName).toBe('string');
        expect(agent.firstSeenJob).toBeDefined();
        expect(agent.lastSeenJob).toBeDefined();
      }
    });

    it('should respect limit option', async () => {
      const result = await agents.getTopConsumingAgents(startTime, endTime, {
        limit: 3,
      });

      if (!result.agents || result.agents.length === 0) {
        throw new Error(
          'No consuming agents in the test tenant for the configured window — ' +
          'cannot verify limit option. Run agents in the tenant or widen the window.',
        );
      }
      expect(result.agents.length).toBeLessThanOrEqual(3);
      expect(result.limit).toBe(3);
    });

    it('should accept agentTypes filter (sent as comma-separated string)', async () => {
      const result = await agents.getTopConsumingAgents(startTime, endTime, {
        limit: 5,
        agentTypes: [AgentType.Autonomous, AgentType.Coded],
      });

      expect(result).toBeDefined();
      // The API may return any number of agents (or zero) depending on the type filter;
      // the contract here is only that the request was accepted without a 400.
    });
  });

  describe('getConsumptionTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve a timeline of AGU consumption', async () => {
      const result = await agents.getConsumptionTimeline(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const point = result.data[0];
        expect(typeof point.timeSlice).toBe('string');
        expect(typeof point.aguConsumption).toBe('number');
        // timeSlice should be an ISO 8601 string parseable by Date
        expect(Number.isNaN(new Date(point.timeSlice).getTime())).toBe(false);
      }
    });

    it('should accept folderKeys filter without error', async () => {
      const result = await agents.getConsumptionTimeline(startTime, endTime, {
        folderKeys: [],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve a latency timeline with percentile rows', async () => {
      const result = await agents.getLatencyTimeline(startTime, endTime);

      expect(result).toBeDefined();
      if (result.data && result.data.length > 0) {
        const point = result.data[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
        // date should be ISO 8601 parseable by Date
        expect(Number.isNaN(new Date(point.date).getTime())).toBe(false);
      }
    });

    it('should accept folderKeys filter without error', async () => {
      const result = await agents.getLatencyTimeline(startTime, endTime, {
        folderKeys: [],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getIncidentDistribution', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

    it('should retrieve incident counts across the three categories', async () => {
      const result = await agents.getIncidentDistribution(startTime, endTime);

      expect(result).toBeDefined();
      // SDK drops the vestigial wire-level `pagination` field
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

    it('should accept folderKeys filter without error', async () => {
      const result = await agents.getIncidentDistribution(startTime, endTime, {
        folderKeys: [],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getAll', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;

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
});
