import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import { DataFabricDirectoryService } from '../../../../src/services/data-fabric/directory';
import { DataFabricDirectoryEntityType } from '../../../../src/models/data-fabric/directory.types';
import { DATA_FABRIC_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import {
  createMockApiClient,
  createServiceTestDependencies,
} from '../../../utils/setup';
import { TEST_CONSTANTS } from '../../../utils/constants';

vi.mock('../../../../src/core/http/api-client');

describe('DataFabricDirectoryService Unit Tests', () => {
  let directoryService: DataFabricDirectoryService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    directoryService = new DataFabricDirectoryService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should list Data Fabric directory entries', async () => {
      mockApiClient.get.mockResolvedValue({
        totalCount: 1,
        results: [
          {
            externalId: 'group-id',
            name: 'MRSAdmin',
            type: 'Group',
            roles: [{ id: 'role-existing', name: 'Data Reader' }],
            isUIEnabled: true,
          },
        ],
      });

      const result = await directoryService.list({ skip: 10, top: 25 });

      expect(result).toEqual({
        totalCount: 1,
        results: [
          {
            externalId: 'group-id',
            name: 'MRSAdmin',
            type: 'Group',
            roles: [{ id: 'role-existing', name: 'Data Reader' }],
            isUIEnabled: true,
          },
        ],
      });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.GET_ALL,
        { params: { skip: 10, top: 25 } }
      );
    });

    it('should default missing roles in directory entries', async () => {
      mockApiClient.get.mockResolvedValue({
        totalCount: 1,
        results: [
          {
            externalId: 'user-id',
            name: 'User Name',
            type: 'User',
          },
        ],
      });

      const result = await directoryService.list();

      expect(result).toEqual({
        totalCount: 1,
        results: [
          {
            externalId: 'user-id',
            name: 'User Name',
            type: 'User',
            roles: [],
            isUIEnabled: true,
          },
        ],
      });
    });

    it('should reject invalid directory response formats', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(directoryService.list()).rejects.toThrow(
        'Invalid Data Fabric directory response format.'
      );
    });

    it('should reject invalid directory entry response formats', async () => {
      mockApiClient.get.mockResolvedValue({
        totalCount: 1,
        results: [{ externalId: 'user-id', name: 'User Name', type: 'DirectoryRobot' }],
      });

      await expect(directoryService.list()).rejects.toThrow(
        'Invalid Data Fabric directory entry response format.'
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(directoryService.list()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getAll', () => {
    it('should page through all directory entries', async () => {
      const firstPage = Array.from({ length: 100 }, (_, index) => ({
        externalId: `principal-${index}`,
        name: `Principal ${index}`,
        type: 'User' as const,
        roles: [],
      }));
      mockApiClient.get
        .mockResolvedValueOnce({ totalCount: 101, results: firstPage })
        .mockResolvedValueOnce({
          totalCount: 101,
          results: [{ externalId: 'principal-100', name: 'Principal 100', type: 'User', roles: [] }],
        });

      const result = await directoryService.getAll();

      expect(result).toHaveLength(101);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        1,
        DATA_FABRIC_ENDPOINTS.DIRECTORY.GET_ALL,
        expect.objectContaining({ params: { top: 100 } })
      );
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        DATA_FABRIC_ENDPOINTS.DIRECTORY.GET_ALL,
        expect.objectContaining({ params: { top: 100, skip: 100 } })
      );
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(directoryService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('assignRoles', () => {
    it('should preserve existing roles by default before assigning', async () => {
      mockApiClient.get.mockResolvedValue({
        totalCount: 1,
        results: [
          {
            externalId: 'group-id',
            name: 'MRSAdmin',
            type: 'Group',
            roles: [{ id: 'role-existing', name: 'Data Reader' }],
          },
        ],
      });
      mockApiClient.post.mockResolvedValue(true);

      const result = await directoryService.assignRoles(
        'group-id',
        'Group',
        ['role-existing', 'role-new']
      );

      expect(result).toEqual([
        {
          principalId: 'group-id',
          roleIds: ['role-existing', 'role-new'],
        },
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES,
        {
          directoryEntities: [
            {
              externalId: 'group-id',
              type: DataFabricDirectoryEntityType.Group,
              resolved: true,
            },
          ],
          roles: ['role-existing', 'role-new'],
          isUIEnabled: true,
        },
        {}
      );
    });

    it('should preserve existing roles when the principal is not yet in the directory', async () => {
      mockApiClient.get.mockResolvedValue({
        totalCount: 0,
        results: [],
      });
      mockApiClient.post.mockResolvedValue(true);

      const result = await directoryService.assignRoles(
        'new-group-id',
        'Group',
        ['role-new']
      );

      expect(result).toEqual([
        {
          principalId: 'new-group-id',
          roleIds: ['role-new'],
        },
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES,
        {
          directoryEntities: [
            {
              externalId: 'new-group-id',
              type: DataFabricDirectoryEntityType.Group,
              resolved: true,
            },
          ],
          roles: ['role-new'],
          isUIEnabled: true,
        },
        {}
      );
    });

    it('should support replace-style assignment when preserveExisting is false', async () => {
      mockApiClient.post.mockResolvedValue(true);

      const result = await directoryService.assignRoles(
        ['user-id'],
        'User',
        ['role-new'],
        { preserveExisting: false, uiEnabled: false }
      );

      expect(result).toEqual([
        {
          principalId: 'user-id',
          roleIds: ['role-new'],
        },
      ]);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES,
        {
          directoryEntities: [
            {
              externalId: 'user-id',
              type: DataFabricDirectoryEntityType.User,
              resolved: true,
            },
          ],
          roles: ['role-new'],
          isUIEnabled: false,
        },
        {}
      );
    });

    it('should assign roles to multiple principals', async () => {
      mockApiClient.post.mockResolvedValue(true);

      const result = await directoryService.assignRoles(
        ['group-id', 'group-id-2'],
        'Group',
        ['role-new'],
        { preserveExisting: false }
      );

      expect(result).toEqual([
        {
          principalId: 'group-id',
          roleIds: ['role-new'],
        },
        {
          principalId: 'group-id-2',
          roleIds: ['role-new'],
        },
      ]);
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });

    it('should support application principal types', async () => {
      mockApiClient.post.mockResolvedValue(true);

      await directoryService.assignRoles(
        'application-id',
        'Application',
        ['role-new'],
        { preserveExisting: false }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES,
        expect.objectContaining({
          directoryEntities: [
            {
              externalId: 'application-id',
              type: DataFabricDirectoryEntityType.Application,
              resolved: true,
            },
          ],
        }),
        {}
      );
    });

    it('should support numeric principal types', async () => {
      mockApiClient.post.mockResolvedValue(true);

      await directoryService.assignRoles(
        'user-id',
        DataFabricDirectoryEntityType.User,
        ['role-new'],
        { preserveExisting: false }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES,
        expect.objectContaining({
          directoryEntities: [
            {
              externalId: 'user-id',
              type: DataFabricDirectoryEntityType.User,
              resolved: true,
            },
          ],
        }),
        {}
      );
    });

    it('should reject invalid numeric principal types', async () => {
      await expect(
        directoryService.assignRoles(
          'group-id',
          99 as DataFabricDirectoryEntityType,
          ['role-new']
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should reject empty principal IDs', async () => {
      await expect(
        directoryService.assignRoles(
          ['   '],
          'Group',
          ['role-new']
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should reject empty role IDs', async () => {
      await expect(
        directoryService.assignRoles(
          'group-id',
          'Group',
          ['']
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should reject invalid principal types', async () => {
      await expect(
        directoryService.assignRoles(
          'group-id',
          'Team' as never,
          ['role-new']
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should propagate errors from the POST call', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        directoryService.assignRoles(
          'group-id',
          'Group',
          ['role-new'],
          { preserveExisting: false }
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should propagate errors from fetching existing entries', async () => {
      mockApiClient.get.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        directoryService.assignRoles(
          'group-id',
          'Group',
          ['role-new']
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('revokeRoles', () => {
    it('should revoke roles for one principal', async () => {
      mockApiClient.post.mockResolvedValue(true);

      await directoryService.revokeRoles('user-id');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.REVOKE_ROLES,
        {
          externalIds: ['user-id'],
        },
        {}
      );
    });

    it('should trim, dedupe, and revoke roles for multiple principals', async () => {
      mockApiClient.post.mockResolvedValue(true);

      await directoryService.revokeRoles([' user-id ', 'group-id', 'user-id']);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DATA_FABRIC_ENDPOINTS.DIRECTORY.REVOKE_ROLES,
        {
          externalIds: ['user-id', 'group-id'],
        },
        {}
      );
    });

    it('should reject empty principal IDs', async () => {
      await expect(
        directoryService.revokeRoles(['   '])
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        directoryService.revokeRoles('user-id')
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
