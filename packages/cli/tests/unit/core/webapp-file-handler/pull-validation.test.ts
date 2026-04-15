import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  downloadRemoteFile: vi.fn(),
}));

import * as api from '../../../../src/core/webapp-file-handler/api.js';
import {
  findWebAppManifestPath,
  validateProjectType,
} from '../../../../src/core/webapp-file-handler/pull-validation.js';
import type { WebAppProjectConfig, ProjectFile } from '../../../../src/core/webapp-file-handler/types.js';
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

describe('pull-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findWebAppManifestPath', () => {
    it('should return exact match', () => {
      const map = new Map<string, ProjectFile>([['webAppManifest.json', { id: '1', name: 'webAppManifest.json' }]]);
      expect(findWebAppManifestPath(map)).toBe('webAppManifest.json');
    });

    it('should find nested manifest path', () => {
      const map = new Map<string, ProjectFile>([
        ['folder/webAppManifest.json', { id: '1', name: 'webAppManifest.json' }],
      ]);
      expect(findWebAppManifestPath(map)).toBe('folder/webAppManifest.json');
    });

    it('should return null when no manifest found', () => {
      const map = new Map<string, ProjectFile>();
      expect(findWebAppManifestPath(map)).toBeNull();
    });
  });

  describe('validateProjectType', () => {
    it('should succeed for App_ProCode type manifest', async () => {
      const manifest = JSON.stringify({ type: 'App_ProCode' });
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(Buffer.from(manifest));
      const filesMap = new Map<string, ProjectFile>([
        ['webAppManifest.json', { id: '1', name: 'webAppManifest.json' }],
      ]);
      await expect(validateProjectType(createConfig(), filesMap)).resolves.toBeUndefined();
    });

    it('should throw when no manifest exists', async () => {
      const filesMap = new Map<string, ProjectFile>();
      await expect(validateProjectType(createConfig(), filesMap)).rejects.toThrow();
    });

    it('should throw for wrong project type', async () => {
      const manifest = JSON.stringify({ type: 'WrongType' });
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(Buffer.from(manifest));
      const filesMap = new Map<string, ProjectFile>([
        ['webAppManifest.json', { id: '1', name: 'webAppManifest.json' }],
      ]);
      await expect(validateProjectType(createConfig(), filesMap)).rejects.toThrow();
    });

    it('should throw for invalid JSON manifest', async () => {
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(Buffer.from('not json'));
      const filesMap = new Map<string, ProjectFile>([
        ['webAppManifest.json', { id: '1', name: 'webAppManifest.json' }],
      ]);
      await expect(validateProjectType(createConfig(), filesMap)).rejects.toThrow();
    });
  });
});
