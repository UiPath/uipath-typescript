import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../../config/unified-setup';
import { AgentTraces } from '../../../../../src/services/observability/traces/agent';
import {
  AgentTraceExecutionType,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
  AgentGovernanceSection,
} from '../../../../../src/models/observability/traces/agent/agent.types';
import { AGENT_TEST_CONSTANTS } from '../../../../utils/constants';

/**
 * Integration tests for Agent Traces (`/insightsrtm_/Traceview/*`).
 *
 * Run with:
 *   npx vitest run tests/integration/shared/observability/traces/agent.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

// skip: insightsrtm_ endpoints reject PAT tokens entirely (401 regardless of scopes) and require OAuth.
// Skipped at the outer level so the live-auth setup (setupUnifiedTests + beforeAll) does not run.
describe.skip.each(modes)('Agent Traces - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let trace!: AgentTraces;

  beforeAll(() => {
    const service = getServices().agentTraces;
    if (!service) {
      throw new Error('Agent Traces service is not registered for this init mode');
    }
    trace = service;
  });

  describe('getErrorsTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve a trace-level timeline of error counts grouped by error name', async () => {
      const result = await trace.getErrorsTimeline({ startTime, endTime });

      expect(result).toBeDefined();
      if (result.length > 0) {
        const point = result[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await trace.getErrorsTimeline({
        startTime,
        endTime,
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getLatencyTimeline', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve a trace-level latency timeline grouped by series', async () => {
      const result = await trace.getLatencyTimeline({ startTime, endTime });

      expect(result).toBeDefined();
      if (result.length > 0) {
        const point = result[0];
        expect(typeof point.name).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(typeof point.date).toBe('string');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await trace.getLatencyTimeline({
        startTime,
        endTime,
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getUnitConsumption', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve per-agent trace-level unit consumption totals', async () => {
      const result = await trace.getUnitConsumption({ startTime, endTime });

      expect(result).toBeDefined();
      if (result.length > 0) {
        const row = result[0];
        expect(typeof row.agentId).toBe('string');
        expect(typeof row.folderKey).toBe('string');
        expect(typeof row.agentVersion).toBe('string');
        expect(typeof row.agentUnitsConsumed).toBe('number');
        expect(typeof row.platformUnitsConsumed).toBe('number');
      }
    });

    it('should accept Traceview-shaped filters without error', async () => {
      const result = await trace.getUnitConsumption({
        startTime,
        endTime,
        folderKeys: [AGENT_TEST_CONSTANTS.FOLDER_KEY_1],
        agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
        agentVersion: AGENT_TEST_CONSTANTS.AGENT_VERSION,
        executionType: AgentTraceExecutionType.Runtime,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getSpansByTraceId', () => {
    it('should retrieve the flat span array for a trace', async () => {
      const result = await trace.getSpansByTraceId(AGENT_TEST_CONSTANTS.TRACE_ID);

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
      const result = await trace.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID);

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
      const result = await trace.getSpansByReference(AGENT_TEST_CONSTANTS.REFERENCE_ID, {
        traceId: AGENT_TEST_CONSTANTS.TRACE_ID,
        startTime,
        endTime,
        executionType: AgentTraceExecutionType.Runtime,
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

  describe('getGovernanceChecks', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);
    const validModes = new Set<string>(Object.values(AgentGovernanceMode));
    const validVerdicts = new Set<string>(Object.values(AgentGovernanceVerdict));

    it('should retrieve agentic-governance decision rows with mode/verdict normalized to enums', async () => {
      const result = await trace.getGovernanceChecks(startTime, { endTime });

      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length === 0) {
        throw new Error(
          'No governance decision rows in the test tenant for the configured window — ' +
          'cannot verify response shape. Run governed agents in the tenant or widen the window.',
        );
      }
      const row = result.items[0];
      expect(typeof row.startTime).toBe('string');
      // mode/verdict are normalized to enum members (never a raw label).
      expect(validModes.has(row.mode)).toBe(true);
      expect(validVerdicts.has(row.evaluatorResult)).toBe(true);
      // actionApplied is the raw enforcement action — a string, or null in audit mode.
      expect(row.actionApplied === null || typeof row.actionApplied === 'string').toBe(true);
    });

    it('should return a paginated response with cursor navigation when pageSize is provided', async () => {
      const result = await trace.getGovernanceChecks(startTime, { endTime, violationsOnly: true, pageSize: 2 });

      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(typeof result.hasNextPage).toBe('boolean');
      expect(result.currentPage).toBe(1);
      if (result.hasNextPage) {
        expect(result.nextCursor).toBeDefined();
      }
    });
  });

  describe('getGovernanceSummary', () => {
    const startTime = new Date(AGENT_TEST_CONSTANTS.START_TIME);
    const endTime = new Date(AGENT_TEST_CONSTANTS.END_TIME);

    it('should retrieve the aggregated posture with default breakdowns present', async () => {
      const result = await trace.getGovernanceSummary(startTime, { endTime });

      expect(typeof result.total).toBe('number');
      expect(typeof result.violations).toBe('number');
      expect(Array.isArray(result.byHook)).toBe(true);
      expect(Array.isArray(result.byAgent)).toBe(true);
      expect(Array.isArray(result.byPolicy)).toBe(true);
      expect(Array.isArray(result.byPack)).toBe(true);
      // Opt-in breakdowns are always present, but empty unless requested.
      expect(Array.isArray(result.byAction)).toBe(true);
      expect(Array.isArray(result.byMode)).toBe(true);
    });

    it('should include the opt-in action and mode breakdowns when requested', async () => {
      const result = await trace.getGovernanceSummary(startTime, {
        endTime,
        topN: 5,
        sections: [AgentGovernanceSection.Action, AgentGovernanceSection.Mode],
      });

      expect(Array.isArray(result.byAction)).toBe(true);
      expect(Array.isArray(result.byMode)).toBe(true);
    });
  });
});
