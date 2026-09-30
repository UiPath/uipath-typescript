import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { isNotFoundError } from '../../../../src/core/errors';
import { Folders } from '../../../../src/services/orchestrator/folders';

const modes: InitMode[] = ['v1'];

describeIntegration('Orchestrator Folders - Integration Tests', 'both', modes, () => {
  let folders!: Folders;
  let folderKey!: string;

  beforeAll(() => {
    const service = getServices().folders;
    if (!service) {
      throw new Error('Folders service is not registered for this init mode');
    }
    folders = service;

    const configuredKey = getTestConfig().folderKey;
    if (!configuredKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for getByKey');
    }
    folderKey = configuredKey;
  });

  describe('getByKey', () => {
    it('should retrieve a folder by its GUID key', async () => {
      const folder = await folders.getByKey(folderKey);

      expect(folder).toBeDefined();
      expect(folder.key).toBe(folderKey);
      expect(typeof folder.id).toBe('number');
      expect(typeof folder.displayName).toBe('string');
      expect(typeof folder.fullyQualifiedName).toBe('string');
      expect(typeof folder.fullyQualifiedNameOrderable).toBe('string');
      expect(typeof folder.isActive).toBe('boolean');
      expect(typeof folder.folderType).toBe('string');
      expect(typeof folder.feedType).toBe('string');
      expect(folder.parentId === null || typeof folder.parentId === 'number').toBe(true);
      expect(folder.parentKey === null || typeof folder.parentKey === 'string').toBe(true);

      expect((folder as any).DisplayName).toBeUndefined();
      expect((folder as any).FullyQualifiedName).toBeUndefined();
      expect((folder as any).FolderType).toBeUndefined();
      expect((folder as any).ParentId).toBeUndefined();
      expect((folder as any).ParentKey).toBeUndefined();
      expect((folder as any).IsActive).toBeUndefined();
      expect((folder as any)['@odata.context']).toBeUndefined();
    });

    it('should honor $select', async () => {
      const folder = await folders.getByKey(folderKey, {
        select: 'key,fullyQualifiedName',
      });

      expect(folder.key).toBe(folderKey);
      expect(typeof folder.fullyQualifiedName).toBe('string');
    });

    it('should throw NotFoundError for a nonexistent folder key', async () => {
      await expect(
        folders.getByKey('00000000-0000-0000-0000-000000000000'),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });
});
