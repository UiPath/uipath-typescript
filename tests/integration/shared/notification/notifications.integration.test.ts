import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Notifications } from '../../../../src/services/notification';
import { NotificationGetResponse } from '../../../../src/models/notification';

// New modular service — v1 init only.
const modes: InitMode[] = ['v1'];

// skip: the notification API requires OAuth and the current integration test
// framework only authenticates with a PAT token. Re-enable by removing `.skip`
// once OAuth support is wired into the integration test harness.
describe.skip.each(modes)('Notifications - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let notifications!: Notifications;
  let tenantId!: string;

  beforeAll(() => {
    const service = getServices().notifications;
    if (!service) {
      throw new Error('Notifications service is not registered for this init mode');
    }
    notifications = service;

    const configuredTenantId = getTestConfig().tenantId;
    if (!configuredTenantId) {
      throw new Error(
        'UIPATH_TENANT_ID_DEV is not configured. Set it to the acting tenant GUID ' +
          'so the notification inbox can be queried.',
      );
    }
    tenantId = configuredTenantId;
  });

  const ORDER_BY = 'publishedOn desc';

  describe('getAll', () => {
    it('should retrieve notifications with pagination options as a PaginatedResponse', async () => {
      const result = await notifications.getAll(tenantId, { pageSize: 5, orderby: ORDER_BY });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.currentPage).toBe(1);
      // OFFSET pagination supports jumping to an arbitrary page.
      expect(result.supportsPageJump).toBe(true);
      expect(typeof result.hasNextPage).toBe('boolean');
    });

    it('should filter using the SDK field name `hasRead` (rewritten to the API `isRead`)', async () => {
      const result = await notifications.getAll(tenantId, {
        filter: 'hasRead eq false',
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Every returned entry must respect the filter.
      for (const item of result.items) {
        expect(item.hasRead).toBe(false);
      }
    });

    it('should order by publishedOn descending', async () => {
      const result = await notifications.getAll(tenantId, {
        orderby: 'publishedOn desc',
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].publishedOn).toBeGreaterThanOrEqual(result.items[i].publishedOn);
      }
    });

    it('should round-trip a cursor to fetch the next page', async () => {
      const page1 = await notifications.getAll(tenantId, { pageSize: 1, orderby: ORDER_BY });

      if (!page1.hasNextPage || !page1.nextCursor) {
        throw new Error(
          'Test tenant has fewer than 2 notifications; cursor round-trip cannot be verified. ' +
            'Populate the inbox with test data.',
        );
      }

      const page2 = await notifications.getAll(tenantId, { cursor: page1.nextCursor, orderby: ORDER_BY });
      expect(page2).toBeDefined();
      expect(Array.isArray(page2.items)).toBe(true);
      expect(page2.currentPage).toBe(2);
    });

    it('should strip internal fields and apply the isRead → hasRead rename', async () => {
      const result = await notifications.getAll(tenantId, { pageSize: 1, orderby: ORDER_BY });

      if (result.items.length === 0) {
        throw new Error(
          'Test tenant has no notifications; transform validation cannot be verified. ' +
            'Populate the inbox with test data.',
        );
      }

      const entry: NotificationGetResponse = result.items[0];

      // (a) Public fields present with correct types.
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.hasRead).toBe('boolean');
      expect(typeof entry.publishedOn).toBe('number');

      // (b) API field `isRead` is renamed away.
      expect(entry).not.toHaveProperty('isRead');

      // (c) Internal/transport-layer fields are stripped.
      expect(entry).not.toHaveProperty('entityOrgName');
      expect(entry).not.toHaveProperty('entityTenantName');
      expect(entry).not.toHaveProperty('serviceRegistryName');
      expect(entry).not.toHaveProperty('messageTemplateKey');
      expect(entry).not.toHaveProperty('messageVersion');
      expect(entry).not.toHaveProperty('publicationId');
      expect(entry).not.toHaveProperty('correlationId');
      expect(entry).not.toHaveProperty('partitionKey');
    });
  });

  describe('mark-read flows', () => {
    it('should mark a single notification as read and reflect the change via getAll', async () => {
      const unread = await notifications.getAll(tenantId, { filter: 'hasRead eq false', pageSize: 1 });
      if (unread.items.length === 0) {
        throw new Error(
          'No unread notifications in the inbox — cannot validate markAsRead. Trigger one on the test tenant.'
        );
      }
      const target = unread.items[0];

      const mark = await notifications.markAsRead(tenantId, [target.id]);
      expect(mark.success).toBe(true);
      expect(mark.data.notificationIds).toEqual([target.id]);
      expect(mark.data.read).toBe(true);

      // Restore so subsequent runs see the same fixture
      const restore = await notifications.markAsUnread(tenantId, [target.id]);
      expect(restore.success).toBe(true);
      expect(restore.data.read).toBe(false);
    });

    it('markAllAsRead should succeed without per-id payload', async () => {
      // Snapshot one unread notification before the bulk operation so we can restore inbox state.
      const preSnapshot = await notifications.getAll(tenantId, { filter: 'hasRead eq false', pageSize: 1 });

      const result = await notifications.markAllAsRead(tenantId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ all: true, read: true });

      // Restore so subsequent runs can still find unread notifications for the markAsRead test.
      if (preSnapshot.items.length > 0) {
        await notifications.markAsUnread(tenantId, [preSnapshot.items[0].id]);
      }
    });
  });
});
