import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import type { Subscriptions } from '../../../../src/services/notification';
import { NotificationMode, type SubscriptionPublisher } from '../../../../src/models/notification';

const modes: InitMode[] = ['v1'];

// skip: the subscription API requires OAuth and the current integration test
// framework only authenticates with a PAT token. Re-enable by removing `.skip`
// once OAuth support is wired into the integration test harness.
describe.skip.each(modes)('Subscriptions - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let subscriptions!: Subscriptions;
  let tenantId!: string;
  let allPublishers!: SubscriptionPublisher[];
  let firstPublisher!: SubscriptionPublisher;

  beforeAll(async () => {
    const service = getServices().subscriptions;
    if (!service) {
      throw new Error('Subscriptions service is not registered for this init mode');
    }
    subscriptions = service;

    const configuredTenantId = getTestConfig().tenantId;
    if (!configuredTenantId) {
      throw new Error(
        'UIPATH_TENANT_ID_DEV is not configured. Set it to the acting tenant GUID ' +
          'so subscription preferences can be queried.',
      );
    }
    tenantId = configuredTenantId;

    const { publishers } = await subscriptions.getAll(tenantId);
    if (publishers.length === 0) {
      throw new Error('No publishers visible to the test user — cannot run subscription tests.');
    }
    allPublishers = publishers;
    firstPublisher = publishers[0];
  });

  describe('getAll', () => {
    it('should return the user\'s publishers + topics + subscription state', () => {
      expect(firstPublisher).toBeDefined();
      expect(firstPublisher.id).toBeDefined();
      expect(firstPublisher.name).toBeDefined();
      expect(Array.isArray(firstPublisher.topics)).toBe(true);
      expect(Array.isArray(firstPublisher.modes)).toBe(true);
      expect(typeof firstPublisher.isUserOptin).toBe('boolean');
    });

    it('should support filtering by a single publisher name', async () => {
      const { publishers } = await subscriptions.getAll(tenantId, { publishers: [firstPublisher.name] });

      expect(publishers.length).toBeGreaterThanOrEqual(1);
      for (const p of publishers) {
        expect(p.name).toBe(firstPublisher.name);
      }
    });

    it('should support filtering by multiple publisher names', async () => {
      if (allPublishers.length < 2) {
        throw new Error('At least 2 visible publishers are required to test multi-publisher filtering.');
      }
      // Verifies the array query param (Publishers) is serialized and forwarded to the API
      // correctly — getAll() is the first SDK method to pass an array as a query param.
      const requestedNames = allPublishers.slice(0, 2).map(p => p.name);

      const { publishers } = await subscriptions.getAll(tenantId, { publishers: requestedNames });

      expect(publishers.length).toBe(requestedNames.length);
      expect(publishers.map(p => p.name).sort()).toEqual([...requestedNames].sort());
    });
  });

  describe('getPublishers', () => {
    it('should list available publishers with discovery-only fields', async () => {
      const { publishers } = await subscriptions.getPublishers(tenantId);

      expect(Array.isArray(publishers)).toBe(true);
      expect(publishers.length).toBeGreaterThan(0);
      const p = publishers[0];
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(Array.isArray(p.topics)).toBe(true);
    });

    it('should support filtering by publisher name', async () => {
      const { publishers } = await subscriptions.getPublishers(tenantId, { name: firstPublisher.name });

      expect(publishers.length).toBeGreaterThanOrEqual(1);
      expect(publishers[0].name).toBe(firstPublisher.name);
    });
  });

  describe('getSupportedChannels', () => {
    it('should return supported channels for the tenant (excluding implicit InApp)', async () => {
      const { channels } = await subscriptions.getSupportedChannels(tenantId);

      expect(Array.isArray(channels)).toBe(true);
      // InApp is always implicit; the endpoint shouldn't list it
      expect(channels.map(c => c.name)).not.toContain(NotificationMode.InApp);
      for (const channel of channels) {
        expect(channel.name).toBeDefined();
        expect(typeof channel.isEnabled).toBe('boolean');
      }
    });
  });
});
