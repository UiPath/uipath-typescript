import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
  };
});

vi.mock('node-fetch', () => ({ default: vi.fn() }));

vi.mock('../../../src/utils/env-config.js', () => ({
  getEnvironmentConfig: vi.fn(),
  sanitizeAppName: vi.fn((name: string) => ({ sanitized: name, isModified: false })),
  atomicWriteFileSync: vi.fn(),
}));

import { createMockLogger, createMockEnvConfig, createMockFetchResponse } from '../../helpers/index.js';
import { executeDeploy } from '../../../src/actions/deploy.js';
import { getEnvironmentConfig } from '../../../src/utils/env-config.js';
import fetch from 'node-fetch';

describe('executeDeploy', () => {
  const mockLogger = createMockLogger();
  const mockEnvConfig = createMockEnvConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
  });

  it('should throw when env config is missing', async () => {
    vi.mocked(getEnvironmentConfig).mockReturnValue(null);

    await expect(
      executeDeploy({ name: 'my-app', logger: mockLogger })
    ).rejects.toThrow('Missing required configuration');
  });

  it('should deploy a new app when not already deployed', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse({ json: { value: [] } }) as any)
      .mockResolvedValueOnce(createMockFetchResponse({
        json: { value: [{ systemName: 'my-app-system', title: 'my-app', appVersion: '1.0.0', deployVersion: 1 }] },
      }) as any)
      .mockResolvedValueOnce(createMockFetchResponse({ json: { id: 'deploy-id-123' } }) as any);

    vi.mocked(fs.existsSync).mockReturnValue(false);

    await executeDeploy({ name: 'my-app', logger: mockLogger });

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should upgrade when app is already deployed', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse({
        json: { value: [{ id: 'app-id', title: 'my-app', systemName: 'my-app', semVersion: '1.0.0', deployVersion: 1 }] },
      }) as any)
      .mockResolvedValueOnce(createMockFetchResponse({
        json: { value: [{ systemName: 'my-app', title: 'my-app', appVersion: '2.0.0', deployVersion: 2 }] },
      }) as any)
      .mockResolvedValueOnce(createMockFetchResponse() as any);

    vi.mocked(fs.existsSync).mockReturnValue(false);

    await executeDeploy({ name: 'my-app', logger: mockLogger });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/apps/'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should throw when app not published yet', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse({ json: { value: [] } }) as any)
      .mockResolvedValueOnce(createMockFetchResponse({ json: { value: [] } }) as any);

    await expect(
      executeDeploy({ name: 'my-app', logger: mockLogger })
    ).rejects.toThrow(/not been published/);
  });

  it('should throw when deployed app has no deploy version during upgrade', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createMockFetchResponse({
        json: { value: [{ id: 'app-id', title: 'my-app', systemName: 'my-app', semVersion: '1.0.0' }] },
      }) as any)
      .mockResolvedValueOnce(createMockFetchResponse({
        json: { value: [{ systemName: 'my-app', title: 'my-app', appVersion: '2.0.0' }] },
      }) as any);

    await expect(
      executeDeploy({ name: 'my-app', logger: mockLogger })
    ).rejects.toThrow(/deploy version/i);
  });
});
