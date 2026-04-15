import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  retrieveLock: vi.fn(),
  releaseLock: vi.fn(),
  fetchRemoteStructure: vi.fn(),
  downloadRemoteFile: vi.fn(),
}));

vi.mock('../../../../src/core/webapp-file-handler/local-files.js', () => ({
  collectLocalFiles: vi.fn().mockReturnValue([]),
  collectSourceFiles: vi.fn().mockReturnValue([]),
  computeHash: vi.fn(),
}));

vi.mock('../../../../src/core/webapp-file-handler/push-plan.js', () => ({
  computeExecutionPlan: vi.fn().mockResolvedValue({
    createFolders: [],
    uploadFiles: [],
    updateFiles: [],
    deleteFiles: [],
    deleteFolders: [],
  }),
  computeFirstPushPlan: vi.fn().mockReturnValue({
    createFolders: [],
    uploadFiles: [],
    updateFiles: [],
    deleteFiles: [],
    deleteFolders: [],
  }),
}));

vi.mock('../../../../src/core/webapp-file-handler/metadata.js', () => ({
  prepareMetadataFileForPlan: vi.fn(),
  uploadPushMetadataToRemote: vi.fn(),
  updateRemoteWebAppManifest: vi.fn(),
  ensureSchemaVersionNotBehindRemote: vi.fn(),
}));

vi.mock('../../../../src/core/webapp-file-handler/folder-ops.js', () => ({
  buildFolderIdMap: vi.fn().mockReturnValue(new Map()),
  ensureContentRootExists: vi.fn(),
  ensureFoldersCreated: vi.fn(),
  cleanupEmptyFolders: vi.fn(),
  hasFolderByPath: vi.fn(),
}));

vi.mock('../../../../src/core/webapp-file-handler/file-ops.js', () => ({
  executeFileOperations: vi.fn().mockResolvedValue({ failedCount: 0 }),
  deleteFiles: vi.fn().mockResolvedValue({ failedCount: 0 }),
  deleteFolders: vi.fn().mockResolvedValue({ failedCount: 0 }),
}));

vi.mock('../../../../src/core/webapp-file-handler/resource-import.js', () => ({
  runImportReferencedResources: vi.fn(),
}));

import { WebAppFileHandler } from '../../../../src/core/webapp-file-handler/handler.js';
import * as api from '../../../../src/core/webapp-file-handler/api.js';
import * as folderOps from '../../../../src/core/webapp-file-handler/folder-ops.js';
import * as fileOps from '../../../../src/core/webapp-file-handler/file-ops.js';
import * as resourceImport from '../../../../src/core/webapp-file-handler/resource-import.js';
import { createMockLogger, createMockEnvConfig } from '../../../helpers/index.js';
import type { WebAppProjectConfig } from '../../../../src/core/webapp-file-handler/types.js';

function createConfig(): WebAppProjectConfig {
  return {
    projectId: 'proj-1',
    rootDir: '/root',
    bundlePath: 'dist',
    manifestFile: '.uipath/push_metadata.json',
    envConfig: createMockEnvConfig(),
    logger: createMockLogger(),
  };
}

const emptyStructure = { name: 'project', files: [], folders: [] };

