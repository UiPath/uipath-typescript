// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class as a runtime value.
import { BusinessApps } from '../../../../src/services/maestro/business-apps';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicBusinessApp,
  createBusinessAppListResponse,
  BUSINESS_APP_TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const COLLECTION = MAESTRO_ENDPOINTS.BUSINESS_APPS.COLLECTION;
const BY_ID = MAESTRO_ENDPOINTS.BUSINESS_APPS.BY_ID(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);

// ===== TEST SUITE =====
describe('BusinessApps Service Unit Tests', () => {
  let businessAppsService: BusinessApps;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () {
      return mockApiClient as unknown as ApiClient;
    });

    businessAppsService = new BusinessApps(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should post the app to the collection route and return it', async () => {
      mockApiClient.post.mockResolvedValue(createBasicBusinessApp());

      const result = await businessAppsService.create(
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        COLLECTION,
        {
          name: BUSINESS_APP_TEST_CONSTANTS.NAME,
          description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          processKeys: [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
        },
        expect.anything()
      );
      expect(result.id).toBe(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);
      expect(result.name).toBe(BUSINESS_APP_TEST_CONSTANTS.NAME);
    });

    it('should send icon and color when supplied', async () => {
      mockApiClient.post.mockResolvedValue(createBasicBusinessApp());

      await businessAppsService.create(
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
        { icon: BUSINESS_APP_TEST_CONSTANTS.ICON, color: BUSINESS_APP_TEST_CONSTANTS.COLOR }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        COLLECTION,
        expect.objectContaining({
          icon: BUSINESS_APP_TEST_CONSTANTS.ICON,
          color: BUSINESS_APP_TEST_CONSTANTS.COLOR,
        }),
        expect.anything()
      );
    });

    it('should attach update and delete to the created app', async () => {
      mockApiClient.post.mockResolvedValue(createBasicBusinessApp());

      const result = await businessAppsService.create(
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
      );

      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
    });

    it('should reject a missing name before calling the API', async () => {
      await expect(
        businessAppsService.create('', BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION, [
          BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY,
        ])
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject a missing description before calling the API', async () => {
      await expect(
        businessAppsService.create(BUSINESS_APP_TEST_CONSTANTS.NAME, '', [
          BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY,
        ])
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject an empty processKeys list before calling the API', async () => {
      await expect(
        businessAppsService.create(
          BUSINESS_APP_TEST_CONSTANTS.NAME,
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          []
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate a duplicate-name conflict from the API', async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NAME_EXISTS)
      );

      await expect(
        businessAppsService.create(
          BUSINESS_APP_TEST_CONSTANTS.NAME,
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
        )
      ).rejects.toThrow(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NAME_EXISTS);
    });
  });

  describe('getAll', () => {
    it('should read apps from the businessApps field of the list response', async () => {
      mockApiClient.get.mockResolvedValue(createBusinessAppListResponse());

      const result = await businessAppsService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(COLLECTION, expect.anything());
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe(BUSINESS_APP_TEST_CONSTANTS.NAME);
      expect(result.items[1].name).toBe(BUSINESS_APP_TEST_CONSTANTS.NAME_ALT);
    });

    it('should attach update and delete to every listed app', async () => {
      mockApiClient.get.mockResolvedValue(createBusinessAppListResponse());

      const result = await businessAppsService.getAll();

      result.items.forEach(app => {
        expect(typeof app.update).toBe('function');
        expect(typeof app.delete).toBe('function');
      });
    });

    it('should send the page size as the pageSize query parameter and expose the next cursor', async () => {
      mockApiClient.get.mockResolvedValue(
        createBusinessAppListResponse({
          nextPage: BUSINESS_APP_TEST_CONSTANTS.NEXT_PAGE_TOKEN,
          hasMoreResults: true,
        })
      );

      const result = await businessAppsService.getAll({ pageSize: 20 });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.pageSize).toBe(20);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should send a follow-up page as the nextPage query parameter', async () => {
      mockApiClient.get.mockResolvedValueOnce(
        createBusinessAppListResponse({
          nextPage: BUSINESS_APP_TEST_CONSTANTS.NEXT_PAGE_TOKEN,
          hasMoreResults: true,
        })
      );
      const firstPage = await businessAppsService.getAll({ pageSize: 20 });

      mockApiClient.get.mockResolvedValueOnce(createBusinessAppListResponse());
      await businessAppsService.getAll({ cursor: firstPage.nextCursor });

      const spec = mockApiClient.get.mock.calls[1][1] as { params: Record<string, unknown> };
      expect(spec.params.nextPage).toBe(BUSINESS_APP_TEST_CONSTANTS.NEXT_PAGE_TOKEN);
    });

    it('should report no further pages when the token is null', async () => {
      mockApiClient.get.mockResolvedValue(createBusinessAppListResponse());

      const result = await businessAppsService.getAll({ pageSize: 20 });

      expect(result.hasNextPage).toBe(false);
    });

    it('should not support jumpToPage on a token-paginated list', async () => {
      await expect(businessAppsService.getAll({ jumpToPage: 2 })).rejects.toThrow(/jumpToPage/);
    });

    it('should propagate an API failure', async () => {
      mockApiClient.get.mockRejectedValue(createMockError());

      await expect(businessAppsService.getAll()).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should request the single-app route and return the app', async () => {
      mockApiClient.get.mockResolvedValue(createBasicBusinessApp());

      const result = await businessAppsService.getById(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(BY_ID, expect.anything());
      expect(result.id).toBe(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);
      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
    });

    it('should rename the timestamp and modifier fields and drop the wire names', async () => {
      mockApiClient.get.mockResolvedValue(createBasicBusinessApp());

      const result = await businessAppsService.getById(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);

      expect(result.createdTime).toBe(BUSINESS_APP_TEST_CONSTANTS.CREATED_TIME);
      expect(result.lastModifiedTime).toBe(BUSINESS_APP_TEST_CONSTANTS.MODIFIED_TIME);
      expect(result.lastModifiedBy).toBe(BUSINESS_APP_TEST_CONSTANTS.USER_ID);
      expect((result as Record<string, unknown>).createdTimeUtc).toBeUndefined();
      expect((result as Record<string, unknown>).modifiedTimeUtc).toBeUndefined();
      expect((result as Record<string, unknown>).modifiedBy).toBeUndefined();
    });

    it('should preserve a null icon and color', async () => {
      mockApiClient.get.mockResolvedValue(createBasicBusinessApp({ icon: null, color: null }));

      const result = await businessAppsService.getById(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);

      expect(result.icon).toBeNull();
      expect(result.color).toBeNull();
    });

    it('should reject an empty id before calling the API', async () => {
      await expect(businessAppsService.getById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate a not-found failure', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NOT_FOUND)
      );

      await expect(
        businessAppsService.getById(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID)
      ).rejects.toThrow(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NOT_FOUND);
    });
  });

  describe('updateById', () => {
    it('should put the full replacement body to the single-app route', async () => {
      mockApiClient.put.mockResolvedValue(
        createBasicBusinessApp({ description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION_UPDATED })
      );

      const result = await businessAppsService.updateById(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION_UPDATED,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY, BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY_ALT]
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        BY_ID,
        {
          name: BUSINESS_APP_TEST_CONSTANTS.NAME,
          description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION_UPDATED,
          processKeys: [
            BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY,
            BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY_ALT,
          ],
        },
        expect.anything()
      );
      expect(result.description).toBe(BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION_UPDATED);
    });

    it('should omit icon and color from the body when not supplied, clearing them', async () => {
      mockApiClient.put.mockResolvedValue(createBasicBusinessApp({ icon: null, color: null }));

      await businessAppsService.updateById(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
      );

      const body = mockApiClient.put.mock.calls[0][1] as Record<string, unknown>;
      expect(body).not.toHaveProperty('icon');
      expect(body).not.toHaveProperty('color');
    });

    it('should reject an empty id before calling the API', async () => {
      await expect(
        businessAppsService.updateById(
          '',
          BUSINESS_APP_TEST_CONSTANTS.NAME,
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should reject an empty name before calling the API', async () => {
      await expect(
        businessAppsService.updateById(
          BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
          '',
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should reject an empty description before calling the API', async () => {
      await expect(
        businessAppsService.updateById(
          BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
          BUSINESS_APP_TEST_CONSTANTS.NAME,
          '',
          [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should reject an empty processKeys list before calling the API', async () => {
      await expect(
        businessAppsService.updateById(
          BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
          BUSINESS_APP_TEST_CONSTANTS.NAME,
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          []
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate a duplicate-name conflict from the API', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NAME_EXISTS)
      );

      await expect(
        businessAppsService.updateById(
          BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
          BUSINESS_APP_TEST_CONSTANTS.NAME_ALT,
          BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
          [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]
        )
      ).rejects.toThrow(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NAME_EXISTS);
    });
  });

  describe('deleteById', () => {
    it('should delete the single-app route and resolve with nothing', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      const result = await businessAppsService.deleteById(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(BY_ID, expect.anything());
      expect(result).toBeUndefined();
    });

    it('should reject an empty id before calling the API', async () => {
      await expect(businessAppsService.deleteById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should propagate a not-found failure', async () => {
      mockApiClient.delete.mockRejectedValue(
        createMockError(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NOT_FOUND)
      );

      await expect(
        businessAppsService.deleteById(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID)
      ).rejects.toThrow(BUSINESS_APP_TEST_CONSTANTS.ERROR_BUSINESS_APP_NOT_FOUND);
    });
  });
});
