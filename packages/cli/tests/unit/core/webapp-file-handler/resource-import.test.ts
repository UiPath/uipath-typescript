import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual, readFileSync: vi.fn(), existsSync: vi.fn() };
});

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  getSolutionId: vi.fn().mockResolvedValue('sol-1'),
  findResourceInCatalog: vi.fn(),
  retrieveConnection: vi.fn(),
  mapFolder: vi.fn().mockReturnValue({ folderKey: 'key', fullyQualifiedName: 'fqn', path: '/path' }),
  createReferencedResource: vi.fn(),
}));

import * as api from '../../../../src/core/webapp-file-handler/api.js';
import { runImportReferencedResources } from '../../../../src/core/webapp-file-handler/resource-import.js';
import type { WebAppProjectConfig } from '../../../../src/core/webapp-file-handler/types.js';
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

describe('resource-import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runImportReferencedResources', () => {
    it('should return early when bindings.json does not exist', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw Object.assign(new Error(), { code: 'ENOENT' });
      });
      await runImportReferencedResources(createConfig(), null);
      expect(api.getSolutionId).not.toHaveBeenCalled();
    });

    it('should return early when bindings has no resources', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ version: '1', resources: [] }));
      await runImportReferencedResources(createConfig(), null);
      expect(api.getSolutionId).not.toHaveBeenCalled();
    });

    it('should process connection resources', async () => {
      const bindings = {
        version: '1',
        resources: [
          {
            resource: 'connection',
            key: 'conn-1',
            value: {
              name: { defaultValue: 'MyConn', isExpression: false, displayName: 'Name' },
              ConnectionId: { defaultValue: 'conn-id', isExpression: false, displayName: 'Connection' },
            },
            metadata: { Connector: 'http' },
          },
        ],
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(bindings));
      vi.mocked(api.retrieveConnection).mockResolvedValue({
        key: 'conn-key',
        name: 'MyConn',
        folder: { folderKey: 'fk', fullyQualifiedName: 'fqn', path: '/p' },
      });
      vi.mocked(api.createReferencedResource).mockResolvedValue({ status: 'ADDED', resource: {}, saved: true });
      await runImportReferencedResources(createConfig(), 'lock');
      expect(api.retrieveConnection).toHaveBeenCalled();
      expect(api.createReferencedResource).toHaveBeenCalled();
    });

    it('should process catalog resources (asset, bucket, etc.)', async () => {
      const bindings = {
        version: '1',
        resources: [
          {
            resource: 'asset',
            key: 'asset-1',
            value: {
              name: { defaultValue: 'MyAsset', isExpression: false, displayName: 'Name' },
              folderPath: { defaultValue: '/Shared', isExpression: false, displayName: 'Folder' },
            },
          },
        ],
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(bindings));
      vi.mocked(api.findResourceInCatalog).mockResolvedValue({
        resourceKey: 'rk',
        name: 'MyAsset',
        resourceType: 'asset',
        resourceSubType: null,
        folders: [{ folderKey: 'fk', fullyQualifiedName: 'fqn', path: '/Shared' }],
      });
      vi.mocked(api.createReferencedResource).mockResolvedValue({ status: 'ADDED', resource: {}, saved: true });
      await runImportReferencedResources(createConfig(), null);
      expect(api.findResourceInCatalog).toHaveBeenCalled();
    });

    it('should handle parse errors gracefully', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json{');
      const config = createConfig();
      await runImportReferencedResources(config, null);
      expect(config.logger.log).toHaveBeenCalled();
    });
  });
});
