import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    pathExists: vi.fn(),
    readJson: vi.fn(),
    remove: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/env-config.js', () => ({
  atomicWriteJson: vi.fn(),
}));

vi.mock('../../../../src/auth/utils/date.js', () => ({
  calculateExpirationTime: vi.fn().mockReturnValue(Date.now() + 3600000),
}));

vi.mock('../../../../src/auth/utils/url.js', () => ({
  getBaseUrl: vi.fn().mockReturnValue('https://cloud.uipath.com'),
}));

import fs from 'fs-extra';
import { saveTokensWithTenant, loadTokens, clearTokens, isTokenExpired } from '../../../../src/auth/core/token-manager.js';
import type { StoredAuth } from '../../../../src/auth/core/token-manager.js';

const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  scope: 'openid',
  idToken: 'id-token',
};

const mockTenant = {
  tenantId: 't1',
  tenantName: 'Tenant1',
  tenantDisplayName: 'Tenant 1',
  organizationId: 'org-1',
  organizationName: 'Org1',
  organizationDisplayName: 'Org 1',
};

describe('auth/core/token-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveTokensWithTenant', () => {
    it('should save tokens and update env file', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any);
      await saveTokensWithTenant(mockTokens, 'cloud', mockTenant);
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should include folder key in env file when provided', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any);
      await saveTokensWithTenant(mockTokens, 'cloud', mockTenant, 'folder-key-1');
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('folder-key-1');
    });
  });

  describe('loadTokens', () => {
    it('should return tokens when auth file exists', async () => {
      const stored: StoredAuth = {
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'openid',
        domain: 'cloud',
      };
      vi.mocked(fs.pathExists).mockResolvedValue(true as any);
      vi.mocked(fs.readJson).mockResolvedValue(stored);
      const result = await loadTokens();
      expect(result).toEqual(stored);
    });

    it('should return null when auth file does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any);
      const result = await loadTokens();
      expect(result).toBeNull();
    });

    it('should return null on read error', async () => {
      vi.mocked(fs.pathExists).mockRejectedValue(new Error('read error'));
      const result = await loadTokens();
      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should remove auth file and clear env vars', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any);
      vi.mocked(fs.readFile).mockResolvedValue('UIPATH_ACCESS_TOKEN=old\n');
      await clearTokens();
      expect(fs.remove).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle missing auth file gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any);
      await clearTokens();
      expect(fs.remove).not.toHaveBeenCalled();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when token has expired', () => {
      const auth: StoredAuth = {
        accessToken: 'token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer',
        scope: 'openid',
        domain: 'cloud',
      };
      expect(isTokenExpired(auth)).toBe(true);
    });

    it('should return false when token is still valid', () => {
      const auth: StoredAuth = {
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'openid',
        domain: 'cloud',
      };
      expect(isTokenExpired(auth)).toBe(false);
    });
  });
});
