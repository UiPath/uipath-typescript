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

  describe('getTraces', () => {
    it('should retrieve traces without pagination options as a NonPaginatedResponse', async () => {
      const result = await governance.getTraces(startTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve traces with pagination options as a PaginatedResponse', async () => {
      const result = await governance.getTraces(startTime, { pageSize: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
      expect(typeof result.hasNextPage).toBe('boolean');
    });

    it('should support filtering by evaluationResult and fullOrganization', async () => {
      const result = await governance.getTraces(startTime, {
        evaluationResult: [PolicyEvaluationResult.Deny, PolicyEvaluationResult.SimulatedDeny],
        fullOrganization: true,
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should round-trip a cursor to fetch the next page', async () => {
      const page1 = await governance.getTraces(startTime, { pageSize: 1, fullOrganization: true });

      if (!page1.hasNextPage || !page1.nextCursor) {
        throw new Error(
          'Governance test tenant has fewer than 2 traces; cursor round-trip cannot be verified. Populate test data or widen startTime.',
        );
      }

      const page2 = await governance.getTraces(startTime, { cursor: page1.nextCursor });
      expect(page2).toBeDefined();
      expect(Array.isArray(page2.items)).toBe(true);
      expect(page2.currentPage).toBe(2);
    });

    it('should transform API fields - camelCase fields present, PascalCase fields absent on items', async () => {
      const result = await governance.getTraces(startTime, { pageSize: 5, fullOrganization: true });

      if (result.items.length === 0) {
        throw new Error(
          'Governance test tenant has no traces; PascalCase-leak check cannot run. Populate test data or widen startTime.',
        );
      }

      const item = result.items[0];

      // PascalCase fields must NOT leak through the transform
      expect((item as any).TenantId).toBeUndefined();
      expect((item as any).PolicyId).toBeUndefined();
      expect((item as any).PolicyName).toBeUndefined();
      expect((item as any).StartTime).toBeUndefined();
      expect((item as any).FolderKey).toBeUndefined();
      expect((item as any).TraceId).toBeUndefined();
    });
  });
});
