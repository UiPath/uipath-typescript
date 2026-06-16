// ===== IMPORTS =====
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '../../../../src/services/notification/notifications';
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
import { NOTIFICATION_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { createHeaders } from '../../../../src/utils/http/headers';
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
          transformFn: expect.any(Function),
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

    it('rewrites renamed SDK field names in OData options to API names before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      // Caller uses the SDK field name `hasRead` in the filter...
      await notificationService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID, {
        filter: 'hasRead eq false',
        orderby: 'publishedOn desc',
        pageSize: 20,
      });

      // ...and the service rewrites it to the API field name `isRead`.
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

  describe('response transformation', () => {
    it('strips internal fields and renames isRead → hasRead in the returned notifications', async () => {
      const raw: RawNotificationEntry = createBasicNotificationEntry();
      const before = JSON.stringify(raw);

      // Run the transform the service hands to PaginationHelpers against a raw
      // entry, so the transformation is exercised through getAll() rather than a
      // direct import of an internal helper.
      vi.mocked(PaginationHelpers.getAll).mockImplementation((config) => {
        const items = config.transformFn ? [config.transformFn(raw)] : [];
        return Promise.resolve({ items, totalCount: items.length });
      });

      const result = await notificationService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);
      const entry = result.items[0];

      // original untouched (shallow-copy semantics)
      expect(JSON.stringify(raw)).toBe(before);

      // every internal field stripped
      expect(entry).not.toHaveProperty('entityOrgName');
      expect(entry).not.toHaveProperty('entityTenantName');
      expect(entry).not.toHaveProperty('serviceRegistryName');
      expect(entry).not.toHaveProperty('messageTemplateKey');
      expect(entry).not.toHaveProperty('messageVersion');
      expect(entry).not.toHaveProperty('publicationId');
      expect(entry).not.toHaveProperty('correlationId');
      expect(entry).not.toHaveProperty('partitionKey');

      // public fields preserved with exact values
      expect(entry.id).toBe(NOTIFICATION_TEST_CONSTANTS.NOTIFICATION_ID);
      expect(entry.priority).toBe(NotificationPriority.High);
      expect(entry.category).toBe(NotificationCategory.Error);
      expect(entry.publishedOn).toBe(NOTIFICATION_TEST_CONSTANTS.PUBLISHED_ON);
      expect(entry.message).toBe(NOTIFICATION_TEST_CONSTANTS.MESSAGE);

      // API `isRead` is renamed to `hasRead` in the SDK response
      expect(entry.hasRead).toBe(false);
      expect(entry).not.toHaveProperty('isRead');
    });
  });
});

/**
 * Routing guard for the Notification service.
 *
 * The notification API routes at the ORGANIZATION level — its URLs must NOT
 * include the tenant segment that `ApiClient` injects (`{org}/{tenant}/{path}`)
 * for every other service. Routing relies on `NOTIFICATION_BASE`'s `../` prefix
 * collapsing the tenant segment via `new URL()` normalization.
 *
 * These tests exercise the REAL `ApiClient` with the REAL endpoint constant and
 * pin the resolved URL, so a future change to `ApiClient`'s URL construction (or
 * to `NOTIFICATION_BASE`) that silently breaks org-level routing fails here.
 *
 * NOTE: the suite above mocks `api-client`, so the real implementation is pulled
 * in via `vi.importActual` to exercise genuine URL construction.
 */
describe('Notification org-level URL routing', () => {
  let RealApiClient!: typeof ApiClient;
  const mockTokenManager = {
    getValidToken: vi.fn().mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN),
  };

  const mockConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
  };

  const mockExecutionContext = {};

  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};

  beforeAll(async () => {
    const actual = await vi.importActual<typeof import('../../../../src/core/http/api-client')>(
      '../../../../src/core/http/api-client'
    );
    RealApiClient = actual.ApiClient;
  });

  beforeEach(() => {
    capturedUrl = '';
    capturedHeaders = {};
    global.fetch = vi.fn().mockImplementation((url: string, options: { headers: Record<string, string> }) => {
      capturedUrl = url;
      capturedHeaders = { ...options.headers };
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ value: [], '@odata.count': 0 })),
      });
    });
  });

  function createClient() {
    return new RealApiClient(
      mockConfig as any,
      mockExecutionContext as any,
      mockTokenManager as any,
    );
  }

  it('drops the tenant segment for the notification endpoint (org-level routing)', async () => {
    const client = createClient();

    await client.get(NOTIFICATION_ENDPOINTS.GET_ALL);

    const expectedUrl =
      `${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.ORGANIZATION_ID}` +
      '/notificationservice_/notificationserviceapi/odata/v1/NotificationEntry';

    // Exact resolved URL: org segment present, tenant segment collapsed away.
    expect(capturedUrl).toBe(expectedUrl);
    // The tenant segment ApiClient injects must NOT survive in the path...
    expect(capturedUrl).not.toContain(`/${TEST_CONSTANTS.TENANT_ID}/`);
    // ...and the `..` must be resolved, never leaked into the final URL.
    expect(capturedUrl).not.toContain('..');
    // The org segment is still routed correctly.
    expect(capturedUrl).toContain(`/${TEST_CONSTANTS.ORGANIZATION_ID}/`);
  });

  it('forwards the acting tenant via the X-UIPATH-Internal-TenantId header, not the URL', async () => {
    const client = createClient();

    await client.get(NOTIFICATION_ENDPOINTS.GET_ALL, {
      headers: createHeaders({ [TENANT_ID]: NOTIFICATION_TEST_CONSTANTS.TENANT_ID }),
    });

    // The tenant GUID identifies the acting tenant via the header...
    expect(capturedHeaders[TENANT_ID]).toBe(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);
    // ...and must never appear in the org-level URL path.
    expect(capturedUrl).not.toContain(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);
  });
});
