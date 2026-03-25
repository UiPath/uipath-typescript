import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('../../../src/utils/env-config.js', () => ({
  getEnvironmentConfig: vi.fn(),
}));

vi.mock('../../../src/core/webapp-file-handler/index.js', () => ({
  WebAppFileHandler: vi.fn().mockImplementation(() => ({
    push: vi.fn().mockResolvedValue(undefined),
    importReferencedResources: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/core/webapp-file-handler/api.js', () => ({
  fetchRemoteStructure: vi.fn().mockResolvedValue({ files: [], folders: [] }),
  downloadRemoteFile: vi.fn(),
}));

vi.mock('../../../src/core/webapp-file-handler/structure.js', async () => {
  const actual = await vi.importActual('../../../src/core/webapp-file-handler/structure.js');
  return {
    ...actual,
    getRemoteFilesMap: vi.fn().mockReturnValue(new Map()),
  };
});

vi.mock('../../../src/core/preconditions.js', () => ({
  Preconditions: { validate: vi.fn() },
}));

vi.mock('../../../src/utils/push-validation.js', () => ({
  validatePushFiles: vi.fn().mockResolvedValue(undefined),
}));

import { createMockLogger, createMockEnvConfig } from '../../helpers/index.js';
import { executePush } from '../../../src/actions/push.js';
import { getEnvironmentConfig } from '../../../src/utils/env-config.js';
import { WebAppFileHandler } from '../../../src/core/webapp-file-handler/index.js';
import { Preconditions } from '../../../src/core/preconditions.js';
import * as api from '../../../src/core/webapp-file-handler/api.js';
import { getRemoteFilesMap } from '../../../src/core/webapp-file-handler/structure.js';

describe('executePush', () => {
  const mockLogger = createMockLogger();
  const mockEnvConfig = createMockEnvConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
    vi.mocked(Preconditions.validate).mockImplementation(() => {});
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({ files: [], folders: [] } as any);
    vi.mocked(getRemoteFilesMap).mockReturnValue(new Map());
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    delete process.env.UIPATH_PROJECT_ID;
  });

  it('should push successfully with project ID from options', async () => {
    await executePush({ projectId: 'proj-123', logger: mockLogger });

    expect(Preconditions.validate).toHaveBeenCalled();
    expect(WebAppFileHandler).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-123' })
    );
  });

  it('should use project ID from env when not in options', async () => {
    process.env.UIPATH_PROJECT_ID = 'env-proj-456';

    await executePush({ logger: mockLogger });

    expect(WebAppFileHandler).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'env-proj-456' })
    );
  });

  it('should throw when env config is missing', async () => {
    vi.mocked(getEnvironmentConfig).mockReturnValue(null);

    await expect(
      executePush({ projectId: 'proj', logger: mockLogger })
    ).rejects.toThrow('Missing required configuration');
  });

  it('should throw when no project ID and non-TTY', async () => {
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

    await expect(
      executePush({ logger: mockLogger })
    ).rejects.toThrow(/Project ID is required/);

    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
  });

  it('should throw when Preconditions.validate fails', async () => {
    vi.mocked(Preconditions.validate).mockImplementation(() => {
      throw new Error('Build directory not found');
    });

    await expect(
      executePush({ projectId: 'proj', logger: mockLogger })
    ).rejects.toThrow('Build directory not found');
  });

  it('should use custom buildDir when provided', async () => {
    await executePush({ projectId: 'proj-123', buildDir: 'build', logger: mockLogger });

    expect(WebAppFileHandler).toHaveBeenCalledWith(
      expect.objectContaining({ bundlePath: 'build' })
    );
  });

  it('should pass ignoreResources to handler', async () => {
    const handler = {
      push: vi.fn().mockResolvedValue(undefined),
      importReferencedResources: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(WebAppFileHandler).mockImplementation(() => handler as any);

    await executePush({ projectId: 'proj', ignoreResources: true, logger: mockLogger });

    expect(handler.importReferencedResources).toHaveBeenCalledWith(true);
  });

  it('should pass flag overrides to getEnvironmentConfig', async () => {
    const overrides = {
      baseUrl: 'https://custom.uipath.com',
      orgId: 'custom-org',
      tenantId: 'custom-tenant',
      accessToken: 'custom-token',
    };

    await executePush({ projectId: 'proj', ...overrides, logger: mockLogger });

    expect(getEnvironmentConfig).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining(overrides)
    );
  });

  describe('action app detection from remote webAppManifest.json', () => {
    const manifestFileEntry = { id: 'manifest-file-id', name: 'webAppManifest.json' };

    it('should throw when remote manifest is CodedAction but action-schema.json is missing locally', async () => {
      const remoteFilesMap = new Map([['webAppManifest.json', manifestFileEntry]]);
      vi.mocked(getRemoteFilesMap).mockReturnValue(remoteFilesMap as any);
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(
        Buffer.from(JSON.stringify({ type: 'Coded', solutionResourceSubType: 'CodedAction' }))
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        executePush({ projectId: 'proj', logger: mockLogger })
      ).rejects.toThrow(/action-schema/i);
    });

    it('should succeed when remote manifest is CodedAction and action-schema.json exists', async () => {
      const remoteFilesMap = new Map([['webAppManifest.json', manifestFileEntry]]);
      vi.mocked(getRemoteFilesMap).mockReturnValue(remoteFilesMap as any);
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(
        Buffer.from(JSON.stringify({ type: 'Coded', solutionResourceSubType: 'CodedAction' }))
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await executePush({ projectId: 'proj', logger: mockLogger });

      expect(WebAppFileHandler).toHaveBeenCalled();
    });

    it('should not require action-schema.json when remote manifest is Coded', async () => {
      const remoteFilesMap = new Map([['webAppManifest.json', manifestFileEntry]]);
      vi.mocked(getRemoteFilesMap).mockReturnValue(remoteFilesMap as any);
      vi.mocked(api.downloadRemoteFile).mockResolvedValue(
        Buffer.from(JSON.stringify({ type: 'Coded', solutionResourceSubType: 'Coded' }))
      );

      await executePush({ projectId: 'proj', logger: mockLogger });

      expect(WebAppFileHandler).toHaveBeenCalled();
    });

    it('should not require action-schema.json when no remote manifest exists', async () => {
      vi.mocked(getRemoteFilesMap).mockReturnValue(new Map());

      await executePush({ projectId: 'proj', logger: mockLogger });

      expect(WebAppFileHandler).toHaveBeenCalled();
    });
  });
});
