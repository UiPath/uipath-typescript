import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    createReadStream: vi.fn(),
  };
});

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('form-data', () => ({
  default: vi.fn().mockImplementation(() => ({
    append: vi.fn(),
    getHeaders: vi.fn().mockReturnValue({}),
  })),
}));
vi.mock('../../../src/utils/env-config.js', () => ({
  getEnvironmentConfig: vi.fn(),
  atomicWriteFileSync: vi.fn(),
}));

import { createMockLogger, createMockEnvConfig, createMockFetchResponse } from '../../helpers/index.js';
import { executePublish } from '../../../src/actions/publish.js';
import { getEnvironmentConfig } from '../../../src/utils/env-config.js';
import fetch from 'node-fetch';

describe('executePublish', () => {
  const mockLogger = createMockLogger();
  const mockEnvConfig = createMockEnvConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
  });

  it('should throw when env config is missing', async () => {
    vi.mocked(getEnvironmentConfig).mockReturnValue(null);

    await expect(executePublish({ logger: mockLogger })).rejects.toThrow('Missing required configuration');
  });

  it('should throw when .uipath dir not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(executePublish({ logger: mockLogger })).rejects.toThrow(/\.uipath directory not found/);
  });

  it('should throw when no nupkg files found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    await expect(executePublish({ logger: mockLogger })).rejects.toThrow(/No .nupkg files found/);
  });

  it('should publish single package automatically', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['MyApp.1.0.0.nupkg'] as any);
    vi.mocked(fs.createReadStream).mockReturnValue('stream' as any);

    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse() as any)
      .mockResolvedValueOnce(
        createMockFetchResponse({
          json: { definition: { systemName: 'my-app-system' }, deployVersion: 1 },
        }) as any,
      );

    await executePublish({ logger: mockLogger });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should select matching package by name', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['AppA.1.0.0.nupkg', 'AppB.2.0.0.nupkg'] as any);
    vi.mocked(fs.createReadStream).mockReturnValue('stream' as any);

    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse() as any)
      .mockResolvedValueOnce(
        createMockFetchResponse({
          json: { definition: { systemName: 'app-b' } },
        }) as any,
      );

    await executePublish({ name: 'AppB', logger: mockLogger });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw when named package not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['AppA.1.0.0.nupkg'] as any);

    await expect(executePublish({ name: 'NonExistent', logger: mockLogger })).rejects.toThrow(
      /No package found matching name/,
    );
  });

  it('should handle 409 conflict (package already exists)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['MyApp.1.0.0.nupkg'] as any);
    vi.mocked(fs.createReadStream).mockReturnValue('stream' as any);

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createMockFetchResponse({
          ok: false,
          status: 409,
          json: { errorCode: 1004, message: 'already exists' },
        }) as any,
      )
      .mockResolvedValueOnce(
        createMockFetchResponse({
          json: { definition: { systemName: 'my-app' } },
        }) as any,
      );

    await executePublish({ logger: mockLogger });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
