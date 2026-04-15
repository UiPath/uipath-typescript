import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/utils/env-config.js', () => ({
  getEnvironmentConfig: vi.fn(),
}));

vi.mock('../../../src/core/webapp-file-handler/index.js', () => ({
  runPull: vi.fn().mockResolvedValue(undefined),
  isProjectRootDirectory: vi.fn().mockReturnValue(true),
}));

import { createMockLogger, createMockEnvConfig } from '../../helpers/index.js';
import { executePull } from '../../../src/actions/pull.js';
import { getEnvironmentConfig } from '../../../src/utils/env-config.js';
import { runPull } from '../../../src/core/webapp-file-handler/index.js';

describe('executePull', () => {
  const mockLogger = createMockLogger();
  const mockEnvConfig = createMockEnvConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
  });

  afterEach(() => {
    delete process.env.UIPATH_PROJECT_ID;
  });

  it('should pull successfully with project ID from options', async () => {
    await executePull({ projectId: 'proj-123', logger: mockLogger });

    expect(runPull).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'proj-123' }), expect.any(Object));
  });

  it('should use project ID from env', async () => {
    process.env.UIPATH_PROJECT_ID = 'env-proj';

    await executePull({ logger: mockLogger });

    expect(runPull).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'env-proj' }), expect.any(Object));
  });

  it('should throw when no project ID available', async () => {
    await expect(executePull({ logger: mockLogger })).rejects.toThrow(/Project ID is required/);
  });

  it('should throw when env config is missing', async () => {
    vi.mocked(getEnvironmentConfig).mockReturnValue(null);

    await expect(executePull({ projectId: 'proj', logger: mockLogger })).rejects.toThrow(
      'Missing required configuration',
    );
  });

  it('should pass overwrite option', async () => {
    await executePull({ projectId: 'proj', overwrite: true, logger: mockLogger });

    expect(runPull).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ overwrite: true }));
  });

  it('should pass flag overrides to getEnvironmentConfig', async () => {
    const overrides = {
      baseUrl: 'https://staging.uipath.com',
      orgId: 'custom-org',
      tenantId: 'custom-tenant',
      accessToken: 'custom-token',
    };

    await executePull({ projectId: 'proj', ...overrides, logger: mockLogger });

    expect(getEnvironmentConfig).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining(overrides),
    );
  });

  it('should use target dir when specified', async () => {
    await executePull({ projectId: 'proj', targetDir: './output', logger: mockLogger });

    expect(runPull).toHaveBeenCalledWith(
      expect.objectContaining({ rootDir: expect.stringContaining('output') }),
      expect.any(Object),
    );
  });
});
