import { describe, it, expect, beforeAll } from 'vitest';
import { UiPath } from '../../../../src/core';
import { GovernanceService } from '../../../../src/services/governance/governance';
import { loadIntegrationConfig } from '../../config/test-config';

/**
 * Governance integration tests.
 * These tests run against the live AutomationOps API (v1 only — no legacy v0 support).
 */
describe('Governance - Integration Tests [v1]', () => {
  let governance: GovernanceService;

  beforeAll(() => {
    const config = loadIntegrationConfig();
    const sdk = new UiPath({
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName,
      secret: config.secret,
    });

    if (!sdk.isAuthenticated()) {
      throw new Error('Governance integration tests: SDK initialization failed — check credentials.');
    }

    governance = new GovernanceService(sdk);
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should retrieve all policies from the live API', async () => {
      const policies = await governance.getAll();

      expect(Array.isArray(policies)).toBe(true);
    });

    it('should return policies with required metadata fields', async () => {
      const policies = await governance.getAll();

      if (policies.length === 0) {
        console.warn('No governance policies found — create at least one in Automation Ops first');
        return;
      }

      const policy = policies[0];
      expect(policy.identifier).toBeDefined();
      expect(typeof policy.identifier).toBe('string');
      expect(policy.name).toBeDefined();
      expect(typeof policy.name).toBe('string');
      expect(typeof policy.priority).toBe('number');
      expect(typeof policy.availability).toBe('number');
      expect(policy.product).toBeDefined();
      expect(policy.product.name).toBeDefined();
      expect(policy.product.label).toBeDefined();
    });

    it('should attach bound methods to each policy object', async () => {
      const policies = await governance.getAll();

      if (policies.length === 0) {
        console.warn('No governance policies found — skipping bound method check');
        return;
      }

      const policy = policies[0];
      expect(typeof policy.getSettings).toBe('function');
      expect(typeof policy.configure).toBe('function');
      expect(typeof policy.deploy).toBe('function');
    });
  });

  // ─── getSettings (via bound method) ──────────────────────────────────────

  describe('getSettings', () => {
    it('should retrieve settings for the first available policy', async () => {
      const policies = await governance.getAll();

      if (policies.length === 0) {
        console.warn('No governance policies found — skipping getSettings test');
        return;
      }

      const policy = policies[0];
      const settings = await policy.getSettings();

      expect(settings).toBeDefined();
      expect(settings.policyIdentifier).toBe(policy.identifier);
      expect(settings.settings).toBeDefined();
      expect(typeof settings.settings).toBe('object');
    });

    it('should validate transform: settings are returned as camelCase (no PascalCase leakage)', async () => {
      const policies = await governance.getAll();

      if (policies.length === 0) {
        console.warn('No governance policies found — skipping transform validation');
        return;
      }

      // Policy metadata fields should be camelCase
      const policy = policies[0];
      expect((policy as any).Identifier).toBeUndefined();
      expect((policy as any).Name).toBeUndefined();
      expect((policy as any).Priority).toBeUndefined();
      expect((policy as any).Product).toBeUndefined();

      // policyIdentifier in settings response should be camelCase
      const settings = await policy.getSettings();
      expect((settings as any).PolicyIdentifier).toBeUndefined();
    });
  });
});
