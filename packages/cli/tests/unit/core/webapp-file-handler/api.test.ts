import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('node-fetch', () => ({ default: mockFetch }));

vi.mock('../../../../src/utils/error-handler.js', () => ({
  handleHttpError: vi.fn().mockImplementation(async (res: any, ctx: string) => {
    throw new Error(`HTTP Error ${res.status}: ${ctx}`);
  }),
}));

import {
  buildApiUrl,
  FileAlreadyExistsError,
  fetchRemoteStructure,
  releaseLock,
  retrieveLock,
  downloadRemoteFile,
  createFile,
  updateFile,
  deleteItem,
  getSolutionId,
  findResourceInCatalog,
  mapFolder,
  retrieveConnection,
  createReferencedResource,
} from '../../../../src/core/webapp-file-handler/api.js';
import type { WebAppProjectConfig } from '../../../../src/core/webapp-file-handler/types.js';
import { createMockLogger, createMockEnvConfig } from '../../../helpers/index.js';

function createConfig(overrides: Partial<WebAppProjectConfig> = {}): WebAppProjectConfig {
  return {
    projectId: 'proj-1',
    rootDir: '/root',
    bundlePath: 'dist',
    manifestFile: '.uipath/push_metadata.json',
    envConfig: createMockEnvConfig(),
    logger: createMockLogger(),
    ...overrides,
  };
}

function mockResponse(opts: { ok?: boolean; status?: number; json?: unknown; text?: string; headers?: Record<string, string>; arrayBuffer?: ArrayBuffer } = {}) {
  const { ok = true, status = 200, json = {}, text = '', headers = {}, arrayBuffer } = opts;
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
    arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer ?? new ArrayBuffer(0)),
    headers: {
      get: vi.fn((key: string) => headers[key] ?? null),
    },
  };
}