describe('WebAppFileHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('push', () => {
    it('should throw when lock cannot be acquired', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: null, solutionLockKey: null });
      const handler = new WebAppFileHandler(createConfig());
      await expect(handler.push()).rejects.toThrow();
    });

    it('should acquire lock, push, and release lock', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(emptyStructure);
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(folderOps.hasFolderByPath).mockReturnValue(true);

      const handler = new WebAppFileHandler(createConfig());
      await handler.push();

      expect(api.retrieveLock).toHaveBeenCalled();
      expect(api.releaseLock).toHaveBeenCalledWith(expect.anything(), 'lock-1');
    });

    it('should release lock even if push fails', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockRejectedValue(new Error('fetch failed'));
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);

      const handler = new WebAppFileHandler(createConfig());
      await expect(handler.push()).rejects.toThrow('fetch failed');
      expect(api.releaseLock).toHaveBeenCalledWith(expect.anything(), 'lock-1');
    });

    it('should handle first push when content root does not exist', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(emptyStructure);
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(folderOps.hasFolderByPath).mockReturnValue(false);

      const handler = new WebAppFileHandler(createConfig());
      await handler.push();

      expect(folderOps.ensureContentRootExists).toHaveBeenCalled();
    });

    it('should throw when file operations fail', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(emptyStructure);
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(folderOps.hasFolderByPath).mockReturnValue(true);

      const { computeExecutionPlan } = await import('../../../../src/core/webapp-file-handler/push-plan.js');
      vi.mocked(computeExecutionPlan).mockResolvedValue({
        createFolders: [],
        uploadFiles: [{ path: 'f', localFile: {} as any, parentPath: null }],
        updateFiles: [],
        deleteFiles: [],
        deleteFolders: [],
      });
      vi.mocked(fileOps.executeFileOperations).mockResolvedValue({ failedCount: 2 } as any);

      const handler = new WebAppFileHandler(createConfig());
      await expect(handler.push()).rejects.toThrow('failed');
    });

    it('should log warning when lock release fails', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(emptyStructure);
      vi.mocked(api.releaseLock).mockRejectedValue(new Error('release failed'));
      vi.mocked(folderOps.hasFolderByPath).mockReturnValue(true);
      vi.mocked(fileOps.executeFileOperations).mockResolvedValue({ failedCount: 0 } as any);

      const config = createConfig();
      const handler = new WebAppFileHandler(config);
      await handler.push();
      expect(config.logger.log).toHaveBeenCalled();
    });

    it('should handle metadata upload failure gracefully', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(emptyStructure);
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(folderOps.hasFolderByPath).mockReturnValue(true);
      vi.mocked(fileOps.executeFileOperations).mockResolvedValue({ failedCount: 0 } as any);
      const { uploadPushMetadataToRemote } = await import('../../../../src/core/webapp-file-handler/metadata.js');
      vi.mocked(uploadPushMetadataToRemote).mockRejectedValue(new Error('upload fail'));

      const config = createConfig();
      const handler = new WebAppFileHandler(config);
      await handler.push();
      // Should not throw, just log warning
      expect(config.logger.log).toHaveBeenCalled();
    });
  });

  describe('importReferencedResources', () => {
    it('should return early when ignoreResources is true', async () => {
      const handler = new WebAppFileHandler(createConfig());
      await handler.importReferencedResources(true);
      expect(api.retrieveLock).not.toHaveBeenCalled();
    });

    it('should acquire lock, import resources, and release lock', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(resourceImport.runImportReferencedResources).mockResolvedValue(undefined);

      const handler = new WebAppFileHandler(createConfig());
      await handler.importReferencedResources();

      expect(resourceImport.runImportReferencedResources).toHaveBeenCalled();
      expect(api.releaseLock).toHaveBeenCalled();
    });

    it('should release lock even if import fails', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: null, solutionLockKey: 'sol-lock' });
      vi.mocked(api.releaseLock).mockResolvedValue(undefined);
      vi.mocked(resourceImport.runImportReferencedResources).mockRejectedValue(new Error('import fail'));

      const handler = new WebAppFileHandler(createConfig());
      await expect(handler.importReferencedResources()).rejects.toThrow('import fail');
      expect(api.releaseLock).toHaveBeenCalledWith(expect.anything(), 'sol-lock');
    });

    it('should log warning when lock release fails during import', async () => {
      vi.mocked(api.retrieveLock).mockResolvedValue({ projectLockKey: 'lock-1', solutionLockKey: null });
      vi.mocked(api.releaseLock).mockRejectedValue(new Error('release fail'));
      vi.mocked(resourceImport.runImportReferencedResources).mockResolvedValue(undefined);

      const config = createConfig();
      const handler = new WebAppFileHandler(config);
      await handler.importReferencedResources();
      expect(config.logger.log).toHaveBeenCalled();
    });
  });
});
