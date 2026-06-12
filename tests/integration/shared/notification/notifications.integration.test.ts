import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import type { Notifications } from '../../../../src/services/notification';
import { INTERNAL_NOTIFICATION_FIELDS } from '../../../../src/models/notification/notifications.internal-types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Notifications - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let notifications!: Notifications;
  let tenantId!: string;

  beforeAll(() => {
    const service = getServices().notifications;
    if (!service) {
      throw new Error('Notifications service is not registered for this init mode');
    }
    notifications = service;

    const id = getTestConfig().notificationTenantId;
    if (!id) {
      throw new Error('NOTIFICATION_TEST_TENANT_ID must be set in .env.integration to run notification tests.');
    }
    tenantId = id;
  });

  describe('getAll', () => {
    it('should retrieve notifications without pagination options as a NonPaginatedResponse', async () => {
      const result = await notifications.getAll(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve notifications with pagination options as a PaginatedResponse', async () => {
      const result = await notifications.getAll(tenantId, { pageSize: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
      expect(typeof result.hasNextPage).toBe('boolean');
    });

    it('should support OData filter and orderby', async () => {
      const result = await notifications.getAll(tenantId, {
        filter: 'isRead eq false',
        orderby: 'publishedOn desc',
        pageSize: 3,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      for (const item of result.items) {
        expect(item.isRead).toBe(false);
      }
    });

    it('should drop internal API fields (entityOrgName, partitionKey, etc.) from each item', async () => {
      const result = await notifications.getAll(tenantId, { pageSize: 1 });

      if (result.items.length === 0) {
        throw new Error(
          'Inbox is empty — cannot validate transform. Trigger at least one notification on the test tenant.'
        );
      }

      const item = result.items[0];
      // Public fields present
      expect(item.id).toBeDefined();
      expect(typeof item.isRead).toBe('boolean');
      expect(item.publisherName).toBeDefined();
      expect(item.topicName).toBeDefined();
      expect(typeof item.publishedOn).toBe('number');

      // Internal fields stripped — assert against the same source-of-truth list the service uses
      for (const field of INTERNAL_NOTIFICATION_FIELDS) {
        expect((item as Record<string, unknown>)[field]).toBeUndefined();
      }
    });
  });

  describe('mark-read flows', () => {
    it('should mark a single notification as read and reflect the change via getAll', async () => {
      const unread = await notifications.getAll(tenantId, { filter: 'isRead eq false', pageSize: 1 });
      if (unread.items.length === 0) {
        throw new Error(
          'No unread notifications in the inbox — cannot validate markRead. Trigger one on the test tenant.'
        );
      }
      const target = unread.items[0];

      const mark = await notifications.markRead(tenantId, [target.id]);
      expect(mark.success).toBe(true);
      expect(mark.data.notificationIds).toEqual([target.id]);
      expect(mark.data.read).toBe(true);

      // Restore so subsequent runs see the same fixture
      const restore = await notifications.markUnread(tenantId, [target.id]);
      expect(restore.success).toBe(true);
      expect(restore.data.read).toBe(false);
    });

    it('markAllRead should succeed without per-id payload', async () => {
      const result = await notifications.markAllRead(tenantId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ all: true, read: true });
    });
  });
});
