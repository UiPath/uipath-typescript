import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Governance } from '../../../../src/services/governance';
import { PolicyEvaluationResult } from '../../../../src/models/governance/governance.types';

const modes: InitMode[] = ['v1'];

// Skipped: the governance API is served by insightsrtm_, which rejects PAT tokens
// with 401 regardless of scopes and requires OAuth. Integration tests in CI
// authenticate with a PAT, so these would fail unconditionally. Re-enable by
// removing `.skip` once OAuth support is wired into the integration test harness.
describe.skip.each(modes)('Governance - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let governance!: Governance;
  // Start time wide enough to cover historical traces in the test tenant.
  const startTime = new Date('2024-01-01T00:00:00Z');

  beforeAll(() => {
    const service = getServices().governance;
    if (!service) {
      throw new Error('Governance service is not registered for this init mode');
    }
    governance = service;
  });

  describe('getPolicyTraces', () => {
    it('should retrieve traces without pagination options as a NonPaginatedResponse', async () => {
      const result = await governance.getPolicyTraces(startTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve traces with pagination options as a PaginatedResponse', async () => {
      const result = await governance.getPolicyTraces(startTime, { pageSize: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
      expect(typeof result.hasNextPage).toBe('boolean');
    });

    it('should support filtering by evaluationResult and fullOrganization', async () => {
      const result = await governance.getPolicyTraces(startTime, {
        evaluationResult: [PolicyEvaluationResult.Deny, PolicyEvaluationResult.SimulatedDeny],
        fullOrganization: true,
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should round-trip a cursor to fetch the next page', async () => {
      const page1 = await governance.getPolicyTraces(startTime, { pageSize: 1, fullOrganization: true });

      if (!page1.hasNextPage || !page1.nextCursor) {
        throw new Error(
          'Governance test tenant has fewer than 2 traces; cursor round-trip cannot be verified. Populate test data or widen startTime.',
        );
      }

      const page2 = await governance.getPolicyTraces(startTime, { cursor: page1.nextCursor });
      expect(page2).toBeDefined();
      expect(Array.isArray(page2.items)).toBe(true);
      expect(page2.currentPage).toBe(2);
    });
  });

  describe('getOperationSummary', () => {
    it('should retrieve aggregate enforcement counts as numbers', async () => {
      const result = await governance.getOperationSummary(startTime);

      expect(result).toBeDefined();
      expect(typeof result.totalEvaluations).toBe('number');
      expect(typeof result.allowedCount).toBe('number');
      expect(typeof result.deniedCount).toBe('number');
      expect(typeof result.noOpCount).toBe('number');
    });

    it('should support a bounded range across the whole organization', async () => {
      const result = await governance.getOperationSummary(startTime, {
        endTime: new Date(),
        fullOrganization: true,
      });

      expect(result).toBeDefined();
      expect(typeof result.totalEvaluations).toBe('number');
    });
  });
});
