import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

vi.mock('../../../../src/auth/core/oidc.js', () => ({
  parseJWT: vi.fn().mockReturnValue({ email: 'test@example.com' }),
}));

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  updateFile: vi.fn(),
  createFile: vi.fn(),
  downloadRemoteFile: vi.fn(),
}));

import {
  getPushAuthorEmail,
  PushBehindRemoteError,
  ensureSchemaVersionNotBehindRemote,
  prepareMetadataFileForPlan,
  uploadPushMetadataToRemote,
  updateRemoteWebAppManifest,
} from '../../../../src/core/webapp-file-handler/metadata.js';
import { parseJWT } from '../../../../src/auth/core/oidc.js';
import * as api from '../../../../src/core/webapp-file-handler/api.js';
import type { WebAppProjectConfig, ProjectFile, FileOperationPlan } from '../../../../src/core/webapp-file-handler/types.js';
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

const emptyPlan: FileOperationPlan = {
  createFolders: [], uploadFiles: [], updateFiles: [], deleteFiles: [], deleteFolders: [],
};

describe('metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPushAuthorEmail', () => {
    it('should return email from JWT', () => {
      expect(getPushAuthorEmail('valid-token')).toBe('test@example.com');
    });

    it('should return empty string when no token', () => {
      expect(getPushAuthorEmail(undefined)).toBe('');
    });

    it('should return empty string when parseJWT throws', () => {
      vi.mocked(parseJWT).mockImplementationOnce(() => { throw new Error('bad'); });
      expect(getPushAuthorEmail('bad-token', createMockLogger())).toBe('');
    });
  });

  describe('PushBehindRemoteError', () => {
    it('should include local and remote versions', () => {
      const err = new PushBehindRemoteError('1.0.0', '2.0.0');
      expect(err.name).toBe('PushBehindRemoteError');
      expect(err.localVersion).toBe('1.0.0');
      expect(err.remoteVersion).toBe('2.0.0');
      expect(err.message).toContain('1.0.0');
      expect(err.message).toContain('2.0.0');
    });
  });

  describe('ensureSchemaVersionNotBehindRemote', () => {
    const mockDownload = vi.fn();

    it('should do nothing when no remote metadata exists', async () => {
      const remoteFiles = new Map<string, ProjectFile>();
      await expect(ensureSchemaVersionNotBehindRemote(createConfig(), remoteFiles, mockDownload))
        .resolves.toBeUndefined();
    });

    it('should do nothing when local metadata is missing', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => { throw Object.assign(new Error(), { code: 'ENOENT' }); });
      const remoteFiles = new Map<string, ProjectFile>([
        ['source/push_metadata.json', { id: 'f1', name: 'push_metadata.json' }],
      ]);
      await expect(ensureSchemaVersionNotBehindRemote(createConfig(), remoteFiles, mockDownload))
        .resolves.toBeUndefined();
    });

    it('should throw PushBehindRemoteError when local is behind', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ schemaVersion: '1.0.0' }));
      mockDownload.mockResolvedValue(Buffer.from(JSON.stringify({ schemaVersion: '2.0.0' })));
      const remoteFiles = new Map<string, ProjectFile>([
        ['source/push_metadata.json', { id: 'f1', name: 'push_metadata.json' }],
      ]);
      await expect(ensureSchemaVersionNotBehindRemote(createConfig(), remoteFiles, mockDownload))
        .rejects.toThrow(PushBehindRemoteError);
    });

    it('should succeed when local version equals remote', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ schemaVersion: '1.0.0' }));
      mockDownload.mockResolvedValue(Buffer.from(JSON.stringify({ schemaVersion: '1.0.0' })));
      const remoteFiles = new Map<string, ProjectFile>([
        ['source/push_metadata.json', { id: 'f1', name: 'push_metadata.json' }],
      ]);
      await expect(ensureSchemaVersionNotBehindRemote(createConfig(), remoteFiles, mockDownload))
        .resolves.toBeUndefined();
    });
  });

  describe('prepareMetadataFileForPlan', () => {
    const mockDownload = vi.fn();

    it('should create new metadata when local and remote are missing', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw Object.assign(new Error(), { code: 'ENOENT' });
      });
      const remoteFiles = new Map<string, ProjectFile>();
      await prepareMetadataFileForPlan(createConfig(), remoteFiles, mockDownload, emptyPlan);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.renameSync).toHaveBeenCalled();
    });

    it('should update existing local metadata', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        schemaVersion: '1.0.0',
        projectId: 'proj-1',
        description: '',
        lastPushDate: '',
        lastPushAuthor: '',
      }));
      const remoteFiles = new Map<string, ProjectFile>();
      await prepareMetadataFileForPlan(createConfig(), remoteFiles, mockDownload, emptyPlan);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should bump minor version for uploads', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        schemaVersion: '1.0.0',
        projectId: 'proj-1',
        description: '',
        lastPushDate: '',
        lastPushAuthor: '',
      }));
      const plan: FileOperationPlan = {
        ...emptyPlan,
        uploadFiles: [{ path: 'x', localFile: {} as any, parentPath: null }],
      };
      await prepareMetadataFileForPlan(createConfig(), new Map(), mockDownload, plan);
      const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsed = JSON.parse(written);
      expect(parsed.schemaVersion).toBe('1.1.0');
    });

    it('should bump major version for deletions', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        schemaVersion: '1.0.0',
        projectId: 'proj-1',
        description: '',
        lastPushDate: '',
        lastPushAuthor: '',
      }));
      const plan: FileOperationPlan = {
        ...emptyPlan,
        deleteFiles: [{ fileId: 'f1', path: 'x' }],
      };
      await prepareMetadataFileForPlan(createConfig(), new Map(), mockDownload, plan);
      const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsed = JSON.parse(written);
      expect(parsed.schemaVersion).toBe('2.0.0');
    });

    it('should use remote metadata when local is missing but remote exists', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw Object.assign(new Error(), { code: 'ENOENT' });
      });
      mockDownload.mockResolvedValue(Buffer.from(JSON.stringify({
        schemaVersion: '3.0.0',
        projectId: 'proj-1',
        description: '',
        lastPushDate: '',
        lastPushAuthor: '',
      })));
      const remoteFiles = new Map<string, ProjectFile>([
        ['source/push_metadata.json', { id: 'f1', name: 'push_metadata.json' }],
      ]);
      await prepareMetadataFileForPlan(createConfig(), remoteFiles, mockDownload, emptyPlan);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('uploadPushMetadataToRemote', () => {
    it('should update existing remote metadata', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('{}'));
      vi.mocked(api.updateFile).mockResolvedValue(undefined);
      const remoteFiles = new Map<string, ProjectFile>([
        ['source/push_metadata.json', { id: 'f1', name: 'push_metadata.json' }],
      ]);
      await uploadPushMetadataToRemote(createConfig(), '/root/.uipath/push_metadata.json', remoteFiles, new Map(), null);
      expect(api.updateFile).toHaveBeenCalled();
    });

    it('should create new remote metadata when not existing', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('{}'));
      vi.mocked(api.createFile).mockResolvedValue(undefined);
      const remoteFiles = new Map<string, ProjectFile>();
      await uploadPushMetadataToRemote(createConfig(), '/root/.uipath/push_metadata.json', remoteFiles, new Map(), null);
      expect(api.createFile).toHaveBeenCalled();
    });
  });

  describe('updateRemoteWebAppManifest', () => {
    it('should do nothing when manifest does not exist remotely', async () => {
      const remoteFiles = new Map<string, ProjectFile>();
      await updateRemoteWebAppManifest(createConfig(), 'dist', remoteFiles, null);
      expect(api.downloadRemoteFile).not.toHaveBeenCalled();
    });

    it('should update bundlePath in manifest config', async () => {
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(
        Buffer.from(JSON.stringify({ type: 'Coded', config: {} }))
      );
      vi.mocked(api.updateFile).mockResolvedValue(undefined);
      const remoteFiles = new Map<string, ProjectFile>([
        ['webAppManifest.json', { id: 'f1', name: 'webAppManifest.json' }],
      ]);
      await updateRemoteWebAppManifest(createConfig(), 'dist', remoteFiles, null);
      expect(api.updateFile).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(api.downloadRemoteFile).mockRejectedValue(new Error('fail'));
      const config = createConfig();
      const remoteFiles = new Map<string, ProjectFile>([
        ['webAppManifest.json', { id: 'f1', name: 'webAppManifest.json' }],
      ]);
      await updateRemoteWebAppManifest(config, 'dist', remoteFiles, null);
      expect(config.logger.log).toHaveBeenCalled();
    });
  });
});
