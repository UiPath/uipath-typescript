import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';
import { ELEMENT_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IS_TEST_CONSTANTS, createMockError, TEST_CONSTANTS } from '../../../utils/mocks';

vi.mock('../../../../src/core/http/api-client');

const EVENT_OPERATION = 'INDEX_COMPLETED';
const OBJECT_NAME = 'indexes';

describe('ElementsService', () => {
  let service: ElementsService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    service = new ElementsService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('static (connection-independent)', () => {
    it('getObjects returns array and forwards options', async () => {
      mockApiClient.get.mockResolvedValue([{ name: 'foo' }]);
      const result = await service.getObjects(IS_TEST_CONSTANTS.CONNECTOR_KEY, { hasEvents: true });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.OBJECTS.LIST(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        { params: { hasEvents: true } },
      );
      expect(result).toEqual([{ name: 'foo' }]);
    });

    it('getActivities returns array', async () => {
      mockApiClient.get.mockResolvedValue([{ name: 'send' }]);
      const result = await service.getActivities(IS_TEST_CONSTANTS.CONNECTOR_KEY);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.ACTIVITIES.LIST(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        { params: undefined },
      );
      expect(result).toEqual([{ name: 'send' }]);
    });

    it('getObjectMetadata returns single metadata object', async () => {
      const mockMeta = { name: OBJECT_NAME, fields: { id: { name: 'id' } } };
      mockApiClient.get.mockResolvedValue(mockMeta);
      const result = await service.getObjectMetadata(IS_TEST_CONSTANTS.CONNECTOR_KEY, OBJECT_NAME, {
        version: '1.0',
        includeParentArray: true,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.OBJECTS.METADATA(IS_TEST_CONSTANTS.CONNECTOR_KEY, OBJECT_NAME),
        { params: { version: '1.0', includeParentArray: true } },
      );
      expect(result).toBe(mockMeta);
    });

    it('getEventObjects returns array', async () => {
      mockApiClient.get.mockResolvedValue([{ name: OBJECT_NAME }]);
      await service.getEventObjects(IS_TEST_CONSTANTS.CONNECTOR_KEY, EVENT_OPERATION);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.EVENTS.OBJECTS(IS_TEST_CONSTANTS.CONNECTOR_KEY, EVENT_OPERATION),
        { params: undefined },
      );
    });

    it('getEventObjectMetadata returns single object', async () => {
      const mockMeta = { name: OBJECT_NAME };
      mockApiClient.get.mockResolvedValue(mockMeta);
      await service.getEventObjectMetadata(
        IS_TEST_CONSTANTS.CONNECTOR_KEY,
        EVENT_OPERATION,
        OBJECT_NAME,
        { allFields: true },
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.EVENTS.METADATA(IS_TEST_CONSTANTS.CONNECTOR_KEY, EVENT_OPERATION, OBJECT_NAME),
        { params: { allFields: true } },
      );
    });
  });

  describe('instance (connection-scoped)', () => {
    it('getInstanceObjects returns array', async () => {
      mockApiClient.get.mockResolvedValue([{ name: 'foo' }]);
      await service.getInstanceObjects(IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.CONNECTOR_KEY);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.INSTANCE.OBJECTS.LIST(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
        ),
        { params: undefined },
      );
    });

    it('getInstanceObjectMetadata returns metadata', async () => {
      mockApiClient.get.mockResolvedValue({ name: OBJECT_NAME });
      await service.getInstanceObjectMetadata(
        IS_TEST_CONSTANTS.CONNECTION_ID,
        IS_TEST_CONSTANTS.CONNECTOR_KEY,
        OBJECT_NAME,
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.INSTANCE.OBJECTS.METADATA(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          OBJECT_NAME,
        ),
        { params: undefined },
      );
    });

    it('getInstanceEventObjects returns array', async () => {
      mockApiClient.get.mockResolvedValue([{ name: OBJECT_NAME }]);
      await service.getInstanceEventObjects(
        IS_TEST_CONSTANTS.CONNECTION_ID,
        IS_TEST_CONSTANTS.CONNECTOR_KEY,
        EVENT_OPERATION,
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.INSTANCE.EVENTS.OBJECTS(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          EVENT_OPERATION,
        ),
        { params: undefined },
      );
    });

    it('getInstanceEventObjectMetadata returns metadata', async () => {
      mockApiClient.get.mockResolvedValue({ name: OBJECT_NAME });
      await service.getInstanceEventObjectMetadata(
        IS_TEST_CONSTANTS.CONNECTION_ID,
        IS_TEST_CONSTANTS.CONNECTOR_KEY,
        EVENT_OPERATION,
        OBJECT_NAME,
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ELEMENT_ENDPOINTS.INSTANCE.EVENTS.METADATA(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          EVENT_OPERATION,
          OBJECT_NAME,
        ),
        { params: undefined },
      );
    });
  });

  describe('validation', () => {
    it('throws ValidationError when elementKey is missing', async () => {
      await expect(service.getObjects('')).rejects.toThrow(ValidationError);
      await expect(service.getActivities('')).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when objectName is missing', async () => {
      await expect(
        service.getObjectMetadata(IS_TEST_CONSTANTS.CONNECTOR_KEY, ''),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when connectionId is missing on instance reads', async () => {
      await expect(
        service.getInstanceObjects('', IS_TEST_CONSTANTS.CONNECTOR_KEY),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when operationName is missing on event reads', async () => {
      await expect(
        service.getEventObjects(IS_TEST_CONSTANTS.CONNECTOR_KEY, ''),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('error propagation', () => {
    beforeEach(() => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
    });

    it('propagates API errors from getObjects', async () => {
      await expect(service.getObjects(IS_TEST_CONSTANTS.CONNECTOR_KEY)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });

    it('propagates API errors from getActivities', async () => {
      await expect(service.getActivities(IS_TEST_CONSTANTS.CONNECTOR_KEY)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });

    it('propagates API errors from getObjectMetadata', async () => {
      await expect(
        service.getObjectMetadata(IS_TEST_CONSTANTS.CONNECTOR_KEY, OBJECT_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getEventObjects', async () => {
      await expect(
        service.getEventObjects(IS_TEST_CONSTANTS.CONNECTOR_KEY, EVENT_OPERATION),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getEventObjectMetadata', async () => {
      await expect(
        service.getEventObjectMetadata(IS_TEST_CONSTANTS.CONNECTOR_KEY, EVENT_OPERATION, OBJECT_NAME),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getInstanceObjects', async () => {
      await expect(
        service.getInstanceObjects(IS_TEST_CONSTANTS.CONNECTION_ID, IS_TEST_CONSTANTS.CONNECTOR_KEY),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getInstanceObjectMetadata', async () => {
      await expect(
        service.getInstanceObjectMetadata(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          OBJECT_NAME,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getInstanceEventObjects', async () => {
      await expect(
        service.getInstanceEventObjects(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          EVENT_OPERATION,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('propagates API errors from getInstanceEventObjectMetadata', async () => {
      await expect(
        service.getInstanceEventObjectMetadata(
          IS_TEST_CONSTANTS.CONNECTION_ID,
          IS_TEST_CONSTANTS.CONNECTOR_KEY,
          EVENT_OPERATION,
          OBJECT_NAME,
        ),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
