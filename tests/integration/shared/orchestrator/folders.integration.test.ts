import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '@tests/integration/config/unified-setup';
import { isNotFoundError } from '@/core/errors';
import { Folders } from '@/services/orchestrator/folders';

const modes: InitMode[] = ['v1'];

describeIntegration('Orchestrator Folders - Integration Tests', 'both', modes, () => {
  let folders!: Folders;

  beforeAll(() => {
    const service = getServices().folders;
    if (!service) {
      throw new Error('Folders service is not registered for this init mode');
    }
    folders = service;
  });

  describe('getAll', () => {
    it('should list the folders the caller has access to', async () => {
      const result = await folders.getAll();

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      const folder = result.items[0];
      expect(typeof folder.id).toBe('number');
      expect(typeof folder.key).toBe('string');
      expect(typeof folder.displayName).toBe('string');
      expect(typeof folder.fullyQualifiedName).toBe('string');
      expect(typeof folder.folderType).toBe('string');
      expect(folder.parentId === null || typeof folder.parentId === 'number').toBe(true);
      expect(folder.parentKey === null || typeof folder.parentKey === 'string').toBe(true);

      expect((folder as any).DisplayName).toBeUndefined();
      expect((folder as any).FullyQualifiedName).toBeUndefined();
      expect((folder as any).FolderType).toBeUndefined();
      expect((folder as any).ParentKey).toBeUndefined();
    });

    it('should page with pageSize and report a total count', async () => {
      const page = await folders.getAll({ pageSize: 1 });

      expect(page.items.length).toBe(1);
      expect(typeof page.totalCount).toBe('number');
      expect(page.totalCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getByKey', () => {
    let folderKey!: string;

    beforeAll(() => {
      const configuredKey = getTestConfig().folderKey;
      if (!configuredKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for getByKey');
      }
      folderKey = configuredKey;
    });

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
