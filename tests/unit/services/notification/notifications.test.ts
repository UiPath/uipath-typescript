// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationService,
  stripInternalNotificationFields,
} from '../../../../src/services/notification/notifications';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createBasicNotificationEntry,
  NOTIFICATION_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { TENANT_ID } from '../../../../src/utils/constants/headers';
import { NotificationCategory, NotificationPriority } from '../../../../src/models/notification';
import type { RawNotificationEntry } from '../../../../src/models/notification/notifications.internal-types';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => import('../../../utils/mocks/core'));

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// Shorthand for asserting the tenant header is forwarded on each call
const TENANT_HEADER = { [TENANT_ID]: NOTIFICATION_TEST_CONSTANTS.TENANT_ID };

// ===== TEST SUITE =====
describe('NotificationService Unit Tests', () => {
  let notificationService: NotificationService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    vi.mocked(PaginationHelpers.getAll).mockReset();

    notificationService = new NotificationService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return a list of notifications via PaginationHelpers with OData pagination params and tenant header', async () => {
      const items = [createBasicNotificationEntry()];
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items, totalCount: 1 });

      const result = await notificationService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);

      expect(result.items.length).toBe(1);
      expect(result.totalCount).toBe(1);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          headers: TENANT_HEADER,
          transformFn: stripInternalNotificationFields,
          pagination: expect.objectContaining({
            itemsField: 'value',
            totalCountField: '@odata.count',
            paginationParams: expect.objectContaining({
              pageSizeParam: '$top',
              offsetParam: '$skip',
              countParam: '$count',
            }),
          }),
        }),
        undefined
      );
    });

    it('should pass query/pagination options through to PaginationHelpers', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await notificationService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID, {
        filter: 'isRead eq false',
        orderby: 'publishedOn desc',
        pageSize: 20,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.anything(),
        { filter: 'isRead eq false', orderby: 'publishedOn desc', pageSize: 20 }
      );
    });

    it('should propagate errors from PaginationHelpers', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(
        notificationService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('stripInternalNotificationFields', () => {
    it('removes all 8 internal fields without mutating the original', () => {
      const raw: RawNotificationEntry = createBasicNotificationEntry();
      const before = JSON.stringify(raw);

      const stripped = stripInternalNotificationFields(raw);

      // original untouched (shallow-copy semantics)
      expect(JSON.stringify(raw)).toBe(before);

      // every internal field stripped
      expect(stripped).not.toHaveProperty('entityOrgName');
      expect(stripped).not.toHaveProperty('entityTenantName');
      expect(stripped).not.toHaveProperty('serviceRegistryName');
      expect(stripped).not.toHaveProperty('messageTemplateKey');
      expect(stripped).not.toHaveProperty('messageVersion');
      expect(stripped).not.toHaveProperty('publicationId');
      expect(stripped).not.toHaveProperty('correlationId');
      expect(stripped).not.toHaveProperty('partitionKey');

      // public fields preserved with exact values
      expect(stripped.id).toBe(NOTIFICATION_TEST_CONSTANTS.NOTIFICATION_ID);
      expect(stripped.priority).toBe(NotificationPriority.High);
      expect(stripped.category).toBe(NotificationCategory.Error);
      expect(stripped.publishedOn).toBe(NOTIFICATION_TEST_CONSTANTS.PUBLISHED_ON);
      expect(stripped.message).toBe(NOTIFICATION_TEST_CONSTANTS.MESSAGE);
      expect(stripped.isRead).toBe(false);
    });
  });
});
