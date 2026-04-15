import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

vi.mock('../../../../src/core/webapp-file-handler/api.js', () => ({
  fetchRemoteStructure: vi.fn(),
  downloadRemoteFile: vi.fn(),
}));

vi.mock('../../../../src/core/webapp-file-handler/pull-validation.js', () => ({
  validateProjectType: vi.fn(),
}));

vi.mock('../../../../src/telemetry/index.js', () => ({
  cliTelemetryClient: { track: vi.fn() },
}));

import { runPull } from '../../../../src/core/webapp-file-handler/run-pull.js';
import * as api from '../../../../src/core/webapp-file-handler/api.js';
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

describe('run-pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rootDir exists and is a directory
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true, isFile: () => true } as any);
  });

  it('should throw when rootDir does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await expect(runPull(createConfig(), { overwrite: false })).rejects.toThrow();
  });

  it('should throw when rootDir is not a directory', async () => {
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
    await expect(runPull(createConfig(), { overwrite: false })).rejects.toThrow();
  });

  it('should throw when project has no files or name', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({ name: '', files: [], folders: [] });
    await expect(runPull(createConfig(), { overwrite: false })).rejects.toThrow();
  });

  it('should handle empty source files gracefully', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'my-project',
      files: [{ id: 'f1', name: 'rootfile.txt' }],
      folders: [],
    });
    const config = createConfig();
    await runPull(config, { overwrite: false });
    expect(config.logger.log).toHaveBeenCalled();
  });

  it('should download source files and write them locally', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'my-project',
      files: [],
      folders: [{ id: 'd1', name: 'source', files: [{ id: 'f1', name: 'app.tsx' }], folders: [] }],
    });
    vi.mocked(api.downloadRemoteFile).mockResolvedValue(Buffer.from('file content'));

    const config = createConfig();
    await runPull(config, { overwrite: true });
    expect(api.downloadRemoteFile).toHaveBeenCalledWith(config, 'f1');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should exclude build dir files from pull', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'proj',
      files: [],
      folders: [
        {
          id: 'd1',
          name: 'source',
          files: [
            { id: 'meta', name: 'push_metadata.json' },
            { id: 'f1', name: 'app.tsx' },
          ],
          folders: [{ id: 'd2', name: 'build', files: [{ id: 'f2', name: 'bundle.js' }], folders: [] }],
        },
      ],
    });
    vi.mocked(api.downloadRemoteFile).mockImplementation(async (_cfg, fileId) => {
      if (fileId === 'meta') {
        return Buffer.from(JSON.stringify({ buildDir: 'build' }));
      }
      return Buffer.from('content');
    });

    const config = createConfig();
    await runPull(config, { overwrite: true });
    const downloadCalls = vi.mocked(api.downloadRemoteFile).mock.calls;
    const downloadedFileIds = downloadCalls.map((c) => c[1]);
    expect(downloadedFileIds).toContain('meta');
    expect(downloadedFileIds).toContain('f1');
  });

  it('should throw when overwrite conflicts exist and no prompt', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'proj',
      files: [],
      folders: [{ id: 'd1', name: 'source', files: [{ id: 'f1', name: 'app.tsx' }], folders: [] }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await expect(runPull(createConfig(), { overwrite: false })).rejects.toThrow();
  });

  it('should call promptOverwrite and proceed when it returns true', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'proj',
      files: [],
      folders: [{ id: 'd1', name: 'source', files: [{ id: 'f1', name: 'app.tsx' }], folders: [] }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(api.downloadRemoteFile).mockResolvedValue(Buffer.from('data'));

    const promptOverwrite = vi.fn().mockResolvedValue(true);
    await runPull(createConfig(), { overwrite: false, promptOverwrite });
    expect(promptOverwrite).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should throw when promptOverwrite returns false', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'proj',
      files: [],
      folders: [{ id: 'd1', name: 'source', files: [{ id: 'f1', name: 'app.tsx' }], folders: [] }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const promptOverwrite = vi.fn().mockResolvedValue(false);
    await expect(runPull(createConfig(), { overwrite: false, promptOverwrite })).rejects.toThrow();
  });

  it('should throw when file download fails', async () => {
    vi.mocked(api.fetchRemoteStructure).mockResolvedValue({
      name: 'proj',
      files: [],
      folders: [{ id: 'd1', name: 'source', files: [{ id: 'f1', name: 'app.tsx' }], folders: [] }],
    });
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      return p === '/root';
    });
    vi.mocked(api.downloadRemoteFile).mockRejectedValue(new Error('download error'));

    await expect(runPull(createConfig(), { overwrite: true })).rejects.toThrow('failed to download');
  });
});
