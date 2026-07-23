import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectorsService } from '../../../../src/services/integration-service/connectors/connectors';
import { CONNECTOR_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import { FOLDER_KEY } from '../../../../src/utils/constants/headers';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import {
  IS_TEST_CONSTANTS,
  createMockConnector,
  createMockConnection,
  createMockError,
  TEST_CONSTANTS,
} from '../../../utils/mocks';

vi.mock('../../../../src/core/http/api-client');

describe('ConnectorsService', () => {
  let service: ConnectorsService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    service = new ConnectorsService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all connectors as a plain array', async () => {
      const mock = [createMockConnector(), createMockConnector({ key: 'uipath-slack', name: 'Slack' })];
      mockApiClient.get.mockResolvedValue(mock);

      const result = await service.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTOR_ENDPOINTS.GET_ALL, {
        params: undefined,
      });
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe(IS_TEST_CONSTANTS.CONNECTOR_KEY);
      expect(result[1].key).toBe('uipath-slack');
    });

    it('should forward hasHttpRequest option as a query param', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await service.getAll({ hasHttpRequest: true });

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTOR_ENDPOINTS.GET_ALL, {
        params: { hasHttpRequest: true },
      });
    });

    it('should handle an empty response', async () => {
      mockApiClient.get.mockResolvedValue([]);
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should return a single connector by key', async () => {
      const mock = createMockConnector();
      mockApiClient.get.mockResolvedValue(mock);

      const result = await service.getById(IS_TEST_CONSTANTS.CONNECTOR_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTOR_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        {},
      );
      expect(result.id).toBe(IS_TEST_CONSTANTS.CONNECTOR_ID);
    });

    it('should throw ValidationError when keyOrId is empty', async () => {
      await expect(service.getById('')).rejects.toThrow(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(IS_TEST_CONSTANTS.ERROR_CONNECTOR_NOT_FOUND));
      await expect(service.getById(IS_TEST_CONSTANTS.CONNECTOR_KEY)).rejects.toThrow(
        IS_TEST_CONSTANTS.ERROR_CONNECTOR_NOT_FOUND,
      );
    });
  });

  describe('getDefaultConnection', () => {
    it('should return the default connection with bound methods', async () => {
      const mock = createMockConnection();
      mockApiClient.get.mockResolvedValue(mock);

      const result = await service.getDefaultConnection(IS_TEST_CONSTANTS.CONNECTOR_KEY, {
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTOR_ENDPOINTS.GET_DEFAULT_CONNECTION(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        {
          headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY },
          params: {},
        },
      );
      expect(result.id).toBe(IS_TEST_CONSTANTS.CONNECTION_ID);
      // Bound methods attached:
      expect(typeof result.ping).toBe('function');
      expect(typeof result.reauthenticate).toBe('function');
    });

    it('should send no folder header when folderKey is omitted', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());

      await service.getDefaultConnection(IS_TEST_CONSTANTS.CONNECTOR_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTOR_ENDPOINTS.GET_DEFAULT_CONNECTION(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        { headers: {}, params: {} },
      );
    });

    it('should pass allFolders as a query param', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());

      await service.getDefaultConnection(IS_TEST_CONSTANTS.CONNECTOR_KEY, { allFolders: true });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTOR_ENDPOINTS.GET_DEFAULT_CONNECTION(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        { headers: {}, params: { allFolders: true } },
      );
    });

    it('should throw ValidationError when keyOrId is empty', async () => {
      await expect(service.getDefaultConnection('')).rejects.toThrow(ValidationError);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND));
      await expect(service.getDefaultConnection(IS_TEST_CONSTANTS.CONNECTOR_KEY)).rejects.toThrow(
        IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND,
      );
    });
  });

  describe('getConnections', () => {
    it('should return connections with bound methods on each entity', async () => {
      mockApiClient.get.mockResolvedValue([
        createMockConnection(),
        createMockConnection({ id: IS_TEST_CONSTANTS.CONNECTION_ID_2, name: 'second' }),
      ]);

      const result = await service.getConnections(IS_TEST_CONSTANTS.CONNECTOR_KEY, {
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
        pageSize: 25,
        pageIndex: 1,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTOR_ENDPOINTS.GET_CONNECTIONS(IS_TEST_CONSTANTS.CONNECTOR_KEY),
        {
          headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY },
          params: { pageSize: 25, pageIndex: 1 },
        },
      );
      expect(result).toHaveLength(2);
      for (const conn of result) {
        expect(typeof conn.ping).toBe('function');
        expect(typeof conn.reauthenticate).toBe('function');
      }
    });

    it('should default to empty array when API returns null', async () => {
      mockApiClient.get.mockResolvedValue(null);
      const result = await service.getConnections(IS_TEST_CONSTANTS.CONNECTOR_KEY);
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when keyOrId is empty', async () => {
      await expect(service.getConnections('')).rejects.toThrow(ValidationError);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getConnections(IS_TEST_CONSTANTS.CONNECTOR_KEY)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });
});
