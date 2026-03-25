import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEnvironmentConfig, sanitizeAppName, validateEnvironment, isValidAppName, atomicWriteFileSync } from '../../../src/utils/env-config.js';
import { createMockLogger, REQUIRED_ENV_VARS } from '../../helpers/index.js';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
  };
});

describe('env-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('sanitizeAppName', () => {
    it.each([
      ['my-app', 'my-app', false, 'already valid'],
      ['MyApp', 'myapp', true, 'uppercase'],
      ['my_app', 'my-app', true, 'underscores'],
      ['my@app!name', 'myappname', true, 'invalid characters'],
      ['my---app', 'my-app', true, 'multiple hyphens'],
      ['-my-app-', 'my-app', true, 'leading/trailing hyphens'],
      ['', '', false, 'empty string'],
      ['@#$%', '', true, 'only invalid chars'],
    ])('should handle %s (%s)', (input, expected, modified) => {
      const result = sanitizeAppName(input);
      expect(result.sanitized).toBe(expected);
      expect(result.isModifiedd).toBe(modified);
    });
  });

  describe('isValidAppName', () => {
    it.each([
      ['my-app', true],
      ['app123', true],
      ['a', true],
      ['MyApp', false],
      ['my@app', false],
      ['my app', false],
    ])('should return %s for "%s"', (name, expected) => {
      expect(isValidAppName(name)).toBe(expected);
    });
  });

  describe('getEnvironmentConfig', () => {
    const mockLogger = createMockLogger();

    it('should return config when all required vars are present via flags', () => {
      const flags = {
        baseUrl: 'https://cloud.uipath.com',
        orgId: 'org-123',
        tenantId: 'tenant-456',
        accessToken: 'token-789',
      };

      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, flags);

      expect(result).not.toBeNull();
      expect(result!.baseUrl).toBe(flags.baseUrl);
      expect(result!.orgId).toBe(flags.orgId);
      expect(result!.tenantId).toBe(flags.tenantId);
      expect(result!.accessToken).toBe(flags.accessToken);
    });

    it('should return config from environment variables', () => {
      process.env.UIPATH_BASE_URL = 'https://staging.uipath.com';
      process.env.UIPATH_ORG_ID = 'env-org';
      process.env.UIPATH_TENANT_ID = 'env-tenant';
      process.env.UIPATH_ACCESS_TOKEN = 'env-token';

      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {});

      expect(result).not.toBeNull();
      expect(result!.orgId).toBe('env-org');
    });

    it('should prefer flags over env vars', () => {
      process.env.UIPATH_ORG_ID = 'env-org';

      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {
        baseUrl: 'https://cloud.uipath.com',
        orgId: 'flag-org',
        tenantId: 'tenant',
        accessToken: 'token',
      });

      expect(result!.orgId).toBe('flag-org');
    });

    it('should return null when required vars are missing', () => {
      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {});
      expect(result).toBeNull();
    });

    it('should use default base URL when not provided', () => {
      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {
        orgId: 'org-123',
        tenantId: 'tenant-456',
        accessToken: 'token-789',
      });

      expect(result).not.toBeNull();
      expect(result!.baseUrl).toBe('https://cloud.uipath.com');
    });

    it('should add https protocol when missing', () => {
      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {
        baseUrl: 'cloud.uipath.com',
        orgId: 'org',
        tenantId: 'tenant',
        accessToken: 'token',
      });

      expect(result!.baseUrl).toBe('https://cloud.uipath.com');
    });

    it('should resolve alt env var names (UIPATH_URL for UIPATH_BASE_URL)', () => {
      process.env.UIPATH_URL = 'https://alt.uipath.com';
      process.env.UIPATH_ORG_ID = 'org';
      process.env.UIPATH_TENANT_ID = 'tenant';
      process.env.UIPATH_ACCESS_TOKEN = 'token';

      const result = getEnvironmentConfig([...REQUIRED_ENV_VARS], mockLogger, {});

      expect(result).not.toBeNull();
      expect(result!.baseUrl).toBe('https://alt.uipath.com');
    });
  });

  describe('validateEnvironment', () => {
    const mockLogger = createMockLogger();

    it('should return isValid true when all vars present', () => {
      const result = validateEnvironment([...REQUIRED_ENV_VARS], mockLogger, {
        baseUrl: 'https://cloud.uipath.com',
        orgId: 'org',
        tenantId: 'tenant',
        accessToken: 'token',
      });

      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should return isValid false with missing vars list', () => {
      const result = validateEnvironment([...REQUIRED_ENV_VARS], mockLogger, {});

      expect(result.isValid).toBe(false);
      expect(result.missingVars!.length).toBeGreaterThan(0);
    });
  });

  describe('atomicWriteFileSync', () => {
    it('should write string content to temp file then rename', () => {
      atomicWriteFileSync('./test-output/test.json', 'hello');
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.tmp'), 'hello');
      expect(fs.renameSync).toHaveBeenCalled();
    });

    it('should stringify object content', () => {
      atomicWriteFileSync('./test-output/test.json', { key: 'value' });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        JSON.stringify({ key: 'value' }, null, 2)
      );
    });
  });
});
