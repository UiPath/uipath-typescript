import { describe, it, expect, beforeEach } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { AgentMonitoring } from '../../../../src/services/agents/monitoring';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Agent Monitoring - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let agentMonitoring: AgentMonitoring;
  let tenantId: string;

  beforeEach(() => {
    agentMonitoring = getServices().agentMonitoring!;
    const cfg = getTestConfig();
    if (!cfg.agentMonitoringTestTenantId) {
      throw new Error('AGENT_MONITORING_TEST_TENANT_ID is not set in .env.integration');
    }
    tenantId = cfg.agentMonitoringTestTenantId;
  });

  describe('getNames', () => {
    it('should retrieve all distinct agent names for the tenant', async () => {
      const result = await agentMonitoring.getNames(tenantId);

      expect(result).toBeDefined();
      expect(result.agents).toBeDefined();
      expect(Array.isArray(result.agents)).toBe(true);
      result.agents.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    it('should accept folderKeys option without error', async () => {
      const result = await agentMonitoring.getNames(tenantId, { folderKeys: [] });

      expect(result).toBeDefined();
      expect(Array.isArray(result.agents)).toBe(true);
    });
  });
});
