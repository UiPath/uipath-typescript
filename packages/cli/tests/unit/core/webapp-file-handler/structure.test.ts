import { describe, it, expect } from 'vitest';
import {
  normalizePathToForwardSlashes,
  normalizeFolderPath,
  normalizeBundlePath,
  getRemoteContentRoot,
  localPathToRemotePath,
  sourceLocalPathToRemotePath,
  getRemotePathForLocalPath,
  filterToSourceFolderMap,
  getRemoteFilesMap,
  getRemoteFoldersMap,
  isFolderEmpty,
  findEmptyFolders,
  REMOTE_SOURCE_FOLDER_NAME,
  WEB_APP_MANIFEST_FILENAME,
} from '../../../../src/core/webapp-file-handler/structure.js';
import type { ProjectStructure, ProjectFolder } from '../../../../src/core/webapp-file-handler/types.js';

describe('structure', () => {
  describe('normalizePathToForwardSlashes', () => {
    it('should replace backslashes with forward slashes', () => {
      expect(normalizePathToForwardSlashes('a\\b\\c')).toBe('a/b/c');
    });
    it('should leave forward slashes unchanged', () => {
      expect(normalizePathToForwardSlashes('a/b/c')).toBe('a/b/c');
    });
    it('should handle empty string', () => {
      expect(normalizePathToForwardSlashes('')).toBe('');
    });
  });

  describe('normalizeFolderPath', () => {
    it('should lowercase and normalize slashes', () => {
      expect(normalizeFolderPath('Source\\Dist')).toBe('source/dist');
    });
  });

  describe('normalizeBundlePath', () => {
    it('should strip leading and trailing slashes', () => {
      expect(normalizeBundlePath('/dist/')).toBe('dist');
    });
    it('should normalize backslashes', () => {
      expect(normalizeBundlePath('build\\output')).toBe('build/output');
    });
    it('should return original if result would be empty', () => {
      expect(normalizeBundlePath('/')).toBe('/');
    });
    it('should handle plain path', () => {
      expect(normalizeBundlePath('dist')).toBe('dist');
    });
  });

  describe('getRemoteContentRoot', () => {
    it('should prepend source folder name', () => {
      expect(getRemoteContentRoot('dist')).toBe('source/dist');
    });
    it('should return source folder when bundle is empty-like', () => {
      expect(getRemoteContentRoot('')).toBe('source');
    });
  });

  describe('localPathToRemotePath', () => {
    it('should map build dir file to remote content root', () => {
      expect(localPathToRemotePath('dist/index.html', 'dist', 'source/dist')).toBe('source/dist/index.html');
    });
    it('should handle exact build dir match', () => {
      expect(localPathToRemotePath('dist', 'dist', 'source/dist')).toBe('source/dist');
    });
    it('should prepend remote root for non-build files', () => {
      expect(localPathToRemotePath('other.js', 'dist', 'source/dist')).toBe('source/dist/other.js');
    });
    it('should normalize backslashes', () => {
      expect(localPathToRemotePath('dist\\app.js', 'dist', 'source/dist')).toBe('source/dist/app.js');
    });
  });

  describe('sourceLocalPathToRemotePath', () => {
    it('should prepend source folder', () => {
      expect(sourceLocalPathToRemotePath('package.json')).toBe('source/package.json');
    });
    it('should return source folder for empty path', () => {
      expect(sourceLocalPathToRemotePath('')).toBe('source');
    });
    it('should normalize backslashes', () => {
      expect(sourceLocalPathToRemotePath('src\\index.ts')).toBe('source/src/index.ts');
    });
  });

  describe('getRemotePathForLocalPath', () => {
    it('should route build dir files through localPathToRemotePath', () => {
      expect(getRemotePathForLocalPath('dist/app.js', 'dist', 'source/dist')).toBe('source/dist/app.js');
    });
    it('should route non-build files through sourceLocalPathToRemotePath', () => {
      expect(getRemotePathForLocalPath('package.json', 'dist', 'source/dist')).toBe('source/package.json');
    });
  });

  describe('filterToSourceFolderMap', () => {
    it('should keep entries matching root or under root prefix', () => {
      const map = new Map([
        ['source/dist', 'a'],
        ['source/dist/index.html', 'b'],
        ['other/file', 'c'],
      ]);
      const filtered = filterToSourceFolderMap(map, 'source/dist');
      expect(filtered.size).toBe(2);
      expect(filtered.has('other/file')).toBe(false);
    });
  });

  describe('getRemoteFilesMap', () => {
    it('should collect files from root and nested folders', () => {
      const structure: ProjectStructure = {
        name: 'project',
        files: [{ id: '1', name: 'root.txt' }],
        folders: [
          {
            id: 'f1',
            name: 'source',
            files: [{ id: '2', name: 'app.js' }],
            folders: [
              {
                id: 'f2',
                name: 'dist',
                files: [{ id: '3', name: 'index.html' }],
                folders: [],
              },
            ],
          },
        ],
      };
      const map = getRemoteFilesMap(structure);
      expect(map.get('root.txt')?.id).toBe('1');
      expect(map.get('source/app.js')?.id).toBe('2');
      expect(map.get('source/dist/index.html')?.id).toBe('3');
    });
  });

  describe('getRemoteFoldersMap', () => {
    it('should collect all folders with paths', () => {
      const structure: ProjectStructure = {
        name: 'project',
        files: [],
        folders: [
          {
            id: 'f1',
            name: 'source',
            files: [],
            folders: [{ id: 'f2', name: 'dist', files: [], folders: [] }],
          },
        ],
      };
      const map = getRemoteFoldersMap(structure);
      expect(map.has('source')).toBe(true);
      expect(map.has('source/dist')).toBe(true);
    });
  });

  describe('isFolderEmpty', () => {
    it('should return true for folder with no files and no subfolders', () => {
      expect(isFolderEmpty({ id: '1', name: 'empty', files: [], folders: [] })).toBe(true);
    });
    it('should return false for folder with files', () => {
      expect(isFolderEmpty({ id: '1', name: 'f', files: [{ id: '2', name: 'a.txt' }], folders: [] })).toBe(false);
    });
    it('should return true for folder with only empty subfolders', () => {
      const folder: ProjectFolder = {
        id: '1',
        name: 'parent',
        files: [],
        folders: [{ id: '2', name: 'child', files: [], folders: [] }],
      };
      expect(isFolderEmpty(folder)).toBe(true);
    });
    it('should return false if nested subfolder has files', () => {
      const folder: ProjectFolder = {
        id: '1',
        name: 'parent',
        files: [],
        folders: [{ id: '2', name: 'child', files: [{ id: '3', name: 'f.txt' }], folders: [] }],
      };
      expect(isFolderEmpty(folder)).toBe(false);
    });
  });

  describe('findEmptyFolders', () => {
    it('should find empty folders in structure', () => {
      const structure: ProjectStructure = {
        name: 'project',
        files: [],
        folders: [
          { id: 'f1', name: 'empty', files: [], folders: [] },
          { id: 'f2', name: 'notempty', files: [{ id: '1', name: 'a.txt' }], folders: [] },
        ],
      };
      const result = findEmptyFolders(structure);
      expect(result).toEqual([{ id: 'f1', name: 'empty' }]);
    });

    it('should scope to rootPath when provided', () => {
      const structure: ProjectStructure = {
        name: 'project',
        files: [],
        folders: [
          {
            id: 'f1',
            name: 'source',
            files: [],
            folders: [
              { id: 'f2', name: 'empty', files: [], folders: [] },
              { id: 'f3', name: 'full', files: [{ id: '1', name: 'a.txt' }], folders: [] },
            ],
          },
        ],
      };
      const result = findEmptyFolders(structure, 'source');
      expect(result.length).toBe(1); // only 'empty' subfolder (source itself has 'full' sibling)
    });

    it('should return empty array when rootPath does not exist', () => {
      const structure: ProjectStructure = { name: 'project', files: [], folders: [] };
      expect(findEmptyFolders(structure, 'nonexistent')).toEqual([]);
    });
  });

  describe('constants', () => {
    it('should export expected constants', () => {
      expect(REMOTE_SOURCE_FOLDER_NAME).toBe('source');
      expect(WEB_APP_MANIFEST_FILENAME).toBe('webAppManifest.json');
    });
  });
});
