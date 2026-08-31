import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createConnectionWithMethods,
  ConnectionsServiceModel,
} from '../../../../src/models/integration-service/connections.models';
import { ConnectionState } from '../../../../src/models/integration-service/connections.types';
import { IS_TEST_CONSTANTS, createMockConnection } from '../../../utils/mocks';

describe('Connection bound methods', () => {
  let mockService: ConnectionsServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      ping: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connection.ping()', () => {
    it('should delegate to service.ping with bound connection id', async () => {
      const connection = createConnectionWithMethods(createMockConnection(), mockService);
      const mockResponse = {
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      };
      mockService.ping = vi.fn().mockResolvedValue(mockResponse);

      const result = await connection.ping();

      expect(mockService.ping).toHaveBeenCalledWith(IS_TEST_CONSTANTS.CONNECTION_ID, undefined);
      expect(result).toBe(mockResponse);
    });

    it('should pass options through', async () => {
      const connection = createConnectionWithMethods(createMockConnection(), mockService);
      mockService.ping = vi.fn().mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });

      await connection.ping({ forceRefresh: true });

      expect(mockService.ping).toHaveBeenCalledWith(IS_TEST_CONSTANTS.CONNECTION_ID, {
        forceRefresh: true,
      });
    });

    it('should pass folder context through', async () => {
      const connection = createConnectionWithMethods(createMockConnection(), mockService);
      mockService.ping = vi.fn().mockResolvedValue({
        connector: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        status: ConnectionState.Enabled,
      });

      await connection.ping({ folderPath: IS_TEST_CONSTANTS.FOLDER_PATH });

      expect(mockService.ping).toHaveBeenCalledWith(IS_TEST_CONSTANTS.CONNECTION_ID, {
        folderPath: IS_TEST_CONSTANTS.FOLDER_PATH,
      });
    });

    it('should throw when the underlying connection has no id', async () => {
      const connection = createConnectionWithMethods(
        createMockConnection({ id: '' }),
        mockService,
      );
      await expect(connection.ping()).rejects.toThrow('Connection id is undefined');
    });
  });


  describe('createConnectionWithMethods', () => {
    it('should attach raw data fields verbatim', () => {
      const raw = createMockConnection();
      const connection = createConnectionWithMethods(raw, mockService);

      expect(connection.id).toBe(raw.id);
      expect(connection.name).toBe(raw.name);
      expect(connection.state).toBe(raw.state);
      expect(connection.createTime).toBe(raw.createTime);
      expect(connection.folder?.key).toBe(raw.folder?.key);
    });

    it('should attach the bound ping method', () => {
      const connection = createConnectionWithMethods(createMockConnection(), mockService);
      expect(typeof connection.ping).toBe('function');
    });
  });
});
