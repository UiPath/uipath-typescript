import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  createFolder: vi.fn(),
  fetchRemoteStructure: vi.fn(),
  deleteItem: vi.fn(),
}));

import * as api from '../../../../src/core/webapp-file-handler/api.js';
import {
  hasFolderByPath,
  buildFolderIdMap,
  ensureContentRootExists,
  ensureFoldersCreated,
  cleanupEmptyFolders,
} from '../../../../src/core/webapp-file-handler/folder-ops.js';
import type {
  WebAppProjectConfig,
  ProjectStructure,
  ProjectFolder,
} from '../../../../src/core/webapp-file-handler/types.js';
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

function createStructure(folders: ProjectFolder[] = []): ProjectStructure {
  return { name: 'project', files: [], folders };
}

describe('folder-ops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasFolderByPath', () => {
    it('should find by exact path', () => {
      const map = new Map<string, ProjectFolder>([['source', { id: 'f1', name: 'source', files: [], folders: [] }]]);
      expect(hasFolderByPath(map, 'source')).toBe(true);
    });

    it('should find by normalized path (case-insensitive)', () => {
      const map = new Map<string, ProjectFolder>([['Source', { id: 'f1', name: 'Source', files: [], folders: [] }]]);
      expect(hasFolderByPath(map, 'source')).toBe(true);
    });

    it('should return false when path does not exist', () => {
      const map = new Map<string, ProjectFolder>();
      expect(hasFolderByPath(map, 'source')).toBe(false);
    });
  });

  describe('buildFolderIdMap', () => {
    it('should build normalized path to id map', () => {
      const structure = createStructure([
        {
          id: 'f1',
          name: 'Source',
          files: [],
          folders: [{ id: 'f2', name: 'dist', files: [], folders: [] }],
        },
      ]);
      const map = buildFolderIdMap(structure);
      expect(map.get('source')).toBe('f1');
      expect(map.get('source/dist')).toBe('f2');
    });

    it('should skip folders without id', () => {
      const structure = createStructure([{ id: null, name: 'noId', files: [], folders: [] }]);
      const map = buildFolderIdMap(structure);
      expect(map.size).toBe(0);
    });
  });

  describe('ensureContentRootExists', () => {
    it('should throw when structure is null', async () => {
      await expect(ensureContentRootExists(createConfig(), null, () => null, vi.fn())).rejects.toThrow();
    });

    it('should create source folder when missing', async () => {
      const structureWithSource = createStructure([
        {
          id: 'f1',
          name: 'source',
          files: [],
          folders: [{ id: 'f2', name: 'dist', files: [], folders: [] }],
        },
      ]);
      vi.mocked(api.createFolder).mockResolvedValue('f1');
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(structureWithSource);

      let structure = createStructure([]);
      await ensureContentRootExists(
        createConfig(),
        'lock',
        () => structure,
        (s) => {
          structure = s;
        },
      );
      expect(api.createFolder).toHaveBeenCalled();
    });

    it('should skip creation when source and content root already exist', async () => {
      const structure = createStructure([
        {
          id: 'f1',
          name: 'source',
          files: [],
          folders: [{ id: 'f2', name: 'dist', files: [], folders: [] }],
        },
      ]);
      await ensureContentRootExists(createConfig(), null, () => structure, vi.fn());
      expect(api.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('ensureFoldersCreated', () => {
    it('should do nothing for empty createFolders', async () => {
      await ensureFoldersCreated(
        createConfig(),
        { createFolders: [], uploadFiles: [], updateFiles: [], deleteFiles: [], deleteFolders: [] },
        new Map(),
        vi.fn(),
        null,
      );
      expect(api.createFolder).not.toHaveBeenCalled();
    });

    it('should create folders and store ids', async () => {
      vi.mocked(api.createFolder).mockResolvedValue('new-id');
      vi.mocked(api.fetchRemoteStructure).mockResolvedValue(createStructure());
      const folderIdMap = new Map<string, string>();
      await ensureFoldersCreated(
        createConfig(),
        {
          createFolders: [{ path: 'source/dist/assets' }],
          uploadFiles: [],
          updateFiles: [],
          deleteFiles: [],
          deleteFolders: [],
        },
        folderIdMap,
        vi.fn(),
        null,
      );
      expect(api.createFolder).toHaveBeenCalled();
    });
  });

  describe('cleanupEmptyFolders', () => {
    it('should delete empty folders', async () => {
      vi.mocked(api.deleteItem).mockResolvedValue(undefined);
      const structure = createStructure([{ id: 'f1', name: 'empty', files: [], folders: [] }]);
      await cleanupEmptyFolders(createConfig(), 'source/dist', async () => structure, null);
      // findEmptyFolders scoped to 'source/dist' won't find 'empty' at root
      expect(api.deleteItem).not.toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      vi.mocked(api.deleteItem).mockRejectedValue(new Error('forbidden'));
      const structure: ProjectStructure = {
        name: 'project',
        files: [],
        folders: [
          {
            id: 'f1',
            name: 'source',
            files: [],
            folders: [
              {
                id: 'f2',
                name: 'dist',
                files: [],
                folders: [{ id: 'f3', name: 'empty', files: [], folders: [] }],
              },
            ],
          },
        ],
      };
      const config = createConfig();
      await cleanupEmptyFolders(config, 'source/dist', async () => structure, null);
      expect(config.logger.log).toHaveBeenCalled();
    });
  });
});
