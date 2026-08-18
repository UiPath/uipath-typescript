import { describe, it, expect } from 'vitest';
import { normalizeConfigAliases, compactConfig } from '@/core/config/config-utils';
import type { PartialUiPathConfig } from '@/core/config/sdk-config';

describe('normalizeConfigAliases', () => {
  it('folds orgId, tenantId and accessToken onto their canonical fields', () => {
    const config: PartialUiPathConfig = {
      baseUrl: 'https://cloud.uipath.com',
      orgId: 'org-guid',
      tenantId: 'tenant-guid',
      accessToken: 'token-abc',
    };

    expect(normalizeConfigAliases(config)).toEqual({
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'org-guid',
      tenantName: 'tenant-guid',
      secret: 'token-abc',
    });
  });

  it('strips the alias keys so only one spelling reaches consumers', () => {
    const result = normalizeConfigAliases({ orgId: 'org-guid' });
    expect(result).not.toHaveProperty('orgId');
    expect(result).not.toHaveProperty('tenantId');
    expect(result).not.toHaveProperty('accessToken');
  });

  it('lets the canonical field win when both spellings are supplied', () => {
    const result = normalizeConfigAliases({
      orgName: 'canonical-org',
      orgId: 'alias-org',
      tenantName: 'canonical-tenant',
      tenantId: 'alias-tenant',
      secret: 'canonical-secret',
      accessToken: 'alias-token',
    });

    expect(result.orgName).toBe('canonical-org');
    expect(result.tenantName).toBe('canonical-tenant');
    expect(result.secret).toBe('canonical-secret');
  });

  it('leaves OAuth fields untouched', () => {
    const result = normalizeConfigAliases({
      clientId: 'client-abc',
      redirectUri: 'http://localhost:5173',
      scope: 'OR.Assets',
    });

    expect(result.clientId).toBe('client-abc');
    expect(result.redirectUri).toBe('http://localhost:5173');
    expect(result.scope).toBe('OR.Assets');
  });
});

describe('compactConfig', () => {
  it('drops keys whose value is undefined', () => {
    const result = compactConfig({ baseUrl: 'https://cloud.uipath.com', orgName: undefined });
    expect(result).toEqual({ baseUrl: 'https://cloud.uipath.com' });
    expect(result).not.toHaveProperty('orgName');
  });

  it('keeps a sparse layer from blanking out the layer beneath it on merge', () => {
    const lower = { baseUrl: 'https://cloud.uipath.com', orgName: 'from-env' };
    const upper = compactConfig({ orgName: undefined, tenantName: 'from-ctor' });

    expect({ ...lower, ...upper }).toEqual({
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'from-env',
      tenantName: 'from-ctor',
    });
  });
});
