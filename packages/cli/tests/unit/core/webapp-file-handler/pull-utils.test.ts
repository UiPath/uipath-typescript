import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual, existsSync: vi.fn(), statSync: vi.fn(), mkdirSync: vi.fn() };
});

import {
  isProjectRootDirectory,
  remotePathToLocal,
  isUnderSource,
  stripSourcePrefix,
  getLocalRelativePath,
  isPathUnderBuildDir,
  getPathsThatWouldOverwrite,
  ensureLocalFolders,
  getFolderPathsForFiles,
} from '../../../../src/core/webapp-file-handler/pull-utils.js';
import type { ProjectFile } from '../../../../src/core/webapp-file-handler/types.js';

describe('pull-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isProjectRootDirectory', () => {
    it('should return true when package.json exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      expect(isProjectRootDirectory('/project')).toBe(true);
    });

    it('should return false when no markers exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(isProjectRootDirectory('/empty')).toBe(false);
    });

    it('should check .uipath is a directory', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('.uipath'));
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
      expect(isProjectRootDirectory('/project')).toBe(true);
    });

    it('should return false if .uipath is a file not a directory', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('.uipath'));
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
      expect(isProjectRootDirectory('/project')).toBe(false);
    });
  });

  describe('remotePathToLocal', () => {
    it('should join root dir with path segments', () => {
      const result = remotePathToLocal('/root', 'dist/index.html');
      expect(result).toContain('dist');
      expect(result).toContain('index.html');
    });

    it('should return rootDir for empty path', () => {
      expect(remotePathToLocal('/root', '')).toBe('/root');
    });
  });

  describe('isUnderSource', () => {
    it('should return true for source folder itself', () => {
      expect(isUnderSource('source')).toBe(true);
    });

    it('should return true for path under source/', () => {
      expect(isUnderSource('source/dist/app.js')).toBe(true);
    });

    it('should return false for paths not under source', () => {
      expect(isUnderSource('other/file.txt')).toBe(false);
    });

    it('should normalize backslashes', () => {
      expect(isUnderSource('source\\app.js')).toBe(true);
    });
  });

  describe('stripSourcePrefix', () => {
    it('should strip source/ prefix', () => {
      expect(stripSourcePrefix('source/dist/index.html')).toBe('dist/index.html');
    });

    it('should return empty string for source itself', () => {
      expect(stripSourcePrefix('source')).toBe('');
    });

    it('should return path unchanged if not under source', () => {
      expect(stripSourcePrefix('other/file.txt')).toBe('other/file.txt');
    });
  });

  describe('getLocalRelativePath', () => {
    it('should remap push_metadata.json to .uipath/ path', () => {
      const result = getLocalRelativePath('push_metadata.json');
      expect(result).toContain('.uipath');
    });

    it('should return other paths unchanged', () => {
      expect(getLocalRelativePath('dist/app.js')).toBe('dist/app.js');
    });
  });

  describe('isPathUnderBuildDir', () => {
    it('should return true for exact build dir', () => {
      expect(isPathUnderBuildDir('dist', 'dist')).toBe(true);
    });

    it('should return true for path under build dir', () => {
      expect(isPathUnderBuildDir('dist/app.js', 'dist')).toBe(true);
    });

    it('should return false for unrelated path', () => {
      expect(isPathUnderBuildDir('src/app.ts', 'dist')).toBe(false);
    });

    it('should return false when buildDir is null', () => {
      expect(isPathUnderBuildDir('dist/app.js', null)).toBe(false);
    });

    it('should return false when buildDir is empty', () => {
      expect(isPathUnderBuildDir('dist/app.js', '')).toBe(false);
    });
  });

  describe('getPathsThatWouldOverwrite', () => {
    it('should return paths that exist as files locally', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
      const filesMap = new Map<string, ProjectFile>([['source/package.json', { id: '1', name: 'package.json' }]]);
      const result = getPathsThatWouldOverwrite(filesMap, '/root');
      expect(result.length).toBe(1);
    });

    it('should skip paths that do not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const filesMap = new Map<string, ProjectFile>([['source/new.txt', { id: '1', name: 'new.txt' }]]);
      const result = getPathsThatWouldOverwrite(filesMap, '/root');
      expect(result.length).toBe(0);
    });
  });

  describe('ensureLocalFolders', () => {
    it('should create directories that do not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      ensureLocalFolders('/root', ['dist', 'src']);
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
    });

    it('should skip directories that already exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      ensureLocalFolders('/root', ['dist']);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getFolderPathsForFiles', () => {
    it('should extract parent directories from file paths', () => {
      const map = new Map<string, ProjectFile>([
        ['source/dist/index.html', { id: '1', name: 'index.html' }],
        ['source/dist/app.js', { id: '2', name: 'app.js' }],
        ['root.txt', { id: '3', name: 'root.txt' }],
      ]);
      const dirs = getFolderPathsForFiles(map);
      expect(dirs.has('source/dist')).toBe(true);
      expect(dirs.size).toBe(1); // both files share same parent
    });
  });
});
