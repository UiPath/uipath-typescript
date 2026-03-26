import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  createFile: vi.fn(),
  updateFile: vi.fn(),
  deleteItem: vi.fn(),
  FileAlreadyExistsError: class FileAlreadyExistsError extends Error {
    constructor(msg: string) { super(msg); this.name = 'FileAlreadyExistsError'; }
  },
}));

import * as api from '../../../../src/core/webapp-file-handler/api.js';
import { executeFileOperations, deleteFiles, deleteFolders } from '../../../../src/core/webapp-file-handler/file-ops.js';
import type { WebAppProjectConfig, FileOperationPlan, LocalFile } from '../../../../src/core/webapp-file-handler/types.js';
import { createMockLogger, createMockEnvConfig } from '../../../helpers/index.js';

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

const mockLocalFile: LocalFile = {
  path: 'dist/app.js',
  absPath: '/root/dist/app.js',
  hash: 'abc123',
  content: Buffer.from('content'),
};

describe('file-ops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeFileOperations', () => {
    it('should return zero counts for empty plan', async () => {
      const config = createConfig();
      const plan: FileOperationPlan = {
        createFolders: [], uploadFiles: [], updateFiles: [], deleteFiles: [], deleteFolders: [],
      };
      const result = await executeFileOperations(config, plan, null);
      expect(result.succeededCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should count successful uploads', async () => {
      vi.mocked(api.createFile).mockResolvedValue(undefined);
      const config = createConfig();
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [{ path: 'source/dist/app.js', localFile: mockLocalFile, parentPath: 'source/dist', parentId: 'f1' }],
        updateFiles: [],
        deleteFiles: [],
        deleteFolders: [],
      };
      const result = await executeFileOperations(config, plan, 'lock-key');
      expect(result.succeededCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should count successful updates', async () => {
      vi.mocked(api.updateFile).mockResolvedValue(undefined);
      const config = createConfig();
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [],
        updateFiles: [{ path: 'source/dist/app.js', localFile: mockLocalFile, fileId: 'file-1' }],
        deleteFiles: [],
        deleteFolders: [],
      };
      const result = await executeFileOperations(config, plan, null);
      expect(result.succeededCount).toBe(1);
    });

    it('should treat FileAlreadyExistsError as success', async () => {
      vi.mocked(api.createFile).mockRejectedValue(new api.FileAlreadyExistsError('exists'));
      const config = createConfig();
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [{ path: 'source/dist/app.js', localFile: mockLocalFile, parentPath: 'source/dist' }],
        updateFiles: [],
        deleteFiles: [],
        deleteFolders: [],
      };
      const result = await executeFileOperations(config, plan, null);
      expect(result.succeededCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should count other errors as failures', async () => {
      vi.mocked(api.createFile).mockRejectedValue(new Error('network error'));
      const config = createConfig();
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [{ path: 'source/dist/app.js', localFile: mockLocalFile, parentPath: 'source/dist' }],
        updateFiles: [],
        deleteFiles: [],
        deleteFolders: [],
      };
      const result = await executeFileOperations(config, plan, null);
      expect(result.failedCount).toBe(1);
      expect(result.failedPaths[0].path).toBe('source/dist/app.js');
    });
  });

  describe('deleteFiles', () => {
    it('should return zero counts for empty array', async () => {
      const result = await deleteFiles(createConfig(), [], null);
      expect(result.succeededCount).toBe(0);
    });

    it('should count successful deletes', async () => {
      vi.mocked(api.deleteItem).mockResolvedValue(undefined);
      const config = createConfig();
      const result = await deleteFiles(config, [{ fileId: 'f1', path: 'a.txt' }], 'lock');
      expect(result.succeededCount).toBe(1);
    });

    it('should count failed deletes', async () => {
      vi.mocked(api.deleteItem).mockRejectedValue(new Error('forbidden'));
      const config = createConfig();
      const result = await deleteFiles(config, [{ fileId: 'f1', path: 'a.txt' }], null);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('deleteFolders', () => {
    it('should delete folders sequentially', async () => {
      vi.mocked(api.deleteItem).mockResolvedValue(undefined);
      const config = createConfig();
      const result = await deleteFolders(
        config,
        [{ folderId: 'f1', path: 'a' }, { folderId: 'f2', path: 'b' }],
        null,
      );
      expect(result.succeededCount).toBe(2);
      expect(api.deleteItem).toHaveBeenCalledTimes(2);
    });

    it('should count folder delete failures', async () => {
      vi.mocked(api.deleteItem).mockRejectedValue(new Error('fail'));
      const config = createConfig();
      const result = await deleteFolders(config, [{ folderId: 'f1', path: 'a' }], null);
      expect(result.failedCount).toBe(1);
    });
  });
});
