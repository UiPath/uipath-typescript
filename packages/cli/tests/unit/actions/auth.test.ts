import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/auth/core/token-manager.js', () => ({
  loadTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(),
  saveTokensWithTenant: vi.fn(),
}));

vi.mock('../../../src/auth/core/oidc.js', () => ({
  generatePKCEChallenge: vi.fn(),
  getAuthorizationUrl: vi.fn(),
  authenticateWithClientCredentials: vi.fn(),
}));

vi.mock('../../../src/auth/server/auth-server.js', () => ({
  AuthServer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue({ accessToken: 'test-token', expiresIn: 3600 }),
    stop: vi.fn(),
  })),
}));

vi.mock('../../../src/auth/services/portal.js', () => ({
  getTenantsAndOrganization: vi.fn(),
  selectTenantInteractive: vi.fn(),
}));

vi.mock('../../../src/auth/services/folder.js', () => ({
  selectFolderInteractive: vi.fn(),
}));

vi.mock('../../../src/auth/utils/port-checker.js', () => ({
  isPortAvailable: vi.fn(),
}));

vi.mock('open', () => ({ default: vi.fn() }));

import { executeAuth } from '../../../src/actions/auth.js';
import { loadTokens, clearTokens, isTokenExpired } from '../../../src/auth/core/token-manager.js';
import { authenticateWithClientCredentials } from '../../../src/auth/core/oidc.js';
import { isPortAvailable } from '../../../src/auth/utils/port-checker.js';
import inquirer from 'inquirer';

describe('executeAuth', () => {
  const mockLogger = { log: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logout', () => {
    it('should call clearTokens when logout option is true', async () => {
      vi.mocked(clearTokens).mockResolvedValue(undefined);
      await executeAuth({ logout: true, logger: mockLogger });
      expect(clearTokens).toHaveBeenCalled();
    });

    it('should throw when clearTokens fails', async () => {
      vi.mocked(clearTokens).mockRejectedValue(new Error('fs error'));
      await expect(executeAuth({ logout: true, logger: mockLogger })).rejects.toThrow('fs error');
    });
  });

  describe('client credentials', () => {
    it('should authenticate with client credentials when both clientId and clientSecret provided', async () => {
      vi.mocked(authenticateWithClientCredentials).mockResolvedValue({
        accessToken: 'cc-token',
        expiresIn: 3600,
      } as any);

      await executeAuth({ clientId: 'my-client', clientSecret: 'my-secret', logger: mockLogger });

      expect(authenticateWithClientCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'my-client', clientSecret: 'my-secret' }),
      );
    });

    it('should throw when client credentials auth fails', async () => {
      vi.mocked(authenticateWithClientCredentials).mockRejectedValue(new Error('Invalid credentials'));

      await expect(executeAuth({ clientId: 'bad', clientSecret: 'bad', logger: mockLogger })).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('existing auth check', () => {
    it('should skip auth when already authenticated and user declines re-auth', async () => {
      vi.mocked(loadTokens).mockResolvedValue({
        accessToken: 'existing-token',
        expiresAt: Date.now() + 60000,
        domain: 'cloud',
        organizationId: 'org',
        organizationName: 'Test Org',
        tenantName: 'tenant',
      } as any);
      vi.mocked(isTokenExpired).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({ reauth: false });

      await executeAuth({ logger: mockLogger });

      expect(loadTokens).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Already authenticated'));
    });
  });

  describe('domain selection', () => {
    it('should attempt PKCE flow with alpha domain when alpha option set', async () => {
      vi.mocked(loadTokens).mockResolvedValue(null);
      vi.mocked(isPortAvailable).mockResolvedValue(true);

      await expect(executeAuth({ alpha: true, force: true, logger: mockLogger })).rejects.toThrow();
    });

    it('should attempt PKCE flow with staging domain when staging option set', async () => {
      vi.mocked(loadTokens).mockResolvedValue(null);
      vi.mocked(isPortAvailable).mockResolvedValue(true);

      await expect(executeAuth({ staging: true, force: true, logger: mockLogger })).rejects.toThrow();
    });
  });

  describe('port availability', () => {
    it('should throw when no ports are available', async () => {
      vi.mocked(loadTokens).mockResolvedValue(null);
      vi.mocked(isPortAvailable).mockResolvedValue(false);

      await expect(executeAuth({ force: true, logger: mockLogger })).rejects.toThrow(/ports/i);
    });
  });
});
