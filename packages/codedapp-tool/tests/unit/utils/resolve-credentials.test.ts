import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@uipath/auth', () => ({
  getLoginStatusAsync: vi.fn(),
}));

import { loadAuthCredentials } from '../../../src/utils/resolve-credentials.js';
import { getLoginStatusAsync } from '@uipath/auth';

describe('loadAuthCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should populate process.env when logged in', async () => {
    vi.mocked(getLoginStatusAsync).mockResolvedValue({
      loginStatus: 'Logged in',
      accessToken: 'test-token',
      baseUrl: 'https://cloud.uipath.com',
      organizationId: 'org-123',
      organizationName: 'TestOrg',
      tenantId: 'tenant-456',
      tenantName: 'TestTenant',
    } as any);

    await loadAuthCredentials();

    expect(process.env.UIPATH_ACCESS_TOKEN).toBe('test-token');
    expect(process.env.UIPATH_BASE_URL).toBe('https://cloud.uipath.com');
    expect(process.env.UIPATH_URL).toBe('https://cloud.uipath.com');
    expect(process.env.UIPATH_ORG_ID).toBe('org-123');
    expect(process.env.UIPATH_ORGANIZATION_ID).toBe('org-123');
    expect(process.env.UIPATH_ORG_NAME).toBe('TestOrg');
    expect(process.env.UIPATH_TENANT_ID).toBe('tenant-456');
    expect(process.env.UIPATH_TENANT_NAME).toBe('TestTenant');
  });

  it('should not set env vars when not logged in', async () => {
    vi.mocked(getLoginStatusAsync).mockResolvedValue({
      loginStatus: 'Not logged in',
    } as any);

    await loadAuthCredentials();

    expect(process.env.UIPATH_ACCESS_TOKEN).toBeUndefined();
    expect(process.env.UIPATH_BASE_URL).toBeUndefined();
  });

  it('should not set env vars for undefined values', async () => {
    vi.mocked(getLoginStatusAsync).mockResolvedValue({
      loginStatus: 'Logged in',
      accessToken: 'token',
      // other fields are undefined
    } as any);

    await loadAuthCredentials();

    expect(process.env.UIPATH_ACCESS_TOKEN).toBe('token');
    expect(process.env.UIPATH_BASE_URL).toBeUndefined();
  });

  it('should silently continue on error', async () => {
    vi.mocked(getLoginStatusAsync).mockRejectedValue(new Error('auth service down'));

    // Should not throw
    await loadAuthCredentials();

    expect(process.env.UIPATH_ACCESS_TOKEN).toBeUndefined();
  });
});
