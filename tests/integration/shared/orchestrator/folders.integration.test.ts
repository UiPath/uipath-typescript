import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { isNotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

describeIntegration('Orchestrator Folders - Integration Tests', 'both', modes, () => {
  describe('getByKey', () => {
    it('should retrieve a folder by its GUID key', async () => {
      const { folders } = getServices();
      const config = getTestConfig();

      if (!folders) {
        throw new Error('Folders service is not registered for this init mode');
      }
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for getByKey');
      }

      const folder = await folders.getByKey(config.folderKey);

      expect(folder).toBeDefined();
      expect(folder.key).toBe(config.folderKey);
      expect(typeof folder.id).toBe('number');
      expect(typeof folder.displayName).toBe('string');
      expect(typeof folder.fullyQualifiedName).toBe('string');
      expect(typeof folder.folderType).toBe('string');
      expect(typeof folder.isPersonal).toBe('boolean');
      expect(typeof folder.feedType).toBe('string');
      expect(folder.parentId === null || typeof folder.parentId === 'number').toBe(true);
      expect(folder.parentKey === null || typeof folder.parentKey === 'string').toBe(true);

      expect((folder as any).DisplayName).toBeUndefined();
      expect((folder as any).FullyQualifiedName).toBeUndefined();
      expect((folder as any).FolderType).toBeUndefined();
      expect((folder as any).ParentId).toBeUndefined();
      expect((folder as any).ParentKey).toBeUndefined();
    });

    it('should honor $select', async () => {
      const { folders } = getServices();
      const config = getTestConfig();

      if (!folders) {
        throw new Error('Folders service is not registered for this init mode');
      }
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for getByKey');
      }

      const folder = await folders.getByKey(config.folderKey, {
        select: 'Key,FullyQualifiedName',
      });

      expect(folder.key).toBe(config.folderKey);
      expect(typeof folder.fullyQualifiedName).toBe('string');
    });

    it('should throw NotFoundError for a nonexistent folder key', async () => {
      const { folders } = getServices();

      if (!folders) {
        throw new Error('Folders service is not registered for this init mode');
      }

      await expect(
        folders.getByKey('00000000-0000-0000-0000-000000000000'),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });
});
