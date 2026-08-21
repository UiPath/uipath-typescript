// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBusinessAppWithMethods } from '../../../../src/models/maestro/business-apps.models';
import type {
  BusinessAppGetResponse,
  BusinessAppsServiceModel,
} from '../../../../src/models/maestro/business-apps.models';
import type { RawBusinessAppGetResponse } from '../../../../src/models/maestro/business-apps.types';
import { BUSINESS_APP_TEST_CONSTANTS } from '../../../utils/constants/business-apps';

// ===== HELPERS =====
const createRawBusinessApp = (
  overrides?: Partial<RawBusinessAppGetResponse>
): RawBusinessAppGetResponse => ({
  id: BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
  name: BUSINESS_APP_TEST_CONSTANTS.NAME,
  description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
  icon: BUSINESS_APP_TEST_CONSTANTS.ICON,
  color: BUSINESS_APP_TEST_CONSTANTS.COLOR,
  processKeys: [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
  createdBy: BUSINESS_APP_TEST_CONSTANTS.USER_ID,
  createdTime: BUSINESS_APP_TEST_CONSTANTS.CREATED_TIME,
  lastModifiedBy: BUSINESS_APP_TEST_CONSTANTS.USER_ID,
  lastModifiedTime: BUSINESS_APP_TEST_CONSTANTS.MODIFIED_TIME,
  ...overrides,
});

// ===== TEST SUITE =====
describe('Business App Model Unit Tests', () => {
  let mockService: BusinessAppsServiceModel;
  let businessApp: BusinessAppGetResponse;

  beforeEach(() => {
    mockService = {
      create: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
    } as unknown as BusinessAppsServiceModel;

    businessApp = createBusinessAppWithMethods(createRawBusinessApp(), mockService);
  });

  describe('createBusinessAppWithMethods', () => {
    it('should preserve every raw field on the returned app', () => {
      expect(businessApp.id).toBe(BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID);
      expect(businessApp.name).toBe(BUSINESS_APP_TEST_CONSTANTS.NAME);
      expect(businessApp.description).toBe(BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION);
      expect(businessApp.processKeys).toEqual([BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY]);
      expect(businessApp.createdTime).toBe(BUSINESS_APP_TEST_CONSTANTS.CREATED_TIME);
      expect(businessApp.lastModifiedTime).toBe(BUSINESS_APP_TEST_CONSTANTS.MODIFIED_TIME);
    });

    it('should attach update and delete', () => {
      expect(typeof businessApp.update).toBe('function');
      expect(typeof businessApp.delete).toBe('function');
    });
  });

  describe('update', () => {
    it("should delegate to updateById with the app's own id", async () => {
      await businessApp.update(BUSINESS_APP_TEST_CONSTANTS.NAME_ALT, [
        BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY_ALT,
      ]);

      expect(mockService.updateById).toHaveBeenCalledWith(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
        BUSINESS_APP_TEST_CONSTANTS.NAME_ALT,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY_ALT],
        undefined
      );
    });

    it('should forward description, icon and color options', async () => {
      const options = {
        description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
        icon: BUSINESS_APP_TEST_CONSTANTS.ICON,
        color: BUSINESS_APP_TEST_CONSTANTS.COLOR,
      };

      await businessApp.update(
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
        options
      );

      expect(mockService.updateById).toHaveBeenCalledWith(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
        BUSINESS_APP_TEST_CONSTANTS.NAME,
        [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
        options
      );
    });

    it('should bind to its own app when several are created from one list', async () => {
      const other = createBusinessAppWithMethods(
        createRawBusinessApp({ id: BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID_ALT }),
        mockService
      );

      await other.update(BUSINESS_APP_TEST_CONSTANTS.NAME_ALT, [
        BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY,
      ]);

      expect(mockService.updateById).toHaveBeenCalledWith(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID_ALT,
        expect.anything(),
        expect.anything(),
        undefined
      );
    });
  });

  describe('delete', () => {
    it("should delegate to deleteById with the app's own id", async () => {
      await businessApp.delete();

      expect(mockService.deleteById).toHaveBeenCalledWith(
        BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID
      );
    });
  });

  describe('missing id guard', () => {
    // A malformed payload would otherwise reach the service and surface as a
    // ValidationError naming businessAppId, hiding that the entity itself was bad.
    it('should throw from update rather than delegating when the app has no id', async () => {
      const idless = createBusinessAppWithMethods(createRawBusinessApp({ id: '' }), mockService);

      await expect(
        idless.update(BUSINESS_APP_TEST_CONSTANTS.NAME, [
          BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY,
        ])
      ).rejects.toThrow(/Business app ID/);
      expect(mockService.updateById).not.toHaveBeenCalled();
    });

    it('should throw from delete rather than delegating when the app has no id', async () => {
      const idless = createBusinessAppWithMethods(createRawBusinessApp({ id: '' }), mockService);

      await expect(idless.delete()).rejects.toThrow(/Business app ID/);
      expect(mockService.deleteById).not.toHaveBeenCalled();
    });
  });
});
