import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionsService } from '../../../../src/services/integration-service/connections/connections';
import { CONNECTION_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
import { ConnectionState } from '../../../../src/models/integration-service/connections.types';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import {
  IS_TEST_CONSTANTS,
  createMockConnection,
  createMockError,
} from '../../../utils/mocks';

vi.mock('../../../../src/core/http/api-client');

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });
    service = new ConnectionsService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return connections with bound methods on each entity', async () => {
      mockApiClient.get.mockResolvedValue([
        createMockConnection(),
        createMockConnection({ id: IS_TEST_CONSTANTS.CONNECTION_ID_2 }),
      ]);

      const result = await service.getAll({
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
        pageSize: 50,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY },
        params: { pageSize: 50 },
      });
      expect(result).toHaveLength(2);
      for (const conn of result) {
        expect(typeof conn.ping).toBe('function');
        expect(typeof conn.reauthenticate).toBe('function');
      }
    });

    it('should default to empty array when API returns null', async () => {
      mockApiClient.get.mockResolvedValue(null);
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should pass filter and mostRecentFirst as query params', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({ filter: "name eq 'foo'", mostRecentFirst: true });
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: {},
        params: { filter: "name eq 'foo'", mostRecentFirst: true },
      });
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND));
      await expect(service.getAll()).rejects.toThrow(IS_TEST_CONSTANTS.ERROR_CONNECTION_NOT_FOUND);
    });

    it('should route folderId to the folder ID header', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({ folderId: IS_TEST_CONSTANTS.FOLDER_ID });
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_ID]: String(IS_TEST_CONSTANTS.FOLDER_ID) },
        params: {},
      });
    });

    it('should route folderPath to the encoded folder path header', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({ folderPath: IS_TEST_CONSTANTS.FOLDER_PATH });
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE },
        params: {},
      });
    });

    it('should forward every folder header when more than one is supplied', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({
        folderId: IS_TEST_CONSTANTS.FOLDER_ID,
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: {
          [FOLDER_ID]: String(IS_TEST_CONSTANTS.FOLDER_ID),
          [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY,
          [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE,
        },
        params: {},
      });
    });

    it('should never leak folder context into query params', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({
        folderId: IS_TEST_CONSTANTS.FOLDER_ID,
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
        folderDefaults: true,
      });
      const [, requestOptions] = mockApiClient.get.mock.calls[0];
      // folderDefaults is a genuine query param — only exact folder-context keys are stripped.
      expect(requestOptions.params).toEqual({ folderDefaults: true });
    });

    it('should fall back to the init-time folder key when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.get.mockResolvedValue([]);

      await scopedService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY },
        params: {},
      });
    });

    it('should prefer an explicit folder path over the init-time folder key', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.get.mockResolvedValue([]);

      await scopedService.getAll({ folderPath: IS_TEST_CONSTANTS.FOLDER_PATH });

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE },
        params: {},
      });
    });

    it('should send no folder header when neither options nor init supply folder context', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll();
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: {},
        params: {},
      });
    });

    it('should treat a whitespace-only folderKey as no folder context', async () => {
      mockApiClient.get.mockResolvedValue([]);
      await service.getAll({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY_WHITESPACE });
      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: {},
        params: {},
      });
    });

    it('should fall back to the init-time folder key when folderKey is whitespace-only', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.get.mockResolvedValue([]);

      await scopedService.getAll({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY_WHITESPACE });

      expect(mockApiClient.get).toHaveBeenCalledWith(CONNECTION_ENDPOINTS.GET_ALL, {
        headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY },
        params: {},
      });
    });
  });

  describe('getById', () => {
    it('should return a single connection with bound methods', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());

      const result = await service.getById(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: {}, params: {} },
      );
      expect(result.id).toBe(IS_TEST_CONSTANTS.CONNECTION_ID);
      expect(typeof result.ping).toBe('function');
      expect(typeof result.reauthenticate).toBe('function');
    });

    it('should forward includeConfigs as a query param', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());
      await service.getById(IS_TEST_CONSTANTS.CONNECTION_ID, { includeConfigs: true });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: {}, params: { includeConfigs: true } },
      );
    });

    it('should send folder header when folderKey is provided', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());
      await service.getById(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY }, params: {} },
      );
    });

    it('should route folderPath to the encoded folder path header', async () => {
      mockApiClient.get.mockResolvedValue(createMockConnection());
      await service.getById(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: { [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE }, params: {} },
      );
    });

    it('should fall back to the init-time folder key when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.get.mockResolvedValue(createMockConnection());

      await scopedService.getById(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.GET_BY_ID(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY }, params: {} },
      );
    });

    it('should throw ValidationError when connectionId is empty', async () => {
      await expect(service.getById('')).rejects.toThrow(ValidationError);
    });
  });

  describe('ping', () => {
    it('should return ping status', async () => {
      mockApiClient.get.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });

      const result = await service.ping(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.PING(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: {}, params: {} },
      );
      expect(result.status).toBe(ConnectionState.Enabled);
      expect(result.connector).toBe(IS_TEST_CONSTANTS.CONNECTOR_KEY);
    });

    it('should forward forceRefresh as a query param', async () => {
      mockApiClient.get.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });
      await service.ping(IS_TEST_CONSTANTS.CONNECTION_ID, { forceRefresh: true });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.PING(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: {}, params: { forceRefresh: true } },
      );
    });

    it('should route folderPath to the encoded folder path header', async () => {
      mockApiClient.get.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });
      await service.ping(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.PING(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: { [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE }, params: {} },
      );
    });

    it('should fall back to the init-time folder key when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.get.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });

      await scopedService.ping(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.PING(IS_TEST_CONSTANTS.CONNECTION_ID),
        { headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY }, params: {} },
      );
    });

    it('should throw ValidationError when connectionId is empty', async () => {
      await expect(service.ping('')).rejects.toThrow(ValidationError);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(IS_TEST_CONSTANTS.ERROR_PING_FAILED));
      await expect(service.ping(IS_TEST_CONSTANTS.CONNECTION_ID)).rejects.toThrow(
        IS_TEST_CONSTANTS.ERROR_PING_FAILED,
      );
    });
  });

  describe('reauthenticate', () => {
    it('should start an OAuth session', async () => {
      mockApiClient.post.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        sessionId: IS_TEST_CONSTANTS.AUTH_SESSION_ID,
        expiresAt: IS_TEST_CONSTANTS.AUTH_EXPIRES_AT,
        authUrl: IS_TEST_CONSTANTS.AUTH_URL,
      });

      const result = await service.reauthenticate(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.REAUTHENTICATE(IS_TEST_CONSTANTS.CONNECTION_ID),
        undefined,
        { headers: {}, params: {} },
      );
      expect(result.sessionId).toBe(IS_TEST_CONSTANTS.AUTH_SESSION_ID);
      expect(result.authUrl).toBe(IS_TEST_CONSTANTS.AUTH_URL);
    });

    it('should send folder header when folderKey is provided', async () => {
      mockApiClient.post.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        sessionId: IS_TEST_CONSTANTS.AUTH_SESSION_ID,
        expiresAt: IS_TEST_CONSTANTS.AUTH_EXPIRES_AT,
        authUrl: IS_TEST_CONSTANTS.AUTH_URL,
      });
      await service.reauthenticate(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderKey: IS_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.REAUTHENTICATE(IS_TEST_CONSTANTS.CONNECTION_ID),
        undefined,
        { headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY }, params: {} },
      );
    });

    it('should route folderPath to the encoded folder path header', async () => {
      mockApiClient.post.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        sessionId: IS_TEST_CONSTANTS.AUTH_SESSION_ID,
        expiresAt: IS_TEST_CONSTANTS.AUTH_EXPIRES_AT,
        authUrl: IS_TEST_CONSTANTS.AUTH_URL,
      });
      await service.reauthenticate(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.REAUTHENTICATE(IS_TEST_CONSTANTS.CONNECTION_ID),
        undefined,
        { headers: { [FOLDER_PATH_ENCODED]: IS_TEST_CONSTANTS.FOLDER_PATH_ENCODED_VALUE }, params: {} },
      );
    });

    it('should fall back to the init-time folder key when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: IS_TEST_CONSTANTS.FOLDER_KEY });
      const scopedService = new ConnectionsService(instance);
      mockApiClient.post.mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        sessionId: IS_TEST_CONSTANTS.AUTH_SESSION_ID,
        expiresAt: IS_TEST_CONSTANTS.AUTH_EXPIRES_AT,
        authUrl: IS_TEST_CONSTANTS.AUTH_URL,
      });

      await scopedService.reauthenticate(IS_TEST_CONSTANTS.CONNECTION_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        CONNECTION_ENDPOINTS.REAUTHENTICATE(IS_TEST_CONSTANTS.CONNECTION_ID),
        undefined,
        { headers: { [FOLDER_KEY]: IS_TEST_CONSTANTS.FOLDER_KEY }, params: {} },
      );
    });

    it('should throw ValidationError when connectionId is empty', async () => {
      await expect(service.reauthenticate('')).rejects.toThrow(ValidationError);
    });
  });
});
