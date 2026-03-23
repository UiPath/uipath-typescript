import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
  };
});

vi.mock('../../../src/utils/env-config.js', () => ({
  getEnvironmentConfig: vi.fn(),
  sanitizeAppName: vi.fn((name: string) => ({ sanitized: name, isModifiedd: false })),
}));

vi.mock('node-fetch', () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ isUnique: true }),
    headers: { get: vi.fn() },
  }),
}));

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(Buffer.from('fake-nupkg')),
  })),
}));
import { createMockLogger, createMockEnvConfig } from '../../helpers/index.js';
import { executePack } from '../../../src/actions/pack.js';
import { getEnvironmentConfig } from '../../../src/utils/env-config.js';
import inquirer from 'inquirer';

describe('executePack', () => {
  const mockLogger = createMockLogger();
  const mockEnvConfig = createMockEnvConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
  });

  it('should throw when dist directory does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(
      executePack({ dist: './dist', name: 'test-app', logger: mockLogger })
    ).rejects.toThrow(/Invalid dist directory/);
  });

  it('should throw when dist directory is empty', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    await expect(
      executePack({ dist: './dist', name: 'test-app', logger: mockLogger })
    ).rejects.toThrow(/Invalid dist directory/);
  });

  it('should throw when env config is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReturnValue(['index.html'] as any);
    vi.mocked(getEnvironmentConfig).mockReturnValue(null);

    await expect(
      executePack({ dist: './dist', name: 'test-app', logger: mockLogger })
    ).rejects.toThrow('Missing required configuration');
  });

  it('should handle dry-run mode without creating files', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReturnValue(['index.html'] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      clientId: '', scope: '', orgName: '', tenantName: '', baseUrl: '', redirectUri: '',
    }));

    await executePack({ dist: './dist', name: 'test-app', dryRun: true, logger: mockLogger });

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Package Preview')
    );
  });

  it('should throw when package name is required but not provided (non-TTY)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReturnValue(['index.html'] as any);
    vi.mocked(inquirer.prompt).mockResolvedValue({ name: '' });

    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

    try {
      await expect(
        executePack({ dist: './dist', logger: mockLogger })
      ).rejects.toThrow(/Package name is required/);
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    }
  });
});
