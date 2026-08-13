// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class or the enums as runtime values.
import {
  Directory,
  PlatformDirectoryEntityType,
  PlatformDirectorySource,
} from '../../../../src/services/platform';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicRawPlatformDirectoryEntry,
  createBasicRawPlatformDirectoryGroup,
  createMockError,
  PLATFORM_TEST_CONSTANTS,
  PLATFORM_USER_TEST_CONSTANTS,
  PLATFORM_GROUP_TEST_CONSTANTS,
  PLATFORM_DIRECTORY_TEST_CONSTANTS,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IDENTITY_DIRECTORY_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('Platform Directory Service Unit Tests', () => {
  let directoryService: Directory;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const organizationId = PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID;
  const userId = PLATFORM_USER_TEST_CONSTANTS.USER_ID;
  const groupId = PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    directoryService = new Directory(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('barrel exports', () => {
    it('should expose the service class and enums as runtime values through the subpath barrel', () => {
      // A barrel using `export type *` would drop these and break every documented example
      expect(typeof Directory).toBe('function');
      expect(PlatformDirectoryEntityType.Group).toBe('group');
      expect(PlatformDirectorySource.LocalGroups).toBe('localGroups');
    });
  });

  describe('search', () => {
    it('should GET the search endpoint and apply the transform pipeline', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformDirectoryEntry()]);

      const results = await directoryService.search(organizationId);

      expect(mockApiClient.get.mock.calls[0][0]).toBe(IDENTITY_DIRECTORY_ENDPOINTS.SEARCH(organizationId));
      expect(results).toHaveLength(1);
      const entry = results[0];
      // Semantic renames carry their values
      expect(entry.id).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
      expect(entry.name).toBe(PLATFORM_DIRECTORY_TEST_CONSTANTS.ENTRY_NAME);
      // Original wire fields are gone
      expect((entry as any).identifier).toBeUndefined();
      expect((entry as any).identityName).toBeUndefined();
      expect((entry as any).objectType).toBeUndefined();
      // Numeric code is mapped to the enum
      expect(entry.type).toBe(PlatformDirectoryEntityType.User);
    });

    it('should map group and application type codes', async () => {
      mockApiClient.get.mockResolvedValue([
        createBasicRawPlatformDirectoryEntry({ type: 1, objectType: 'DirectoryGroup' }),
        createBasicRawPlatformDirectoryEntry({ type: 2, objectType: 'Application' }),
      ]);

      const results = await directoryService.search(organizationId);

      expect(results[0].type).toBe(PlatformDirectoryEntityType.Group);
      expect(results[1].type).toBe(PlatformDirectoryEntityType.Application);
    });

    it('should send filters under the wire param names', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await directoryService.search(organizationId, {
        startsWith: PLATFORM_DIRECTORY_TEST_CONSTANTS.SEARCH_PREFIX,
        entityType: PlatformDirectoryEntityType.Group,
        sources: [PlatformDirectorySource.LocalGroups, PlatformDirectorySource.DirectoryGroups],
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.startsWith).toBe(PLATFORM_DIRECTORY_TEST_CONSTANTS.SEARCH_PREFIX);
      expect(spec.params.entityType).toBe('group');
      expect(spec.params.sourceFilter).toEqual(['localGroups', 'directoryGroups']);
      expect(spec.params).not.toHaveProperty('sources');
    });

    it('should omit filter params that are not provided', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await directoryService.search(organizationId);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params).not.toHaveProperty('startsWith');
      expect(spec.params).not.toHaveProperty('entityType');
      expect(spec.params).not.toHaveProperty('sourceFilter');
    });

    it('should return an empty array when nothing matches', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const results = await directoryService.search(organizationId, { startsWith: 'zzz' });

      expect(results).toEqual([]);
    });

    it('should throw ValidationError when organizationId is empty', async () => {
      await expect(directoryService.search('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_DIRECTORY_TEST_CONSTANTS.ERROR_DIRECTORY_FORBIDDEN));

      await expect(directoryService.search(organizationId)).rejects.toThrow(
        PLATFORM_DIRECTORY_TEST_CONSTANTS.ERROR_DIRECTORY_FORBIDDEN
      );
    });
  });

  describe('getGroupMembership', () => {
    it('should POST the user and group IDs and apply the transform pipeline', async () => {
      mockApiClient.post.mockResolvedValue([createBasicRawPlatformDirectoryGroup()]);

      const memberships = await directoryService.getGroupMembership(userId, [groupId], organizationId);

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(IDENTITY_DIRECTORY_ENDPOINTS.GROUP_MEMBERSHIP(organizationId));
      expect(body).toEqual({ userId, groupIds: [groupId] });

      expect(memberships).toHaveLength(1);
      const group = memberships[0];
      expect(group.id).toBe(groupId);
      expect(group.name).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME);
      expect((group as any).identifier).toBeUndefined();
      expect((group as any).objectType).toBeUndefined();
    });

    it('should return an empty array when the user is in none of the groups', async () => {
      mockApiClient.post.mockResolvedValue([]);

      const memberships = await directoryService.getGroupMembership(userId, [groupId], organizationId);

      expect(memberships).toEqual([]);
    });

    it('should throw ValidationError when userId is empty', async () => {
      await expect(
        directoryService.getGroupMembership('', [groupId], organizationId)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when groupIds is empty', async () => {
      await expect(
        directoryService.getGroupMembership(userId, [], organizationId)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when organizationId is empty', async () => {
      await expect(
        directoryService.getGroupMembership(userId, [groupId], '')
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(PLATFORM_DIRECTORY_TEST_CONSTANTS.ERROR_DIRECTORY_FORBIDDEN));

      await expect(
        directoryService.getGroupMembership(userId, [groupId], organizationId)
      ).rejects.toThrow(PLATFORM_DIRECTORY_TEST_CONSTANTS.ERROR_DIRECTORY_FORBIDDEN);
    });
  });
});
