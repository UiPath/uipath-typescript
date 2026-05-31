import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Agents } from '../../../../src/services/agents';

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
});
