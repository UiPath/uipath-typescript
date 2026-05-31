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
});
