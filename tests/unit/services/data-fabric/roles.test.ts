import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ServerError } from '../../../../src/core/errors';
import { DataFabricRoleService } from '../../../../src/services/data-fabric/roles';
import { DATA_FABRIC_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import {
  createMockApiClient,
  createServiceTestDependencies,
} from '../../../utils/setup';
import { TEST_CONSTANTS } from '../../../utils/constants';

vi.mock('../../../../src/core/http/api-client');

describe('DataFabricRoleService Unit Tests', () => {
  let rolesService: DataFabricRoleService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    rolesService = new DataFabricRoleService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should list Data Fabric roles with stats enabled by default', async () => {
      mockApiClient.get.mockResolvedValue([
        { id: 'role-1', name: 'Administrator', type: 'System', directoryEntityCount: 2 },
        { id: 'role-2', name: 'Data Writer', type: 'System', directoryEntityCount: 4 },
      ]);

      const result = await rolesService.getAll();

      expect(result).toEqual([
        { id: 'role-1', name: 'Administrator', type: 'System', directoryEntityCount: 2 },
        { id: 'role-2', name: 'Data Writer', type: 'System', directoryEntityCount: 4 },
      ]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ROLES.GET_ALL,
        { params: { stats: true } }
      );
    });

    it('should support disabling role stats', async () => {
      mockApiClient.get.mockResolvedValue([
        { id: 'role-1', name: 'Administrator', type: 'System' },
      ]);

      const result = await rolesService.getAll({ stats: false });

      expect(result).toEqual([{ id: 'role-1', name: 'Administrator', type: 'System' }]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.ROLES.GET_ALL,
        { params: { stats: false } }
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(rolesService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should reject invalid role response formats', async () => {
      mockApiClient.get.mockResolvedValue({ results: [] });
      const result = rolesService.getAll();

      await expect(result).rejects.toBeInstanceOf(ServerError);
      await expect(result).rejects.toThrow(
        'Invalid Data Fabric roles response format.'
      );
    });
  });
});
