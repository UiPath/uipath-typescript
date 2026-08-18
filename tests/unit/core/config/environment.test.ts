import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock platform before importing environment — the loader is a no-op in browsers.
vi.mock('@/utils/platform', () => ({ isBrowser: false }));

import { loadFromEnvironment, readEnv } from '@/core/config/environment';

const CONTRACT_VARS = [
  'UIPATH_URL',
  'UIPATH_BASE_URL',
  'UIPATH_ORGANIZATION_ID',
  'UIPATH_ORG_ID',
  'UIPATH_ORGANIZATION_NAME',
  'UIPATH_ORG_NAME',
  'UIPATH_TENANT_ID',
  'UIPATH_TENANT_NAME',
  'UIPATH_ACCESS_TOKEN',
  'UIPATH_SECRET',
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of CONTRACT_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

describe('readEnv', () => {
  it('returns the value when the variable is set', () => {
    process.env.UIPATH_URL = 'https://cloud.uipath.com';
    expect(readEnv('UIPATH_URL')).toBe('https://cloud.uipath.com');
  });

  it('returns undefined for an unset variable', () => {
    expect(readEnv('UIPATH_URL')).toBeUndefined();
  });

  it('treats an empty value as absent', () => {
    process.env.UIPATH_URL = '';
    expect(readEnv('UIPATH_URL')).toBeUndefined();
  });

  it('falls back to Deno.env when process does not provide the value', () => {
    vi.stubGlobal('Deno', { env: { get: (name: string) => (name === 'UIPATH_URL' ? 'https://deno.uipath.com' : undefined) } });
    expect(readEnv('UIPATH_URL')).toBe('https://deno.uipath.com');
  });

  it('returns undefined when Deno throws on a missing env permission', () => {
    vi.stubGlobal('Deno', { env: { get: () => { throw new Error('permission denied'); } } });
    expect(readEnv('UIPATH_URL')).toBeUndefined();
  });
});

describe('loadFromEnvironment', () => {
  it('returns null when no contract variable is set', () => {
    expect(loadFromEnvironment()).toBeNull();
  });

  it('reads the CLI spelling of the contract', () => {
    process.env.UIPATH_URL = 'https://alpha.uipath.com';
    process.env.UIPATH_ORGANIZATION_NAME = 'my-org';
    process.env.UIPATH_TENANT_NAME = 'my-tenant';
    process.env.UIPATH_ACCESS_TOKEN = 'token-abc';

    expect(loadFromEnvironment()).toEqual({
      baseUrl: 'https://alpha.uipath.com',
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'token-abc',
    });
  });

  it('reads the documented id-based spelling of the contract', () => {
    process.env.UIPATH_BASE_URL = 'https://cloud.uipath.com';
    process.env.UIPATH_ORG_ID = 'org-guid';
    process.env.UIPATH_TENANT_ID = 'tenant-guid';
    process.env.UIPATH_ACCESS_TOKEN = 'token-abc';

    expect(loadFromEnvironment()).toEqual({
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'org-guid',
      tenantName: 'tenant-guid',
      secret: 'token-abc',
    });
  });

  it('prefers UIPATH_URL over UIPATH_BASE_URL', () => {
    process.env.UIPATH_URL = 'https://first.uipath.com';
    process.env.UIPATH_BASE_URL = 'https://second.uipath.com';
    expect(loadFromEnvironment()?.baseUrl).toBe('https://first.uipath.com');
  });

  it('prefers an organization id over an organization name', () => {
    process.env.UIPATH_ORGANIZATION_ID = 'org-guid';
    process.env.UIPATH_ORGANIZATION_NAME = 'org-name';
    expect(loadFromEnvironment()?.orgName).toBe('org-guid');
  });

  it('accepts UIPATH_SECRET as an alias for UIPATH_ACCESS_TOKEN', () => {
    process.env.UIPATH_SECRET = 'pat-token';
    expect(loadFromEnvironment()?.secret).toBe('pat-token');
  });

  it('returns a partial config when only some variables are set', () => {
    process.env.UIPATH_URL = 'https://alpha.uipath.com';
    const config = loadFromEnvironment();
    expect(config?.baseUrl).toBe('https://alpha.uipath.com');
    expect(config?.orgName).toBeUndefined();
  });
});
