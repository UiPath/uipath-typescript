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
});
