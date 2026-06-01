import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Agents } from '../../../../src/services/agents';
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
});