describe('webapp-file-handler/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FileAlreadyExistsError', () => {
    it('should have correct name and message', () => {
      const err = new FileAlreadyExistsError('test/file.js');
      expect(err.name).toBe('FileAlreadyExistsError');
      expect(err.message).toContain('test/file.js');
      expect(err.filePath).toBe('test/file.js');
    });
  });

  describe('buildApiUrl', () => {
    it('should build org-scoped URL by default', () => {
      const config = createConfig();
      const url = buildApiUrl(config, '/api/test');
      expect(url).toBe('https://cloud.uipath.com/org-id/api/test');
    });

    it('should build tenant-scoped URL when tenantScoped is true', () => {
      const config = createConfig();
      const url = buildApiUrl(config, '/api/test', true);
      expect(url).toBe('https://cloud.uipath.com/org-id/tenant-id/api/test');
    });
  });

  describe('fetchRemoteStructure', () => {
    it('should return structure on success', async () => {
      const structure = { name: 'project', files: [], folders: [] };
      mockFetch.mockResolvedValue(mockResponse({ json: structure }));
      const result = await fetchRemoteStructure(createConfig());
      expect(result).toEqual(structure);
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
      await expect(fetchRemoteStructure(createConfig())).rejects.toThrow('not found');
    });

    it('should throw on 403', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 403 }));
      await expect(fetchRemoteStructure(createConfig())).rejects.toThrow('Access denied');
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, text: 'Server error' }));
      await expect(fetchRemoteStructure(createConfig())).rejects.toThrow();
    });
  });

  describe('releaseLock', () => {
    it('should succeed on ok response', async () => {
      mockFetch.mockResolvedValue(mockResponse());
      await expect(releaseLock(createConfig(), 'lock-key')).resolves.toBeUndefined();
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, text: 'fail' }));
      await expect(releaseLock(createConfig(), 'lock-key')).rejects.toThrow('Release lock failed');
    });
  });

  describe('retrieveLock', () => {
    it('should return lock info when lock keys exist', async () => {
      const lockInfo = { projectLockKey: 'plk', solutionLockKey: 'slk' };
      mockFetch.mockResolvedValue(mockResponse({ json: lockInfo }));
      const result = await retrieveLock(createConfig());
      expect(result).toEqual(lockInfo);
    });

    it('should acquire lock and retry when keys are empty', async () => {
      const emptyLock = { projectLockKey: null, solutionLockKey: null };
      const acquiredLock = { projectLockKey: 'plk', solutionLockKey: 'slk' };
      mockFetch
        .mockResolvedValueOnce(mockResponse({ json: emptyLock })) // GET empty
        .mockResolvedValueOnce(mockResponse()) // PUT acquire
        .mockResolvedValueOnce(mockResponse({ json: acquiredLock })); // GET retry
      const result = await retrieveLock(createConfig());
      expect(result).toEqual(acquiredLock);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
      await expect(retrieveLock(createConfig())).rejects.toThrow('not found');
    });
  });

  describe('downloadRemoteFile', () => {
    it('should return buffer content', async () => {
      const content = new TextEncoder().encode('file content').buffer;
      mockFetch.mockResolvedValue(mockResponse({ arrayBuffer: content }));
      const result = await downloadRemoteFile(createConfig(), 'file-id');
      expect(result).toEqual(Buffer.from(content));
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500 }));
      await expect(downloadRemoteFile(createConfig(), 'file-id')).rejects.toThrow();
    });
  });

  describe('createFile', () => {
    it('should succeed on 200', async () => {
      mockFetch.mockResolvedValue(mockResponse());
      const localFile = { path: 'app.js', absPath: '/root/app.js', hash: 'h', content: Buffer.from('x') };
      await expect(createFile(createConfig(), 'source/app.js', localFile, null, null, null)).resolves.toBeUndefined();
    });

    it('should throw FileAlreadyExistsError on 409', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 409 }));
      const localFile = { path: 'app.js', absPath: '/root/app.js', hash: 'h', content: Buffer.from('x') };
      await expect(createFile(createConfig(), 'source/app.js', localFile, null, null, null))
        .rejects.toThrow(FileAlreadyExistsError);
    });
  });

  describe('updateFile', () => {
    it('should succeed on ok response', async () => {
      mockFetch.mockResolvedValue(mockResponse());
      const localFile = { path: 'app.js', absPath: '/root/app.js', hash: 'h', content: Buffer.from('x') };
      await expect(updateFile(createConfig(), 'source/app.js', localFile, 'file-1', null)).resolves.toBeUndefined();
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, text: 'fail' }));
      const localFile = { path: 'app.js', absPath: '/root/app.js', hash: 'h', content: Buffer.from('x') };
      await expect(updateFile(createConfig(), 'source/app.js', localFile, 'file-1', null)).rejects.toThrow();
    });
  });

  describe('deleteItem', () => {
    it('should succeed on ok response', async () => {
      mockFetch.mockResolvedValue(mockResponse());
      await expect(deleteItem(createConfig(), 'item-1', null)).resolves.toBeUndefined();
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, text: 'err' }));
      await expect(deleteItem(createConfig(), 'item-1', null)).rejects.toThrow();
    });
  });

  describe('getSolutionId', () => {
    it('should return solution ID from response', async () => {
      mockFetch.mockResolvedValue(mockResponse({ json: { solutionId: 'sol-1' } }));
      const result = await getSolutionId(createConfig());
      expect(result).toBe('sol-1');
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500 }));
      await expect(getSolutionId(createConfig())).rejects.toThrow();
    });
  });

  describe('mapFolder', () => {
    it('should map folder with key', () => {
      const result = mapFolder({ key: 'k1', fullyQualifiedName: 'fqn', path: '/p' });
      expect(result.folderKey).toBe('k1');
      expect(result.fullyQualifiedName).toBe('fqn');
      expect(result.path).toBe('/p');
    });

    it('should fall back to folderKey field', () => {
      const result = mapFolder({ folderKey: 'fk1', fully_qualified_name: 'fqn2', path: '/p2' });
      expect(result.folderKey).toBe('fk1');
      expect(result.fullyQualifiedName).toBe('fqn2');
    });

    it('should handle empty folder', () => {
      const result = mapFolder({});
      expect(result.folderKey).toBe('');
      expect(result.fullyQualifiedName).toBe('');
      expect(result.path).toBe('');
    });
  });

  describe('findResourceInCatalog', () => {
    it('should find a matching resource', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        text: JSON.stringify({
          value: [{
            name: 'MyAsset',
            entityKey: 'ek1',
            entityType: 'asset',
            folders: [{ key: 'fk1', fullyQualifiedName: 'fqn', path: '/Shared' }],
          }],
        }),
        headers: { 'content-type': 'application/json' },
      }));
      const result = await findResourceInCatalog(createConfig(), 'asset', 'MyAsset', '/Shared', mapFolder);
      expect(result.resourceKey).toBe('ek1');
      expect(result.name).toBe('MyAsset');
    });

    it('should throw for unknown resource type', async () => {
      await expect(
        findResourceInCatalog(createConfig(), 'unknown_type', 'x', '', mapFolder)
      ).rejects.toThrow('Unknown resource type');
    });

    it('should throw when resource not found', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        text: JSON.stringify({ value: [] }),
        headers: { 'content-type': 'application/json' },
      }));
      await expect(
        findResourceInCatalog(createConfig(), 'asset', 'Missing', '', mapFolder)
      ).rejects.toThrow('not found');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500 }));
      await expect(
        findResourceInCatalog(createConfig(), 'asset', 'x', '', mapFolder)
      ).rejects.toThrow();
    });
  });

  describe('retrieveConnection', () => {
    it('should return connection data', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        json: { Key: 'ck1', Name: 'MyConn', Folder: { Id: 'fid', FullyQualifiedName: 'fqn', Path: '/p' } },
      }));
      const result = await retrieveConnection(createConfig(), 'conn-key');
      expect(result.key).toBe('ck1');
      expect(result.name).toBe('MyConn');
      expect(result.folder).toBeDefined();
      expect(result.folder!.folderKey).toBe('fid');
    });

    it('should handle connection without folder', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        json: { Key: 'ck1', Name: 'MyConn' },
      }));
      const result = await retrieveConnection(createConfig(), 'conn-key');
      expect(result.folder).toBeNull();
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
      await expect(retrieveConnection(createConfig(), 'missing')).rejects.toThrow('not found');
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500 }));
      await expect(retrieveConnection(createConfig(), 'x')).rejects.toThrow();
    });
  });

  describe('createReferencedResource', () => {
    const request = {
      key: 'rk1',
      kind: 'asset',
      type: null,
      folder: { folderKey: 'fk', fullyQualifiedName: 'fqn', path: '/p' },
    };

    it('should create resource successfully', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        json: { status: 'Added', resource: { id: 'r1' }, saved: true },
      }));
      const result = await createReferencedResource(createConfig(), 'sol-1', request, 'lock-key');
      expect(result.status).toBe('ADDED');
      expect(result.saved).toBe(true);
    });

    it('should handle UNCHANGED status', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        json: { status: 'Unchanged', resource: {}, saved: false },
      }));
      const result = await createReferencedResource(createConfig(), 'sol-1', request, null);
      expect(result.status).toBe('UNCHANGED');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, text: '{"Detail":"bad"}' }));
      await expect(
        createReferencedResource(createConfig(), 'sol-1', request, null)
      ).rejects.toThrow();
    });
  });
});
