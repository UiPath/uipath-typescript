import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { AgentMonitoring } from '../../../../src/services/agents/monitoring';

/**
 * Integration tests for Agent Monitoring (`/insightsrtm_/Agents/*`).
 *
 * Required environment variables:
 *   AGENT_MONITORING_TEST_TENANT_ID - UUID of the tenant whose Agents will be listed
 *
 * Run with:
 *   npx vitest run tests/integration/shared/agents/monitoring.integration.test.ts --config vitest.integration.config.ts
 */

const hasAgentMonitoringConfig = !!process.env.AGENT_MONITORING_TEST_TENANT_ID;

const modes: InitMode[] = ['v1'];

describe.skipIf(!hasAgentMonitoringConfig).each(modes)(
  'Agent Monitoring - Integration Tests [%s]',
  (mode) => {
    setupUnifiedTests(mode);

    let agentMonitoring!: AgentMonitoring;
    let tenantId!: string;

    beforeAll(() => {
      const services = getServices();
      if (!services.agentMonitoring) {
        throw new Error('AgentMonitoring service not initialized');
      }
      agentMonitoring = services.agentMonitoring;
      tenantId = getTestConfig().agentMonitoringTestTenantId!;
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
  },
);
