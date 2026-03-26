import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('../../../../src/auth/core/oidc.js', () => ({
  parseJWT: vi.fn(),
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

import { getTenantsAndOrganization, selectTenantInteractive } from '../../../../src/auth/services/portal.js';
import { parseJWT } from '../../../../src/auth/core/oidc.js';

describe('auth/services/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTenantsAndOrganization', () => {
    it('should fetch tenants and organization', async () => {
      vi.mocked(parseJWT).mockReturnValue({
        prtId: 'prt-1',
        sub: 'u', clientId: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, authTime: 1,
      });
      const responseData = {
        tenants: [{ id: 't1', name: 'Tenant1' }],
        organization: { id: 'org-1', name: 'Org1' },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      });

      const result = await getTenantsAndOrganization('token', 'cloud');
      expect(result.tenants).toHaveLength(1);
      expect(result.organization.id).toBe('org-1');
    });

    it('should use organizationId when prtId is missing', async () => {
      vi.mocked(parseJWT).mockReturnValue({
        organizationId: 'org-from-token',
        sub: 'u', clientId: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, authTime: 1,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ tenants: [], organization: { id: 'o', name: 'O' } }),
      });
      await getTenantsAndOrganization('token', 'cloud');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw when no organization ID in token', async () => {
      vi.mocked(parseJWT).mockReturnValue({
        sub: 'u', clientId: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, authTime: 1,
      });
      await expect(getTenantsAndOrganization('token', 'cloud')).rejects.toThrow('No organization ID');
    });

    it('should throw on 401 response', async () => {
      vi.mocked(parseJWT).mockReturnValue({
        prtId: 'prt-1',
        sub: 'u', clientId: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, authTime: 1,
      });
      mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(getTenantsAndOrganization('token', 'cloud')).rejects.toThrow('Unauthorized');
    });

    it('should throw on other HTTP errors', async () => {
      vi.mocked(parseJWT).mockReturnValue({
        prtId: 'prt-1',
        sub: 'u', clientId: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, authTime: 1,
      });
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
      await expect(getTenantsAndOrganization('token', 'cloud')).rejects.toThrow('Failed to fetch tenants');
    });
  });

  describe('selectTenantInteractive', () => {
    it('should throw when no organization found', async () => {
      await expect(selectTenantInteractive({ tenants: [], organization: null as any })).rejects.toThrow('No organization');
    });

    it('should throw when no tenants found', async () => {
      await expect(selectTenantInteractive({
        tenants: [],
        organization: { id: 'o', name: 'O' },
      })).rejects.toThrow('No tenants');
    });

    it('should auto-select single tenant', async () => {
      const result = await selectTenantInteractive({
        tenants: [{ id: 't1', name: 'Tenant1', displayName: 'Tenant One' }],
        organization: { id: 'o1', name: 'Org1', displayName: 'Org One' },
      });
      expect(result.tenantId).toBe('t1');
      expect(result.tenantName).toBe('Tenant1');
      expect(result.organizationId).toBe('o1');
    });

    it('should use name when displayName is missing', async () => {
      const result = await selectTenantInteractive({
        tenants: [{ id: 't1', name: 'Tenant1' }],
        organization: { id: 'o1', name: 'Org1' },
      });
      expect(result.tenantDisplayName).toBe('Tenant1');
      expect(result.organizationDisplayName).toBe('Org1');
    });
  });
});
